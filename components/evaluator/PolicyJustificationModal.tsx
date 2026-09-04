"use client";

/**
 * Shown when hours or preparations exceed policy. Justification is recorded and DOI is notified.
 * The plotted schedule still saves; there is no approval step.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  JUSTIFICATION_MIN_LENGTH,
  JUSTIFICATION_MODAL_TITLE,
  JUSTIFICATION_PLACEHOLDER,
  JUSTIFICATION_PROMPT,
  JUSTIFICATION_TOO_SHORT,
} from "@/lib/scheduling/justification-copy";

export type PolicyJustificationModalProps = {
  open: boolean;
  title?: string;
  promptText?: string;
  /** Overrides the primary button label (e.g. assign gate vs save-with-justification). */
  confirmButtonLabel?: string;
  value: string;
  minLength?: number;
  saving?: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
};

export function PolicyJustificationModal({
  open,
  title = JUSTIFICATION_MODAL_TITLE,
  promptText = JUSTIFICATION_PROMPT,
  confirmButtonLabel,
  value,
  minLength = JUSTIFICATION_MIN_LENGTH,
  saving = false,
  onChange,
  onCancel,
  onSave,
}: PolicyJustificationModalProps) {
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  /** Only reset validation + focus when the dialog opens, not on every parent re-render while `open` stays true. */
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      setTouched(false);
      return;
    }
    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      setTouched(false);
      const id = window.setTimeout(() => textareaRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const trimmed = value.trim();
  const invalid = useMemo(() => trimmed.length < minLength, [trimmed.length, minLength]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4 border border-amber-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-justif-title"
      >
        <h2 id="policy-justif-title" className="text-lg font-semibold text-amber-950">
          {title}
        </h2>
        <p className="text-sm text-black/75 leading-relaxed">{promptText}</p>

        <label className="block text-[12px] font-semibold text-black/70">
          Justification / reason
          <textarea
            ref={textareaRef}
            className="mt-1 w-full min-h-[120px] rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={JUSTIFICATION_PLACEHOLDER}
          />
        </label>

        {touched && invalid ? (
          <p className="text-xs text-red-800">
            {JUSTIFICATION_TOO_SHORT}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white"
            disabled={saving || invalid}
            onClick={() => void onSave()}
          >
            {saving ? "Saving…" : confirmButtonLabel ?? "Record for DOI"}
          </Button>
        </div>
      </div>
    </div>
  );
}

