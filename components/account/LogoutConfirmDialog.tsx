"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";

/**
 * "Sign out of OptiCore?" — asked before every logout, so a stray click on Logout (it sits at the
 * bottom of the sidebar, next to other links) does not end the session or lose unsaved work.
 */
export function LogoutConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  /** Signs out; the dialog shows "Signing out…" until it settles. */
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus Cancel once the dialog is up. Done a frame later because the header menu that opened it
  // hands focus back to its own button as it closes, which would otherwise win over `autoFocus`.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => cancelRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } catch {
      setBusy(false);
    }
  }

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
        aria-labelledby="logout-confirm-title"
        aria-describedby="logout-confirm-body"
        className="oc-toast-enter w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#a10402] to-[#5a0201] text-white shadow-md">
          <LogOut className="h-5 w-5" aria-hidden />
        </div>
        <h2 id="logout-confirm-title" className="mt-4 text-lg font-bold text-[#780301]">
          Sign out of OptiCore?
        </h2>
        <p id="logout-confirm-body" className="mt-1.5 text-[13px] leading-relaxed text-black/60">
          You will need to sign in again to continue. Any changes you have not saved will be lost.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-black/15 bg-white px-5 py-2.5 text-sm font-semibold text-black/75 hover:bg-black/[0.03] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirm()}
            className="rounded-lg bg-[#780301] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5a0201] disabled:opacity-70"
          >
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </div>
  );
}
