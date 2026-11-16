"use client";

import * as React from "react";
import { FileUp, Link2, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, apiUpload } from "@/lib/client/api";
import { HEADER_MIME_TYPES, MAX_UPLOAD_BYTES, MEDIA_ID_USABLE_DAYS, type MediaHeaderType } from "@/lib/server/whatsapp/media-rules";
import { formatDateTime } from "@/lib/utils";
import type { TemplateHeaderMedia, WhatsAppTemplate } from "@/types/template";

const usableUntil = (uploadedAt: string) => new Date(new Date(uploadedAt).getTime() + MEDIA_ID_USABLE_DAYS * 86_400_000).toISOString();

/** Short status line for a template's header media (shown in the templates table). */
export function headerMediaStatus(media: TemplateHeaderMedia | undefined, now = Date.now()): { text: string; tone: "ok" | "warning" | "danger" } {
  if (!media) return { text: "Header media required before sending", tone: "warning" };
  if (media.source === "link") {
    let host = media.link;
    try { host = new URL(media.link).hostname; } catch { /* keep raw */ }
    return { text: `Link · ${host}`, tone: "ok" };
  }
  const until = usableUntil(media.uploadedAt);
  if (new Date(until).getTime() < now) return { text: `Uploaded file expired ${formatDateTime(until)} — upload again`, tone: "danger" };
  return { text: `${media.filename ?? "Uploaded file"} · usable until ${formatDateTime(until)}`, tone: "ok" };
}

export function HeaderMediaDialog({ workspaceId, template, onClose, onSaved }: {
  workspaceId: string;
  template: WhatsAppTemplate;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const headerType = template.header!.type as MediaHeaderType;
  const [mode, setMode] = React.useState<"upload" | "link">(template.headerMedia?.source === "link" ? "link" : "upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [link, setLink] = React.useState(template.headerMedia?.source === "link" ? template.headerMedia.link : "");
  const [filename, setFilename] = React.useState(template.headerMedia?.filename ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const url = `/api/workspaces/${encodeURIComponent(workspaceId)}/templates/${encodeURIComponent(template.id)}/header-media`;
  const accept = HEADER_MIME_TYPES[headerType].join(",");
  const fileProblem = file && (file.size > MAX_UPLOAD_BYTES ? "This file is larger than 4 MB. Use a public HTTPS link instead." : !HEADER_MIME_TYPES[headerType].includes(file.type) ? `Choose a ${headerType} file (${HEADER_MIME_TYPES[headerType].map((m) => m.split("/")[1]).join(", ")}).` : "");
  const linkProblem = mode === "link" && link && !/^https:\/\/\S+$/.test(link) ? "The link must be a public https:// URL." : "";
  const canSave = !busy && (mode === "upload" ? Boolean(file) && !fileProblem : Boolean(link) && !linkProblem);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await onSaved(message);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => {
      e.preventDefault();
      if (!canSave) return;
      void run(
        () => (mode === "upload" ? apiUpload(url, file!, "PUT") : api(url, { method: "PUT", body: { link, ...(filename.trim() ? { filename: filename.trim() } : {}) } })),
        `Header media saved for ${template.name}`,
      );
    }}>
      <DialogHeader title={`Header media · ${template.name}`} description={`This template has ${headerType === "image" ? "an" : "a"} ${headerType} header. Campaigns, automations and tests send this ${headerType} with it.`} onClose={onClose} />
      <DialogBody className="flex flex-col gap-4">
        <div className="flex gap-2" role="tablist" aria-label="Media source">
          <Button type="button" role="tab" aria-selected={mode === "upload"} variant={mode === "upload" ? "default" : "outline"} size="sm" onClick={() => setMode("upload")}><FileUp aria-hidden="true" /> Upload file</Button>
          <Button type="button" role="tab" aria-selected={mode === "link"} variant={mode === "link" ? "default" : "outline"} size="sm" onClick={() => setMode("link")}><Link2 aria-hidden="true" /> Use a link</Button>
        </div>
        {mode === "upload" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hm-file">File</Label>
            <Input id="hm-file" type="file" accept={accept} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">Up to 4 MB. The file goes straight to Meta, which keeps it for 30 days, so you’ll need to upload it again before then. For files you’ll reuse for longer, or larger ones, use a link.</p>
            {fileProblem && <p className="text-xs text-destructive">{fileProblem}</p>}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hm-link">Public HTTPS link</Label>
              <Input id="hm-link" type="url" placeholder="https://example.com/banner.jpg" value={link} onChange={(e) => setLink(e.target.value.trim())} />
              <p className="text-xs text-muted-foreground">Meta downloads the file from this link each time it sends, so it must stay publicly reachable (no sign-in pages).</p>
              {linkProblem && <p className="text-xs text-destructive">{linkProblem}</p>}
            </div>
            {headerType === "document" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hm-name">File name shown to customers</Label>
                <Input id="hm-name" placeholder="Brochure.pdf" maxLength={240} value={filename} onChange={(e) => setFilename(e.target.value)} />
              </div>
            )}
          </>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogBody>
      <DialogFooter>
        {template.headerMedia && (
          <Button type="button" variant="ghost" size="lg" className="mr-auto text-destructive" disabled={busy} onClick={() => void run(() => api(url, { method: "DELETE" }), `Header media removed from ${template.name}`)}>
            <Trash2 aria-hidden="true" /> Remove
          </Button>
        )}
        <Button type="button" variant="outline" size="lg" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="lg" disabled={!canSave}>{busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}{busy ? "Saving…" : "Save"}</Button>
      </DialogFooter>
    </form>
  );
}
