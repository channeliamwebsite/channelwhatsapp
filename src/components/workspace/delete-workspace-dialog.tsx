"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Workspace } from "@/types/workspace";

/** Requires typing the workspace name; the server re-checks it before deleting. */
export function DeleteWorkspaceDialog({ workspace, onClose, onDelete }: { workspace: Workspace | null; onClose: () => void; onDelete: (w: Workspace, confirmName: string) => Promise<boolean> }) {
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog open={workspace !== null} onOpenChange={(o) => { if (!o) { setTyped(""); onClose(); } }}>
      {workspace && (
        <>
          <DialogHeader title={`Delete ${workspace.name}?`} onClose={onClose} />
          <DialogBody className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">This permanently deletes the workspace and <strong className="text-foreground">all of its contacts, groups, tags, segments, campaigns, templates, funnel history and analytics</strong>. It cannot be undone.</p>
            <Label htmlFor="del-confirm">Type <span className="font-semibold">{workspace.name}</span> to confirm</Label>
            <Input id="del-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="lg" onClick={onClose}>Cancel</Button>
            <Button variant="destructive" size="lg" disabled={typed !== workspace.name || busy} onClick={async () => { setBusy(true); if (await onDelete(workspace, typed)) { setTyped(""); onClose(); } setBusy(false); }}>
              Delete workspace
            </Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
