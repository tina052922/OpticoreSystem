"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AccessScope } from "@/types/db";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Shown in the modal header (e.g. course + slot). */
  contextLabel: string;
  /** Pre-selected scopes (typically `gec_vacant_slots`). */
  defaultScopes?: AccessScope[];
  onSuccess?: () => void;
};

/**
 * Modal for GEC Chairman to request College Admin approval before editing vacant GEC slots.
 * Posts to the existing `/api/access-requests` endpoint.
 */
export function GecAccessRequestModal({
  open,
  onClose,
  contextLabel,
  defaultScopes = ["gec_vacant_slots"],
  onSuccess,
}: Props) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/access-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scopes: defaultScopes,
          note:
            note.trim() ||
            `Requesting approval to assign vacant GEC slot: ${contextLabel}`,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Request failed");
      onSuccess?.();
      onClose();
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={() => !loading && onClose()}
      />
      <div className="relative w-full max-w-md rounded-xl border border-black/10 bg-white shadow-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Request approval from College Admin</h2>
          <p className="text-sm text-black/65 mt-1">
            You need a temporary grant to edit <strong>vacant GEC slots</strong>. Occupied slots cannot be changed
            here.
          </p>
          <p className="text-xs text-black/50 mt-2 font-mono bg-black/[0.04] rounded-md px-2 py-1">{contextLabel}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-black/70 mb-1">Reason / context</label>
          <textarea
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm min-h-[100px]"
            placeholder="Explain why you need access (e.g. assign instructor for vacant GEC-PC)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="rounded-lg bg-[#FF990A]/10 border border-[#FF990A]/30 px-3 py-2 text-xs text-gray-800">
          <strong>Scopes:</strong> {defaultScopes.join(", ")} — College Admin will approve or reject. Approved access is
          time-limited.
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" disabled={loading} onClick={() => onClose()}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white"
            disabled={loading}
            onClick={() => void submit()}
          >
            {loading ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </div>
    </div>
  );
}
