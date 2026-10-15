"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { relatedPlotRows, type PlotRow } from "@/lib/evaluator/chairman-plot-row";
import type { HourSlot } from "@/lib/scheduling/program-mode";
import { plottedDurationHours } from "@/lib/evaluator/plot-duration";
import { formatPlotTimeRange } from "@/lib/evaluator/plot-time-range";

export type RemovePlottedScheduleModalProps = {
  /** The cell whose remove button was clicked. Null closes the modal. */
  target: PlotRow | null;
  onClose: () => void;
  /** Every plotted row, so the subject's other meetings can be found. */
  rows: PlotRow[];
  slots: HourSlot[];
  sectionNameById: Map<string, string>;
  instructorDisplayById: Map<string, string>;
  roomCodeById: Map<string, string>;
  onRemove: (id: string) => void;
  onRemoveMany: (ids: string[]) => void;
};

/** "7:00 AM – 9:00 AM" for a row's slot span. */
function timeRange(row: PlotRow, slots: HourSlot[]): string {
  return formatPlotTimeRange(row.startSlotIndex, plottedDurationHours(row.durationSlots), slots);
}

/**
 * Asked when the remove button on a plotted cell is clicked.
 *
 * A subject is usually plotted as several meetings — five weekly hours might be Monday 2h,
 * Wednesday 2h and Friday 1h — so the button is ambiguous on its own: drop this meeting, or drop
 * the subject? It used to delete the single cell immediately and without asking, which left the
 * rest of the subject scattered across the week to be found by eye.
 *
 * The list is scoped to that subject, for that section and that instructor. Nothing else is shown
 * and nothing else can be touched from here.
 */
export function RemovePlottedScheduleModal({
  target,
  onClose,
  rows,
  slots,
  sectionNameById,
  instructorDisplayById,
  roomCodeById,
  onRemove,
  onRemoveMany,
}: RemovePlottedScheduleModalProps) {
  const [confirmingAll, setConfirmingAll] = useState(false);

  const group = useMemo(() => {
    if (!target) return [];
    return relatedPlotRows(rows, target).sort((a, b) => {
      if (a.day !== b.day) return String(a.day).localeCompare(String(b.day));
      return a.startSlotIndex - b.startSlotIndex;
    });
  }, [rows, target]);

  const removable = useMemo(() => group.filter((r) => !r.lockedByDoiAt), [group]);

  useEffect(() => {
    if (!target) setConfirmingAll(false);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  /** Once the last meeting is gone there is nothing left to decide about. */
  useEffect(() => {
    if (target && group.length === 0) onClose();
  }, [target, group.length, onClose]);

  if (!target || group.length === 0) return null;

  const subjectLabel = target.subjectCode || "(no subject)";
  const sectionLabel = sectionNameById.get(target.sectionId) || "(no section)";
  const instructorLabel = instructorDisplayById.get(target.instructorId) || "(no instructor)";
  const targetLocked = Boolean(target.lockedByDoiAt);

  function removeOne(id: string) {
    onRemove(id);
    // The group shrinks underneath; the effect above closes the modal on the last one.
    if (group.length <= 1) onClose();
  }

  function removeAll() {
    onRemoveMany(removable.map((r) => r.id));
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-plot-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="remove-plot-title" className="text-[16px] font-bold text-black/85">
              Remove plotted schedule
            </h2>
            <p className="mt-0.5 text-[12px] text-black/60">
              <span className="font-mono font-semibold text-[#780301]">{subjectLabel}</span>
              {" · "}
              {sectionLabel}
              {" · "}
              {instructorLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-black/45 hover:bg-black/5 hover:text-black/70"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <p className="border-b border-black/10 bg-black/[0.02] px-5 py-2.5 text-[12px] text-black/65">
          {group.length === 1
            ? "This subject has one plotted meeting."
            : `This subject is plotted across ${group.length} meetings. Remove just one, or all of them.`}
        </p>

        <div className="min-h-0 flex-1 overflow-auto">
          <ul className="divide-y divide-black/5">
            {group.map((row) => {
              const locked = Boolean(row.lockedByDoiAt);
              const isTarget = row.id === target.id;
              return (
                <li
                  key={row.id}
                  className={`flex items-center gap-3 px-5 py-3 ${isTarget ? "bg-[#ff990a]/[0.07]" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-black/80">
                      {row.day || "(no day)"}
                      {" · "}
                      {timeRange(row, slots)}
                      {row.lecLabMode === "lab" ? (
                        <span className="rounded bg-[#ff990a]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#8a5200]">
                          Lab
                        </span>
                      ) : null}
                      {isTarget ? (
                        <span className="rounded bg-[#780301]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#780301]">
                          This one
                        </span>
                      ) : null}
                      {locked ? (
                        <span className="inline-flex items-center gap-1 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-black/55">
                          <Lock className="h-3 w-3" aria-hidden />
                          Locked by DOI
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-black/50">
                      {roomCodeById.get(row.roomId) || "(no room)"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 shrink-0 border-red-200 text-[12px] text-red-800 hover:bg-red-50"
                    disabled={locked}
                    title={locked ? "DOI locked this row; it cannot be removed here." : undefined}
                    onClick={() => removeOne(row.id)}
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-black/10 px-5 py-3">
          {confirmingAll ? (
            <>
              <span className="mr-auto text-[12px] font-semibold text-red-800">
                Remove all {removable.length} meeting{removable.length === 1 ? "" : "s"}?
              </span>
              <Button
                type="button"
                variant="outline"
                className="h-9 text-[13px]"
                onClick={() => setConfirmingAll(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-9 bg-red-700 text-[13px] text-white hover:bg-red-800"
                onClick={removeAll}
              >
                Yes, remove all
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" className="h-9 text-[13px]" onClick={onClose}>
                Cancel
              </Button>
              {group.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 border-red-300 text-[13px] text-red-800 hover:bg-red-50"
                  disabled={removable.length === 0}
                  onClick={() => setConfirmingAll(true)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Remove all {removable.length}
                </Button>
              ) : null}
              <Button
                type="button"
                className="h-9 bg-red-700 text-[13px] text-white hover:bg-red-800 disabled:opacity-50"
                disabled={targetLocked}
                onClick={() => removeOne(target.id)}
              >
                Remove this meeting
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
