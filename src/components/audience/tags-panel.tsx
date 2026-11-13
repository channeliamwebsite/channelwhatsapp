"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useHub } from "@/lib/store/hub-store";
import { formatNumber } from "@/lib/utils";
import type { Tag } from "@/types/audience";

/** Create, rename and delete tags. Renames and deletes are applied to contacts. */
export function TagsPanel() {
  const { data, update } = useHub();
  const [draft, setDraft] = React.useState("");
  const [editing, setEditing] = React.useState<{ tag: Tag; name: string } | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmOptions | null>(null);
  const exists = (name: string, except?: string) => data.tags.some((t) => t.name.toLowerCase() === name.trim().toLowerCase() && t.id !== except);
  const usage = (name: string) => data.contacts.filter((c) => c.tags.includes(name)).length;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.trim();
    if (!name || exists(name)) return;
    if (await update((d) => ({ ...d, tags: [...d.tags, { id: `tag_${crypto.randomUUID().slice(0, 8)}`, name, createdAt: new Date().toISOString() }] }))) setDraft("");
  }

  async function rename() {
    if (!editing) return;
    const { tag, name } = editing;
    const next = name.trim();
    if (!next || exists(next, tag.id)) return;
    await update((d) => ({
      ...d,
      tags: d.tags.map((t) => (t.id === tag.id ? { ...t, name: next } : t)),
      contacts: d.contacts.map((c) => (c.tags.includes(tag.name) ? { ...c, tags: c.tags.map((x) => (x === tag.name ? next : x)) } : c)),
    }));
    setEditing(null);
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <form onSubmit={create} className="flex gap-2 border-b border-border p-4">
        <Input aria-label="New tag name" placeholder="New tag name" value={draft} onChange={(e) => setDraft(e.target.value)} className="max-w-xs" />
        <Button type="submit" size="lg" disabled={!draft.trim() || exists(draft)}><Plus aria-hidden="true" /> Create tag</Button>
        {draft && exists(draft) && <p className="self-center text-xs text-destructive">Tag already exists.</p>}
      </form>
      {data.tags.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-muted-foreground">No tags created yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {[...data.tags].sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              {editing?.tag.id === t.id ? (
                <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); rename(); }}>
                  <Input aria-label="Tag name" autoFocus value={editing.name} onChange={(e) => setEditing({ tag: t, name: e.target.value })} className="max-w-xs" />
                  <Button type="submit" size="sm" disabled={!editing.name.trim() || exists(editing.name, t.id)}>Save</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <span className="flex-1 font-medium">{t.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{formatNumber(usage(t.name))} contacts</span>
                  <Button variant="ghost" size="icon-lg" aria-label={`Rename ${t.name}`} onClick={() => setEditing({ tag: t, name: t.name })}><Pencil aria-hidden="true" /></Button>
                  <Button variant="ghost" size="icon-lg" aria-label={`Delete ${t.name}`} onClick={() => setConfirm({
                    title: `Delete tag “${t.name}”?`,
                    description: `It will be removed from ${formatNumber(usage(t.name))} contacts. The contacts themselves are kept.`,
                    confirmLabel: "Delete tag",
                    destructive: true,
                    onConfirm: async () => { await update((d) => ({ ...d, tags: d.tags.filter((x) => x.id !== t.id), contacts: d.contacts.map((c) => (c.tags.includes(t.name) ? { ...c, tags: c.tags.filter((x) => x !== t.name) } : c)) })); },
                  })}><Trash2 aria-hidden="true" /></Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </Card>
  );
}
