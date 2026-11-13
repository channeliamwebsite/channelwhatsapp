"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Check, CheckCheck, Clock, FileText, Film, Image as ImageIcon, LayoutTemplate, Loader2, MessagesSquare, Mic, Search, Send, Smartphone } from "lucide-react";

import { OptInBadge } from "@/components/contacts/opt-in-badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client/api";
import { formatPhone } from "@/lib/contacts/phone";
import { useHub } from "@/lib/store/hub-store";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationMessage, MessageType } from "@/types/conversation";

const time = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const TYPE_ICON: Record<MessageType, typeof FileText | null> = { text: null, template: LayoutTemplate, image: ImageIcon, document: FileText, audio: Mic, video: Film };

function StatusIcon({ status }: { status: ConversationMessage["status"] }) {
  if (status === "read") return <CheckCheck className="size-3.5 text-info" aria-label="Read" />;
  if (status === "delivered") return <CheckCheck className="size-3.5" aria-label="Delivered" />;
  if (status === "sent") return <Check className="size-3.5" aria-label="Sent" />;
  if (status === "queued") return <Clock className="size-3.5" aria-label="Queued" />;
  if (status === "failed") return <AlertTriangle className="size-3.5 text-destructive" aria-label="Failed" />;
  return null;
}

export function ConversationsInbox() {
  const { workspace } = useHub();
  return <Inbox key={workspace.id} />;
}

function Inbox() {
  const { workspace, data } = useHub();
  const { toast, toastElement } = useToast();
  const base = `/api/workspaces/${encodeURIComponent(workspace.id)}/conversations`;
  const [conversations, setConversations] = React.useState<Conversation[] | null>(null);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ConversationMessage[] | null>(null);
  const [reply, setReply] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [now] = React.useState(() => Date.now());
  const contacts = React.useMemo(() => new Map(data.contacts.map((c) => [c.id, c])), [data.contacts]);
  const connected = workspace.whatsappAccount.status === "connected";

  React.useEffect(() => {
    let cancelled = false;
    api<{ conversations: Conversation[]; nextCursor: string | null }>(base)
      .then((r) => { if (!cancelled) { setConversations(r.conversations); setCursor(r.nextCursor); } })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [base]);

  async function open(c: Conversation) {
    setActiveId(c.id);
    setMessages(null);
    try {
      const r = await api<{ messages: ConversationMessage[] }>(`${base}/${encodeURIComponent(c.id)}/messages`);
      setMessages(r.messages);
      if (c.unreadCount > 0) {
        await api(`${base}/${encodeURIComponent(c.id)}`, { method: "PATCH", body: { markRead: true } });
        setConversations((list) => list?.map((x) => (x.id === c.id ? { ...x, unreadCount: 0 } : x)) ?? null);
      }
    } catch (e) {
      toast((e as Error).message);
    }
  }

  async function setConversationStatus(c: Conversation, next: Conversation["status"]) {
    try {
      await api(`${base}/${encodeURIComponent(c.id)}`, { method: "PATCH", body: { status: next } });
      setConversations((list) => list?.map((x) => (x.id === c.id ? { ...x, status: next } : x)) ?? null);
    } catch (e) {
      toast((e as Error).message);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !reply.trim()) return;
    setSending(true);
    try {
      await api(`${base}/${encodeURIComponent(active.id)}/messages`, { method: "POST", body: { text: reply } });
      setReply("");
      await open(active);
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const filtered = (conversations ?? []).filter((c) => {
    const contact = contacts.get(c.contactId);
    const q = query.trim().toLowerCase();
    if (q && !`${contact?.fullName ?? ""} ${contact?.phone ?? ""} ${c.lastMessagePreview}`.toLowerCase().includes(q)) return false;
    if (status !== "all" && c.status !== status) return false;
    return !unreadOnly || c.unreadCount > 0;
  });
  const active = conversations?.find((c) => c.id === activeId) ?? null;
  const activeContact = active ? contacts.get(active.contactId) : undefined;
  const windowOpen = Boolean(active?.lastInboundAt && now - new Date(active.lastInboundAt).getTime() < 86_400_000);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Conversations" description={`Customer replies and chats for ${workspace.name}.`} />
      {!connected && (
        <Card className="flex-row items-center gap-3 p-4 text-sm">
          <Smartphone className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="flex-1 text-muted-foreground">No WhatsApp account connected. Conversations sync automatically once the WhatsApp Business account is connected and its webhook is verified.</p>
          <Link href="/whatsapp-account" className={buttonVariants({ variant: "outline", size: "sm" })}>WhatsApp account</Link>
        </Card>
      )}
      <Card className="grid min-h-[560px] gap-0 overflow-hidden py-0 lg:grid-cols-[320px_1fr_260px]">
        <div className="flex min-h-0 flex-col border-b border-border lg:border-r lg:border-b-0">
          <div className="flex flex-col gap-2 border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input type="search" aria-label="Search conversations" placeholder="Search name, number or message" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2">
              <NativeSelect aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1">
                <option value="all">All statuses</option><option value="open">Open</option><option value="pending">Pending</option><option value="closed">Closed</option>
              </NativeSelect>
              <Button variant={unreadOnly ? "default" : "outline"} size="lg" onClick={() => setUnreadOnly((u) => !u)} aria-pressed={unreadOnly}>Unread</Button>
            </div>
          </div>
          <ul className="flex max-h-[480px] flex-1 flex-col overflow-y-auto">
            {conversations === null && !error && <li className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading…</li>}
            {error && <li className="p-6 text-sm text-destructive">{error}</li>}
            {conversations?.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No conversations yet.</li>}
            {cursor && (
              <li className="order-last p-3 text-center">
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    const r = await api<{ conversations: Conversation[]; nextCursor: string | null }>(`${base}?before=${encodeURIComponent(cursor)}`);
                    setConversations((list) => [...(list ?? []), ...r.conversations]);
                    setCursor(r.nextCursor);
                  } catch (e) { toast((e as Error).message); }
                }}>Load older conversations</Button>
              </li>
            )}
            {filtered.map((c) => {
              const contact = contacts.get(c.contactId);
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => open(c)} className={cn("flex w-full gap-3 border-b border-border px-3 py-3 text-left hover:bg-muted/50", c.id === activeId && "bg-accent/40")}>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn("truncate text-sm", c.unreadCount ? "font-semibold" : "font-medium")}>{contact?.fullName ?? "Unknown contact"}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{time.format(new Date(c.lastMessageAt))}</span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-muted-foreground">{c.lastDirection === "outbound" && "You: "}{c.lastMessagePreview}</span>
                        {c.unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white" aria-label={`${c.unreadCount} unread`}>{c.unreadCount}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex min-h-[420px] flex-col">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <MessagesSquare className="size-7" aria-hidden="true" /> Select a conversation
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <p className="truncate font-semibold">{activeContact?.fullName ?? "Unknown contact"}</p>
                <NativeSelect aria-label="Conversation status" value={active.status} onChange={(e) => setConversationStatus(active, e.target.value as Conversation["status"])} className="w-32">
                  <option value="open">Open</option><option value="pending">Pending</option><option value="closed">Closed</option>
                </NativeSelect>
              </div>
              <ol className="flex max-h-[420px] flex-1 flex-col gap-2 overflow-y-auto bg-muted/30 p-4">
                {messages === null && <li className="text-sm text-muted-foreground">Loading messages…</li>}
                {messages?.map((m) => {
                  const Icon = TYPE_ICON[m.type];
                  return (
                    <li key={m.id} className={cn("max-w-[80%] rounded-xl px-3 py-2 text-sm shadow-xs", m.direction === "outbound" ? "self-end bg-[#e7f6ef]" : "self-start bg-card")}>
                      {Icon && <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon className="size-3.5" aria-hidden="true" />{m.type}{m.media?.filename && ` · ${m.media.filename}`}</span>}
                      {(m.text || m.media?.caption) && <p className="whitespace-pre-wrap break-words">{m.text ?? m.media?.caption}</p>}
                      <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                        {time.format(new Date(m.timestamp))}{m.direction === "outbound" && <StatusIcon status={m.status} />}
                      </span>
                      {m.error && <span className="block text-[11px] text-destructive">{m.error}</span>}
                    </li>
                  );
                })}
              </ol>
              <form onSubmit={send} className="flex flex-col gap-2 border-t border-border p-3">
                {!connected ? <p className="text-xs text-muted-foreground">Replies are unavailable until WhatsApp is connected.</p>
                  : !windowOpen && <p className="text-xs text-muted-foreground">The 24-hour reply window is closed — only approved templates can be sent.</p>}
                <div className="flex gap-2">
                  <Input aria-label="Reply" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type a reply…" disabled={!connected || !windowOpen} />
                  <Button type="submit" size="lg" disabled={!connected || !windowOpen || !reply.trim() || sending}><Send aria-hidden="true" /> Send</Button>
                </div>
              </form>
            </>
          )}
        </div>

        <aside className="hidden border-l border-border p-4 text-sm lg:block" aria-label="Contact information">
          {activeContact ? (
            <div className="flex flex-col gap-3">
              <p className="font-semibold">{activeContact.fullName}</p>
              <p className="tabular-nums text-muted-foreground">{formatPhone(activeContact.phone)}</p>
              {activeContact.email && <p className="break-all text-muted-foreground">{activeContact.email}</p>}
              <OptInBadge status={activeContact.optInStatus} />
              <div className="flex flex-wrap gap-1">{activeContact.audienceGroups.map((g) => <Badge key={g} variant="neutral">{g}</Badge>)}</div>
              <div className="flex flex-wrap gap-1">{activeContact.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
            </div>
          ) : <p className="text-muted-foreground">Contact details appear here.</p>}
        </aside>
      </Card>
      {toastElement}
    </div>
  );
}
