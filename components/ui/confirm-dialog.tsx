"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

/**
 * In-app confirmation (instead of the browser's `window.confirm`): title, explanation, Cancel and a
 * confirm button that shows a spinner while `onConfirm` runs. Esc / clicking outside cancels (not while
 * busy); Cancel has focus first, so Enter never confirms by accident.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busyLabel = "Working…",
  cancelLabel = "Cancel",
  icon,
  tone = "danger",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  cancelLabel?: string;
  icon?: ReactNode;
  /** danger = OptiCore red confirm button; warning = amber. */
  tone?: "danger" | "warning";
  onCancel: () => void;
  /** The dialog stays open (busy) until this settles; close it from the caller when done. */
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    if (!open) {
      setBusy(false);
      return;
    }
    const id = window.setTimeout(() => cancelRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  const confirmClass =
    tone === "warning"
      ? "bg-amber-500 hover:bg-amber-600 text-white"
      : "bg-gradient-to-br from-[#a10402] to-[#5a0201] hover:from-[#8a0302] hover:to-[#4a0101] text-white";

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="oc-toast-enter w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]"
      >
        {icon ? (
          <div
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md ${
              tone === "warning" ? "bg-amber-500" : "bg-gradient-to-br from-[#a10402] to-[#5a0201]"
            }`}
          >
            {icon}
          </div>
        ) : null}
        <h2 id={titleId} className="mt-4 text-lg font-bold text-[#780301]">
          {title}
        </h2>
        <div id={bodyId} className="mt-1.5 text-[13px] leading-relaxed text-black/65">
          {children}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-black/15 bg-white px-5 py-2.5 text-sm font-semibold text-black/75 hover:bg-black/[0.03] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void confirm()}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-70 ${confirmClass}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
