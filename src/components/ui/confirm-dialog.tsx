"use client";

import { Button } from "@/components/ui/button";

import { Dialog, DialogBody, DialogFooter, DialogHeader } from "./dialog";

export type ConfirmOptions = {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({ options, onClose }: { options: ConfirmOptions | null; onClose: () => void }) {
  return (
    <Dialog open={options !== null} onOpenChange={(o) => !o && onClose()} className="max-w-md">
      {options && (
        <>
          <DialogHeader title={options.title} onClose={onClose} />
          <DialogBody className="text-sm text-muted-foreground">{options.description}</DialogBody>
          <DialogFooter>
            <Button variant="outline" size="lg" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant={options.destructive ? "destructive" : "default"}
              onClick={() => {
                void options.onConfirm();
                onClose();
              }}
            >
              {options.confirmLabel}
            </Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
