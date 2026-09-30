"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ApiClientError,
  cascadeDeleteApi,
  type CascadeEntity,
  type CascadeImpact,
} from "@/lib/api/client";

/**
 * One delete dialog for every record that other records point at.
 *
 * Deleting used to stop at "schedule entries still reference it. Clear schedule data first." — true,
 * but it left the person to go and find those entries with no idea how many there were. This asks
 * the server what would be destroyed, shows it, and only then offers to do it.
 *
 * Two safeguards, both deliberate:
 *
 *   - Nothing is counted as harmless. Rows that merely lose a reference are listed separately from
 *     rows that are destroyed, because "12 accounts left without a college" and "12 accounts
 *     deleted" are very different sentences.
 *   - When something would be destroyed, the record's name must be typed to confirm. A delete that
 *     takes 80 subjects with it should not be one mis-aimed click.
 */
export function DeleteWithImpactDialog({
  entity,
  id,
  name,
  open,
  onClose,
  onDeleted,
  /** Shown while the impact is unknown, e.g. "Delete faculty". */
  title,
}: {
  entity: CascadeEntity;
  id: string;
  name: string;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  title?: string;
}) {
  const [impact, setImpact] = useState<CascadeImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setImpact(null);
    try {
      const { impact: next } = await cascadeDeleteApi.impact(entity, id);
      setImpact(next);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not check what this would affect.");
    } finally {
      setLoading(false);
    }
  }, [entity, id]);

  useEffect(() => {
    if (!open) return;
    setTyped("");
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, deleting, onClose]);

  if (!open) return null;

  const label = name || impact?.name || "this record";
  const destroys = impact?.destroys ?? [];
  const detaches = impact?.detaches ?? [];
  const destroysCount = destroys.reduce((n, r) => n + r.count, 0);
  // Typing the name is asked for only when rows would actually be destroyed.
  const needsTyping = destroysCount > 0;
  const confirmed = !needsTyping || typed.trim() === label.trim();

  async function onConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await cascadeDeleteApi.cascade(entity, id);
      onDeleted();
      onClose();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-start gap-3 border-b border-black/10 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#780301]" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-black/85">
              {title ?? "Delete"} “{label}”?
            </h2>
            <p className="mt-0.5 text-[12px] text-black/55">This cannot be undone.</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="rounded p-1 text-black/40 hover:bg-black/[0.05] hover:text-black/70"
            disabled={deleting}
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-auto px-5 py-4 space-y-4">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-black/55">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Checking what depends on this…
            </p>
          ) : null}

          {!loading && impact?.clean ? (
            <p className="text-sm text-black/70">Nothing else refers to this. It will just be removed.</p>
          ) : null}

          {destroys.length > 0 ? (
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wide text-[#780301]">
                Will also be deleted
              </div>
              <ul className="mt-1.5 space-y-1">
                {destroys.map((r) => (
                  <li key={`${r.table}.${r.column}`} className="flex items-baseline gap-2 text-sm">
                    <span className="min-w-[3ch] text-right font-semibold tabular-nums text-black/85">
                      {r.count}
                    </span>
                    <span className="text-black/70">{r.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {detaches.length > 0 ? (
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wide text-black/50">
                Kept, but unlinked
              </div>
              <ul className="mt-1.5 space-y-1">
                {detaches.map((r) => (
                  <li key={`${r.table}.${r.column}`} className="flex items-baseline gap-2 text-sm">
                    <span className="min-w-[3ch] text-right font-semibold tabular-nums text-black/70">
                      {r.count}
                    </span>
                    <span className="text-black/55">{r.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] leading-snug text-black/45">
                These records stay. They lose only their link to {label}.
              </p>
            </div>
          ) : null}

          {needsTyping ? (
            <div className="space-y-1 rounded-lg border border-[#780301]/25 bg-[#780301]/[0.04] p-3">
              <label className="block text-[12px] font-semibold text-black/75" htmlFor="confirm-delete-name">
                Type <span className="font-mono text-[#780301]">{label}</span> to confirm
              </label>
              <Input
                id="confirm-delete-name"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={deleting}
                autoComplete="off"
                placeholder={label}
              />
            </div>
          ) : null}

          {error ? <p className="text-[12px] text-[#780301]">{error}</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-black/10 px-5 py-3">
          <Button type="button" variant="outline" disabled={deleting} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#780301] text-white hover:bg-[#5a0201]"
            disabled={loading || deleting || !confirmed}
            onClick={() => void onConfirm()}
          >
            {deleting
              ? "Deleting…"
              : destroysCount > 0
                ? `Delete this and ${destroysCount} related record${destroysCount === 1 ? "" : "s"}`
                : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
