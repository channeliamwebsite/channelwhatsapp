"use client";

import * as React from "react";
import { CheckCircle2, X } from "lucide-react";

/** Minimal single-toast hook: `const { toast, toastElement } = useToast()`. */
export function useToast() {
  const [message, setMessage] = React.useState<{ id: number; text: string } | null>(null);

  React.useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const toast = React.useCallback((text: string) => setMessage({ id: Date.now(), text }), []);

  const toastElement = (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      {message && (
        <div
          key={message.id}
          className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl bg-[#260d12] px-4 py-3 text-sm text-white shadow-xl"
        >
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss" className="ml-1 text-white/60 hover:text-white">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );

  return { toast, toastElement };
}
