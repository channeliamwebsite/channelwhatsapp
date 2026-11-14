/**
 * Automation runner — SERVER ONLY.
 *   enqueueTrigger()  ← real events (contact created, webhook read/reply/fail, clicks)
 *   processDueRuns()  ← scheduled job
 * Runs record what actually happened; sends are skipped (not faked) while the
 * WhatsApp integration is unavailable.
 */
import type { DocumentData } from "firebase-admin/firestore";

import { applyContactActions, conditionsHold, matchesTrigger, type TriggerEvent } from "@/lib/automation/engine";
import { checkConsent } from "@/lib/funnel/engine";
import { placeholderCount } from "@/lib/funnel/variables";
import type { Automation, AutomationRun } from "@/types/automation";
import type { Contact } from "@/types/contact";
import type { WhatsAppTemplate } from "@/types/template";
import type { Workspace } from "@/types/workspace";

import { getSender } from "./sender";
import { recordWaMessage } from "./whatsapp/message-map";
import { db } from "./firebase-admin";
import { commitInChunks, listOwned, wsRef } from "./repo";

const addMinutes = (iso: string, m: number) => new Date(new Date(iso).getTime() + m * 60_000).toISOString();

/** Queue a run for every enabled automation whose trigger matches. */
export async function enqueueTrigger(workspaceId: string, events: TriggerEvent[]) {
  if (!events.length) return;
  const automations = (await listOwned<Automation>(workspaceId, "automations")).filter((a) => a.enabled);
  const runs: AutomationRun[] = [];
  for (const e of events) {
    for (const a of automations.filter((x) => matchesTrigger(x, e))) {
      runs.push({ id: `${a.id}__${e.contactId}__${e.type}__${e.at}`.replace(/[^A-Za-z0-9_\-.]/g, "_"), workspaceId, automationId: a.id, contactId: e.contactId, trigger: e.type, status: "pending", triggeredAt: e.at, dueAt: addMinutes(e.at, a.delayMinutes) });
    }
  }
  const col = wsRef(workspaceId).collection("automationRuns");
  // create() makes each run idempotent per automation/contact/event.
  await Promise.all(runs.map((r) => col.doc(r.id).create(r as DocumentData).catch(() => undefined)));
}

/** Execute due runs: conditions are re-checked against the contact at execution time. */
export async function processDueRuns(workspace: Workspace, now: string, limit = 200) {
  const ws = wsRef(workspace.id);
  const due = await ws.collection("automationRuns").where("status", "==", "pending").where("dueAt", "<=", now).limit(limit).get();
  if (due.empty) return { executed: 0 };
  const automations = new Map((await listOwned<Automation>(workspace.id, "automations")).map((a) => [a.id, a]));
  const templates = new Map((await listOwned<WhatsAppTemplate>(workspace.id, "templates")).map((t) => [t.id, t]));
  const sender = getSender(workspace);
  let executed = 0;

  for (const doc of due.docs) {
    const run = doc.data() as AutomationRun;
    const automation = automations.get(run.automationId);
    const contactRef = ws.collection("contacts").doc(run.contactId);
    // Phase 1 (transaction): re-check, apply contact actions, and either finish or claim the run for sending.
    const toSend = await db().runTransaction(async (tx): Promise<{ contact: Contact; templateIds: string[]; changed: boolean } | null> => {
      const fresh = await tx.get(doc.ref);
      if ((fresh.data() as AutomationRun).status !== "pending") return null; // another worker took it
      const contact = (await tx.get(contactRef)).data() as Contact | undefined;
      const finish = (status: AutomationRun["status"], detail: string) => {
        tx.update(doc.ref, { status, detail, executedAt: now });
        return null;
      };
      if (!automation || !automation.enabled) return finish("skipped", "Automation disabled or deleted");
      if (!contact) return finish("skipped", "Contact no longer exists");
      if (!conditionsHold(automation, contact)) return finish("skipped", "Conditions not met");

      const updated = applyContactActions(contact, automation.actions);
      if (updated !== contact) tx.set(contactRef, { ...updated, updatedAt: now } as DocumentData);
      const sends = automation.actions.filter((a) => a.type === "send_template");
      if (sends.length && !sender) return finish(updated !== contact ? "succeeded" : "skipped", "Message not sent — WhatsApp sending is unavailable");
      if (sends.length && !checkConsent(updated).ok) return finish(updated !== contact ? "succeeded" : "skipped", "Message not sent — contact is not eligible");
      if (!sends.length) return finish("succeeded", updated !== contact ? "Contact updated" : "Nothing to change");
      tx.update(doc.ref, { status: "processing" });
      return { contact: updated, templateIds: sends.map((a) => (a as { templateId: string }).templateId), changed: updated !== contact };
    });

    // Phase 2 (outside the transaction, so a retried transaction can never send twice).
    if (toSend && sender) {
      const outcomes: string[] = [];
      let failed = false;
      for (const templateId of toSend.templateIds) {
        const template = templates.get(templateId);
        if (!template) { outcomes.push("template missing"); failed = true; continue; }
        if (placeholderCount([template]) > 0) { outcomes.push(`${template.name}: needs variables (not supported in automations yet)`); failed = true; continue; }
        const result = await sender.send({ to: toSend.contact.phone, template, variables: [], buttonUrls: [] });
        if (result.ok) {
          outcomes.push(`${template.name} sent`);
          await recordWaMessage({ waMessageId: result.waMessageId, workspaceId: workspace.id, kind: "automation", contactId: toSend.contact.id });
        }
        else { outcomes.push(`${template.name}: ${result.error}`); failed = true; }
      }
      await doc.ref.update({ status: failed ? "failed" : "succeeded", detail: outcomes.join("; "), executedAt: new Date().toISOString() });
    }
    executed++;
  }
  return { executed };
}

/** Scheduled automations: enqueue matching contacts once their time arrives. */
export async function enqueueScheduled(workspaceId: string, now: string) {
  const automations = (await listOwned<Automation>(workspaceId, "automations")).filter((a) => a.enabled && a.trigger.type === "scheduled" && a.trigger.runAt && a.trigger.runAt <= now);
  if (!automations.length) return;
  const contacts = await listOwned<Contact>(workspaceId, "contacts");
  for (const a of automations) {
    await enqueueTrigger(workspaceId, contacts.filter((c) => conditionsHold(a, c)).map((c) => ({ type: "scheduled" as const, contactId: c.id, at: a.trigger.runAt! })));
    await commitInChunks(db(), [(b) => b.update(wsRef(workspaceId).collection("automations").doc(a.id), { enabled: false, updatedAt: now })]);
  }
}
