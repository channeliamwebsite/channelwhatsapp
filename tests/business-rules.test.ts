import assert from "node:assert/strict";
import { test } from "node:test";

import { matchesSegment, resolveAudience } from "@/lib/audience/segments";
import { applyContactActions, conditionsHold, matchesTrigger } from "@/lib/automation/engine";
import { findDuplicateGroups, findMatches, mergeContacts } from "@/lib/contacts/duplicates";
import { isCampaignEligible } from "@/lib/contacts/eligibility";
import { countryCallingCode, formatPhone, validatePhone } from "@/lib/contacts/phone";
import { defaultFunnel } from "@/lib/funnel/defaults";
import { applyEvent, checkConsent, checkSendGuards, classifyBehaviour, planNextAction } from "@/lib/funnel/engine";
import { computeFunnelMetrics } from "@/lib/funnel/metrics";
import { validateFunnel } from "@/lib/funnel/validate";
import { placeholderCount, renderBody, resolveVariables } from "@/lib/funnel/variables";
import { createTrackedToken, verifyTrackedToken } from "@/lib/tracking/links";
import { withUtm } from "@/lib/tracking/utm";
import type { Automation } from "@/types/automation";
import { EMPTY_SEGMENT_FILTER } from "@/types/audience";
import type { Campaign } from "@/types/campaign";
import type { Contact } from "@/types/contact";
import type { MessageRecord, RecipientProgress } from "@/types/funnel";
import type { WhatsAppTemplate } from "@/types/template";

const contact = (o: Partial<Contact> = {}): Contact => ({
  id: "c1", fullName: "Anita Joseph", phone: "+919847012345", email: "anita@example.com", country: "India", city: "Kochi",
  organisation: "Acme", designation: "Founder", audienceGroups: ["Founders"], tags: ["VIP"], optInStatus: "opted_in",
  consentSource: "Website form", consentDate: "2026-11-01", createdAt: "2026-11-01T10:00:00.000Z", ...o,
});
const template = (id: string, status: WhatsAppTemplate["status"] = "approved"): WhatsAppTemplate => ({ id, name: id, category: "MARKETING", language: "en", status, body: "Hi {{1}}, from {{2}}", buttons: [] });
const campaign = (o: Partial<Campaign> = {}): Campaign => ({
  id: "cmp1", name: "Summit", description: "", status: "running", audienceGroups: ["Founders"], whatsappAccountId: "w",
  funnel: { ...defaultFunnel(), message1: { templateId: "t1" }, message2: { ...defaultFunnel().message2, clicked: { type: "send", templateId: "t2" }, read_not_clicked: { type: "send", templateId: "t2" } } },
  conversionGoal: { type: "none" }, createdAt: "2026-11-01T00:00:00.000Z", ...o,
});
const msg = (o: Partial<MessageRecord> = {}): MessageRecord => ({ step: 1, templateId: "t1", dedupeKey: "cmp1:c1:1", status: "delivered", sentAt: "2026-11-10T00:00:00.000Z", clicks: [], ...o });
const progress = (o: Partial<RecipientProgress> = {}): RecipientProgress => ({ id: "r", campaignId: "cmp1", contactId: "c1", state: "waiting", currentStep: 1, messages: [msg()], nextActionAt: "2026-11-11T00:00:00.000Z", ...o });

test("phone validation: Indian mobiles, international numbers, country codes", () => {
  assert.equal(validatePhone("98470 12345").valid, true, "national Indian number with default country");
  assert.deepEqual(validatePhone("+91 98470-12345"), { valid: true, e164: "+919847012345", country: "India" });
  assert.equal(validatePhone("0091 9847012345").valid, true);
  assert.equal(validatePhone("+91 12345 67890").valid, false, "Indian mobiles start 6-9");
  assert.equal(validatePhone("+971 50 123 4567").valid, true);
  assert.equal(validatePhone("+44 7400 123456").valid, true);
  assert.equal(validatePhone("+1234").valid, false, "too short");
  assert.equal(validatePhone("abc").valid, false);
  assert.equal(countryCallingCode("+971501234567"), "971");
  assert.equal(formatPhone("+91 98470 12345"), "+91 98470 12345");
});

test("duplicate detection works across formatting and by email", () => {
  const a = contact({ id: "a", phone: "+919847012345" });
  const b = contact({ id: "b", phone: "+91 98470-12345", email: "other@example.com" });
  const c = contact({ id: "c", phone: "+919800000001", email: "ANITA@example.com" });
  const groups = findDuplicateGroups([a, b, c]);
  assert.equal(groups.find((g) => g.matchedOn === "phone")?.contacts.length, 2);
  assert.ok(findMatches([a], { phone: "098470 12345", email: "" }).phone, "national format matches E.164");
  assert.equal(findMatches([a], { phone: "+919847012345", email: "" }, "a").phone, undefined, "ignores itself");
});

test("merging keeps an opt-out from any duplicate record", () => {
  const merged = mergeContacts(contact({ id: "a" }), [contact({ id: "b", optInStatus: "opted_out", tags: ["Lead"] })]);
  assert.equal(merged.optInStatus, "opted_out");
  assert.deepEqual(merged.tags.sort(), ["Lead", "VIP"]);
});

test("consent: opted-out, pending, invalid numbers and missing consent records are never eligible", () => {
  assert.equal(checkConsent(contact()).ok, true);
  assert.equal(checkConsent(contact({ optInStatus: "opted_out" })).ok, false);
  assert.equal(checkConsent(contact({ optInStatus: "pending" })).ok, false);
  assert.equal(checkConsent(contact({ phone: "+911234" })).ok, false);
  assert.equal(checkConsent(contact({ consentSource: "" })).ok, false, "opted in without a recorded source");
  assert.equal(isCampaignEligible(contact({ optInStatus: "opted_out" })), false);
});

test("audience resolution: groups ∪ segments, excludes ineligible and duplicate phones", () => {
  const list = [
    contact({ id: "1" }),
    contact({ id: "2", phone: "+91 98470 12345" }),
    contact({ id: "3", phone: "+919800000002", optInStatus: "opted_out" }),
    contact({ id: "4", phone: "+919800000003", audienceGroups: [], tags: ["Investor"] }),
  ];
  const seg = { id: "s", name: "Investors", createdAt: "", filter: { ...EMPTY_SEGMENT_FILTER, tags: ["Investor"] } };
  const r = resolveAudience(list, ["Founders"], [seg]);
  assert.deepEqual(r.eligible.map((c) => c.id), ["1", "4"]);
  assert.deepEqual(r.excluded.map((x) => x.reason).sort(), ["Duplicate phone number", "Opted out"]);
  assert.equal(matchesSegment(contact({ createdAt: "2026-01-01T00:00:00Z" }), { ...EMPTY_SEGMENT_FILTER, addedAfter: "2026-06-01" }), false);
  assert.equal(matchesSegment(contact(), { ...EMPTY_SEGMENT_FILTER, groups: ["Founders", "Other"], groupsMatch: "all" }), false);
});

test("funnel: behaviour classification precedence and branching", () => {
  const p = progress();
  assert.equal(classifyBehaviour(msg({ status: "read", clicks: [{ url: "u", at: "x" }] }), p), "clicked");
  assert.equal(classifyBehaviour(msg({ status: "read" }), p), "read_not_clicked");
  assert.equal(classifyBehaviour(msg({ status: "failed" }), p), "failed");
  assert.equal(classifyBehaviour(msg(), { ...p, repliedAt: "2026-11-10T05:00:00.000Z" }), "replied");
  const c = campaign();
  assert.deepEqual(planNextAction(progress({ messages: [msg({ status: "read" })] }), c, "2026-11-12T00:00:00.000Z"), { type: "send", step: 2, templateId: "t2", branch: "read_not_clicked" });
  assert.deepEqual(planNextAction(progress(), c, "2026-11-10T01:00:00.000Z"), { type: "wait" }, "waits until the delay passes");
  assert.deepEqual(planNextAction(progress({ messages: [msg({ status: "queued" })] }), c, "2026-11-12T00:00:00.000Z"), { type: "wait" }, "never evaluates an unsent message");
  assert.equal(planNextAction(progress({ messages: [msg({ status: "failed" })] }), c, "2026-11-12T00:00:00.000Z").type, "exit");
});

test("funnel: guards block opted-out contacts, unapproved templates, paused campaigns and duplicate sends", () => {
  const base = { campaign: campaign(), contact: contact(), template: template("t2"), progress: progress(), step: 2 as const };
  assert.equal(checkSendGuards(base).ok, true);
  assert.equal(checkSendGuards({ ...base, contact: contact({ optInStatus: "opted_out" }) }).ok, false);
  assert.equal(checkSendGuards({ ...base, template: template("t2", "pending") }).ok, false);
  assert.equal(checkSendGuards({ ...base, campaign: campaign({ status: "paused" }) }).ok, false);
  assert.equal(checkSendGuards({ ...base, progress: progress({ messages: [msg(), msg({ step: 2, dedupeKey: "cmp1:c1:2" })] }) }).ok, false, "step already sent");
});

test("funnel: exit conditions — reply, opt-out, conversion, stop", () => {
  const c = campaign();
  assert.equal(applyEvent(progress(), { type: "reply", at: "x" }, c).exitReason, "replied");
  assert.equal(applyEvent(progress(), { type: "reply", at: "x" }, campaign({ funnel: { ...c.funnel, exitOnReply: false } })).state, "waiting");
  assert.equal(applyEvent(progress(), { type: "opt_out", at: "x" }, c).exitReason, "opted_out");
  assert.equal(applyEvent(progress(), { type: "conversion", at: "x" }, c).exitReason, "converted");
  assert.equal(applyEvent(progress(), { type: "campaign_stopped", at: "x" }, c).exitReason, "campaign_stopped");
  const exited = applyEvent(progress(), { type: "opt_out", at: "x" }, c);
  assert.equal(applyEvent(exited, { type: "reply", at: "y" }, c).state, "exited", "never re-opens a funnel");
});

test("funnel validation requires approved templates and sane timings", () => {
  const f = campaign().funnel;
  assert.deepEqual(validateFunnel(f, [template("t1"), template("t2")]), []);
  assert.ok(validateFunnel(f, [template("t1", "pending"), template("t2")]).length > 0);
  assert.ok(validateFunnel({ ...f, wait1Hours: 0 }, [template("t1"), template("t2")]).length > 0);
  assert.ok(validateFunnel({ ...f, message2: { ...f.message2, replied: { type: "send", templateId: "t2" } } }, [template("t1"), template("t2")]).length > 0, "replied must exit when exitOnReply");
});

test("metrics ignore queued messages and compute rates from real events only", () => {
  const recipients = [
    progress({ messages: [msg({ status: "read", clicks: [{ url: "u", at: "x" }] }), msg({ step: 2, status: "delivered", dedupeKey: "k2" })], repliedAt: "2026-11-10T05:00:00.000Z" }),
    progress({ id: "r2", contactId: "c2", messages: [msg({ status: "failed" })] }),
    progress({ id: "r3", contactId: "c3", messages: [msg({ status: "queued" })] }),
  ];
  const m = computeFunnelMetrics(recipients);
  assert.equal(m.totals.sent, 3, "queued message not counted");
  assert.equal(m.totals.delivered, 2);
  assert.equal(m.totals.failed, 1);
  assert.equal(m.rates.m1ToM2, 50);
  assert.equal(computeFunnelMetrics([]).rates.delivery, 0, "no data → 0, not fabricated");
});

test("variables, previews and UTM defaults", () => {
  const vals = resolveVariables([{ type: "field", field: "firstName" }, { type: "custom", key: "ticket" }], contact({ customFields: { ticket: "A12" } }));
  assert.deepEqual(vals, ["Anita", "A12"]);
  assert.equal(renderBody("Hi {{1}}, ticket {{2}}", vals), "Hi Anita, ticket A12");
  assert.equal(placeholderCount([template("t1")]), 2);
  const url = new URL(withUtm("https://x.com/a?utm_source=keep", undefined, "Summit 2027"));
  assert.equal(url.searchParams.get("utm_source"), "keep", "existing UTM preserved");
  assert.equal(url.searchParams.get("utm_campaign"), "summit-2027");
});

test("automation rules", () => {
  const a: Automation = { id: "a", name: "n", enabled: true, trigger: { type: "link_clicked", campaignId: "cmp1" }, conditions: [{ field: "tag", operator: "is", value: "vip" }], actions: [{ type: "add_tag", tag: "Engaged" }, { type: "remove_from_group", group: "Founders" }], delayMinutes: 0, createdAt: "" };
  assert.equal(matchesTrigger(a, { type: "link_clicked", contactId: "c1", campaignId: "cmp1", at: "x" }), true);
  assert.equal(matchesTrigger(a, { type: "link_clicked", contactId: "c1", campaignId: "other", at: "x" }), false);
  assert.equal(matchesTrigger({ ...a, enabled: false }, { type: "link_clicked", contactId: "c1", campaignId: "cmp1", at: "x" }), false);
  assert.equal(conditionsHold(a, contact()), true, "case-insensitive tag match");
  const updated = applyContactActions(contact(), a.actions);
  assert.deepEqual(updated.tags, ["VIP", "Engaged"]);
  assert.deepEqual(updated.audienceGroups, []);
});

test("tracked links are tamper-proof and refuse unsafe destinations", () => {
  const data = { workspaceId: "w", campaignId: "c", contactId: "ct", step: 1 as const, url: "https://example.com/a" };
  const token = createTrackedToken(data);
  const ok = verifyTrackedToken(token);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.ok && ok.data, data);
  const [, sig] = token.split(".");
  const forged = `${Buffer.from(JSON.stringify({ v: 1, w: "w", c: "c", ct: "ct", s: 1, u: "https://evil.example", iat: Date.now() })).toString("base64url")}.${sig}`;
  assert.equal(verifyTrackedToken(forged).ok, false);
  assert.throws(() => createTrackedToken({ ...data, url: "javascript:alert(1)" }));
  assert.equal(verifyTrackedToken(createTrackedToken(data, Date.now() - 91 * 86_400_000)).ok, false, "expired");
});
