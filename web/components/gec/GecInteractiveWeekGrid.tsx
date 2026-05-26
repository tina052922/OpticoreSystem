"use client";

import {
  useMemo,
  useCallback,
  useState,
  useEffect,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GecPlotScheduleModal } from "@/components/gec/GecPlotScheduleModal";
import type { ChairmanGridPlottingActions } from "@/components/evaluator/BsitChairmanInteractiveWeekGrid";
import {
  BSIT_EVALUATOR_TIME_SLOTS,
  BSIT_EVALUATOR_WEEKDAYS,
  type BsitEvaluatorWeekday,
} from "@/lib/chairman/bsit-evaluator-constants";
import { normalizeSlotHHMM } from "@/lib/chairman/evaluator-schedule-hydration";
import {
  inferDurationSlotsFromTimes,
  plotEntryDurationSlots,
  timesFromSlotRange,
} from "@/lib/evaluator/plot-duration";
import { sortedNavigationBuildingKeysFromRooms } from "@/lib/campus/campus-navigation-catalog";
import { isGecVacantScheduleEntry } from "@/lib/gec/gec-vacant";
import {
  formatUserInstructorLabel,
  type InstructorPlotOption,
} from "@/lib/evaluator/instructor-employee-id";
import { roomBuildingKey } from "@/lib/evaluator/room-by-building";
import type { RowConflictFlags } from "@/lib/evaluator/chairman-plot-row";
import type { FacultyProfile, Room, ScheduleEntry, Subject, User } from "@/types/db";
import { AlertTriangle, Save } from "lucide-react";

function hhmm(t: string): string {
  return normalizeSlotHHMM(t);
}

function startSlotIndexFromEntry(e: ScheduleEntry): number {
  const h = hhmm(e.startTime);
  const idx = BSIT_EVALUATOR_TIME_SLOTS.findIndex((t) => t.startTime === h);
  return idx >= 0 ? idx : -1;
}

function durationForEntry(e: ScheduleEntry): number {
  return inferDurationSlotsFromTimes(e.startTime, e.endTime);
}

function entryTimeBounds(e: ScheduleEntry): { startIdx: number; dur: number } | null {
  const dur = durationForEntry(e);
  const startIdx = startSlotIndexFromEntry(e);
  if (startIdx < 0) return null;
  const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
  const eff = Math.min(startIdx, maxS);
  if (eff < 0 || eff + dur > BSIT_EVALUATOR_TIME_SLOTS.length) return null;
  return { startIdx: eff, dur };
}

function formatTimeRangeFromSlots(effectiveStart: number, dur: number): string {
  const slots = BSIT_EVALUATOR_TIME_SLOTS;
  const first = slots[effectiveStart];
  const last = slots[effectiveStart + dur - 1];
  if (!first || !last) return "—";
  const start = first.label.split(" - ")[0] ?? "";
  const end = last.label.split(" - ").pop() ?? "";
  return `${start} – ${end}`;
}

function cellConflictClasses(
  cf: RowConflictFlags,
  scanHit: boolean,
  selected: boolean,
  isVacant: boolean,
): string {
  const parts: string[] = ["border border-black align-top text-black transition-all duration-150"];
  if (selected) {
    parts.push("ring-2 ring-[#ff990a] ring-inset bg-[#ff990a]/12 shadow-sm");
  }
  if (scanHit) {
    parts.push("bg-red-50/95 ring-2 ring-inset ring-red-400/90");
    return parts.join(" ");
  }
  if (cf.faculty === "Yes" || cf.room === "Yes" || cf.section === "Yes") {
    parts.push("bg-red-50/80 ring-2 ring-inset ring-red-300/70");
    if (cf.faculty === "Yes") parts.push("shadow-[inset_3px_0_0_0_#dc2626]");
    if (cf.room === "Yes") parts.push("shadow-[inset_0_3px_0_0_#ea580c]");
    if (cf.section === "Yes") parts.push("shadow-[inset_0_-3px_0_0_#7c3aed]");
    return parts.join(" ");
  }
  if (isVacant) {
    parts.push("bg-emerald-50/40");
  }
  return parts.join(" ");
}

type CellAnchor = { day: BsitEvaluatorWeekday; slotIdx: number };

type ModalSession = {
  entryId: string;
  draft: ScheduleEntry;
  buildingValue: string;
  durationSlots: number;
  isNew: boolean;
  readOnly: boolean;
  anchor: CellAnchor;
};

export type GecInteractiveWeekGridProps = {
  programCode: string;
  sectionId: string;
  sectionName: string;
  academicPeriodId: string;
  mergedEntries: ScheduleEntry[];
  vacantGecSourceIds: Set<string>;
  subjectById: Map<string, Subject>;
  roomById: Map<string, Room>;
  userById: Map<string, User>;
  facultyProfileByUserId: Map<string, Pick<FacultyProfile, "fullName">>;
  gecSubjects: Subject[];
  instructorPlotOptions: InstructorPlotOption[];
  rooms: Room[];
  roomBuildingByEntryId: Record<string, string>;
  setRoomBuildingByEntryId: Dispatch<SetStateAction<Record<string, string>>>;
  canEditVacant: boolean;
  conflictForEntry: (e: ScheduleEntry) => RowConflictFlags;
  conflictDetailForEntry?: (e: ScheduleEntry) => string[];
  highlightConflictEntryIds: Set<string>;
  /** GEC subject ids already on this section’s schedule (for split plotting). */
  plottedGecSubjectIds: Set<string>;
  pickedSummaryCode: string | null;
  pickedSubjectId: string | null;
  onPatchEntry: (entryId: string, patch: Partial<ScheduleEntry>) => void;
  onCreateVacantAtCell: (day: BsitEvaluatorWeekday, slotIdx: number) => void;
  /** After creating a row at a cell, parent sets this so the plot modal opens immediately. */
  focusEntryId?: string | null;
  onFocusEntryHandled?: () => void;
  onRemovePendingEntry?: (entryId: string) => void;
  pendingNewEntryIds: Set<string>;
  insFormBasePath?: string;
  plottingActions?: ChairmanGridPlottingActions;
  gridFooter?: ReactNode;
};

export function GecInteractiveWeekGrid({
  programCode,
  sectionId,
  sectionName,
  academicPeriodId,
  mergedEntries,
  vacantGecSourceIds,
  subjectById,
  roomById,
  userById,
  facultyProfileByUserId,
  gecSubjects,
  instructorPlotOptions,
  rooms,
  roomBuildingByEntryId,
  setRoomBuildingByEntryId,
  canEditVacant,
  conflictForEntry,
  conflictDetailForEntry,
  highlightConflictEntryIds,
  plottedGecSubjectIds,
  pickedSummaryCode,
  pickedSubjectId,
  onPatchEntry,
  onCreateVacantAtCell,
  focusEntryId,
  onFocusEntryHandled,
  onRemovePendingEntry,
  pendingNewEntryIds,
  insFormBasePath = "/admin/gec/ins",
  plottingActions,
  gridFooter,
}: GecInteractiveWeekGridProps) {
  const slots = BSIT_EVALUATOR_TIME_SLOTS;
  const buildingLabels = useMemo(() => sortedNavigationBuildingKeysFromRooms(rooms), [rooms]);

  const [highlightedCell, setHighlightedCell] = useState<CellAnchor | null>(null);
  const [modal, setModal] = useState<ModalSession | null>(null);

  const sectionRows = useMemo(
    () =>
      mergedEntries
        .filter((e) => e.academicPeriodId === academicPeriodId && e.sectionId === sectionId)
        .slice()
        .sort((a, b) => {
          const da = BSIT_EVALUATOR_WEEKDAYS.indexOf(a.day as BsitEvaluatorWeekday);
          const db = BSIT_EVALUATOR_WEEKDAYS.indexOf(b.day as BsitEvaluatorWeekday);
          if (da !== db) return (da < 0 ? 99 : da) - (db < 0 ? 99 : db);
          return hhmm(a.startTime).localeCompare(hhmm(b.startTime));
        }),
    [mergedEntries, academicPeriodId, sectionId],
  );

  useEffect(() => {
    if (!modal) return;
    const bounds = entryTimeBounds(modal.draft);
    setHighlightedCell({
      day: modal.draft.day as BsitEvaluatorWeekday,
      slotIdx: bounds?.startIdx ?? startSlotIndexFromEntry(modal.draft),
    });
  }, [modal?.draft.day, modal?.draft.startTime, modal?.draft.endTime, modal?.draft.subjectId, modal]);

  const skipSlot = useMemo(() => {
    const m = new Set<string>();
    for (const e of sectionRows) {
      const bounds = entryTimeBounds(e);
      if (!bounds) continue;
      const day = e.day as BsitEvaluatorWeekday;
      if (!BSIT_EVALUATOR_WEEKDAYS.includes(day)) continue;
      for (let k = 1; k < bounds.dur; k++) {
        m.add(`${day}-${bounds.startIdx + k}`);
      }
    }
    return m;
  }, [sectionRows, programCode, subjectById]);

  const unplacedRows = useMemo(
    () =>
      sectionRows.filter((e) => {
        if (!vacantGecSourceIds.has(e.id)) return false;
        return entryTimeBounds(e) == null;
      }),
    [sectionRows, vacantGecSourceIds, programCode, subjectById],
  );

  const insPrintHref = `${insFormBasePath}?tab=section&sectionId=${encodeURIComponent(sectionId)}&print=1`;

  const openModalForEntry = useCallback(
    (e: ScheduleEntry, anchor: CellAnchor) => {
      const isVacant = vacantGecSourceIds.has(e.id);
      const readOnly = !canEditVacant || !isVacant;
      const pickedRoom = e.roomId ? roomById.get(e.roomId) : undefined;
      const buildingValue = roomBuildingByEntryId[e.id] ?? (pickedRoom ? roomBuildingKey(pickedRoom) : "");
      setHighlightedCell(anchor);
      setModal({
        entryId: e.id,
        draft: { ...e },
        buildingValue,
        durationSlots: inferDurationSlotsFromTimes(e.startTime, e.endTime),
        isNew: pendingNewEntryIds.has(e.id),
        readOnly,
        anchor,
      });
    },
    [canEditVacant, vacantGecSourceIds, roomById, roomBuildingByEntryId, pendingNewEntryIds],
  );

  const openModalForEmptyCell = useCallback(
    (day: BsitEvaluatorWeekday, slotIdx: number) => {
      if (!canEditVacant) return;
      onCreateVacantAtCell(day, slotIdx);
    },
    [canEditVacant, onCreateVacantAtCell],
  );

  const closeModal = useCallback(() => {
    setModal(null);
    setHighlightedCell(null);
  }, []);

  const handleApply = useCallback(() => {
    if (!modal || modal.readOnly) return;
    const { entryId, draft, buildingValue } = modal;
    if (buildingValue) {
      setRoomBuildingByEntryId((prev) => ({ ...prev, [entryId]: buildingValue }));
    }
    onPatchEntry(entryId, {
      subjectId: draft.subjectId,
      instructorId: draft.instructorId,
      roomId: draft.roomId,
      day: draft.day,
      startTime: draft.startTime,
      endTime: draft.endTime,
    });
    closeModal();
  }, [modal, onPatchEntry, setRoomBuildingByEntryId, closeModal]);

  const handleRemove = useCallback(() => {
    if (!modal || modal.isNew) return;
    onRemovePendingEntry?.(modal.entryId);
    closeModal();
  }, [modal, onRemovePendingEntry, closeModal]);

  const modalConflictFlags = modal ? conflictForEntry(modal.draft) : { faculty: "—", room: "—", section: "—" };
  const modalConflictLines = modal && conflictDetailForEntry ? conflictDetailForEntry(modal.draft) : [];
  const anchorLabel = modal
    ? `${modal.draft.day} · ${BSIT_EVALUATOR_TIME_SLOTS[startSlotIndexFromEntry(modal.draft)]?.label ?? "Time slot"}`
    : "";

  const isCellSelected = (day: BsitEvaluatorWeekday, slotIdx: number) =>
    highlightedCell?.day === day && highlightedCell?.slotIdx === slotIdx;

  useEffect(() => {
    if (!focusEntryId) return;
    const e = sectionRows.find((r) => r.id === focusEntryId);
    if (!e) return;
    const bounds = entryTimeBounds(e);
    openModalForEntry(e, {
      day: (e.day as BsitEvaluatorWeekday) || "Monday",
      slotIdx: bounds?.startIdx ?? Math.max(0, startSlotIndexFromEntry(e)),
    });
    onFocusEntryHandled?.();
  }, [focusEntryId, sectionRows, programCode, subjectById, openModalForEntry, onFocusEntryHandled]);

  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden border border-black/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-black">Schedule preview (INS weekly grid)</div>
          <p className="text-[12px] text-black/55 mt-1">
            Section <strong>{sectionName}</strong> · Monday–Friday · 7:00 AM–5:00 PM · Click a cell to plot or edit ·
            Split hours with 1-hour meetings + “Add another time slot” · Light green = vacant GEC · Gray = locked major
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {plottingActions ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="border-amber-300 bg-white font-bold shrink-0 h-9 text-xs"
                disabled={plottingActions.runConflictCheckDisabled}
                onClick={() => plottingActions.onRunConflictCheck()}
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 inline" aria-hidden />
                Run conflict check (campus-wide)
              </Button>
              <Button
                type="button"
                className="bg-[#780301] hover:bg-[#5a0201] text-white font-bold shrink-0 h-9 text-xs disabled:opacity-50"
                disabled={plottingActions.saveScheduleDisabled || plottingActions.saveScheduleBusy}
                onClick={() => plottingActions.onSaveSchedule()}
              >
                <Save className="w-3.5 h-3.5 mr-1.5 inline" aria-hidden />
                {plottingActions.saveScheduleBusy ? "Saving…" : "Save schedule"}
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white font-bold h-9 text-xs shrink-0"
            onClick={() => window.open(insPrintHref, "_blank", "noopener,noreferrer")}
          >
            Generate INS Form
          </Button>
          {plottingActions ? (
            <div className="flex flex-col items-end gap-0.5 text-[10px] text-black/55 min-w-[140px]">
              <span className="font-semibold text-black/70">
                {plottingActions.connOnline !== false ? (
                  <span className="text-emerald-800">Online</span>
                ) : (
                  <span className="text-red-800">Offline</span>
                )}
                <span className="text-black/45 font-normal">
                  {canEditVacant ? " · Autosave ~9s" : " · Approval required"}
                </span>
              </span>
              <span className="tabular-nums">
                {plottingActions.lastDraftSaveAt
                  ? `Last draft sync: ${plottingActions.lastDraftSaveAt.toLocaleTimeString()}`
                  : "Last draft sync: —"}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {unplacedRows.length > 0 ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
          <p className="text-[11px] font-semibold text-amber-950">Incomplete vacant GEC plots — click to finish</p>
          <ul className="flex flex-wrap gap-2">
            {unplacedRows.map((e) => {
              const sub = subjectById.get(e.subjectId);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    disabled={!canEditVacant}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-[11px] font-medium text-amber-950 hover:bg-amber-50 disabled:opacity-50"
                    onClick={() =>
                      openModalForEntry(e, {
                        day: (e.day as BsitEvaluatorWeekday) || "Monday",
                        slotIdx: Math.max(0, startSlotIndexFromEntry(e)),
                      })
                    }
                  >
                    {sub?.code || "Continue plotting…"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto max-h-[min(70vh,720px)] overflow-y-auto">
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th className="border border-black bg-[#ff990a] text-white px-1 py-1 w-[72px] font-bold">TIME</th>
              {BSIT_EVALUATOR_WEEKDAYS.map((day) => (
                <th key={day} className="border border-black bg-[#ff990a] text-white px-1 py-1 min-w-[100px] font-bold">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, slotIdx) => (
              <tr key={slot.label}>
                <td className="border border-black px-1 py-1.5 text-center whitespace-nowrap text-black bg-white/95">
                  {slot.label}
                </td>
                {BSIT_EVALUATOR_WEEKDAYS.map((day) => {
                  if (skipSlot.has(`${day}-${slotIdx}`)) return null;
                  const atHere = sectionRows.filter((e) => {
                    const bounds = entryTimeBounds(e);
                    if (!bounds) return false;
                    if (e.day !== day) return false;
                    return bounds.startIdx === slotIdx;
                  });
                  const selected = isCellSelected(day, slotIdx);

                  if (atHere.length === 0) {
                    return (
                      <td
                        key={day}
                        className={`border border-black px-0.5 py-0.5 align-top min-h-[44px] ${cellConflictClasses(
                          { faculty: "No", room: "No", section: "No" },
                          false,
                          selected,
                          false,
                        )}`}
                      >
                        <button
                          type="button"
                          disabled={!canEditVacant}
                          className="w-full min-h-[40px] rounded border border-dashed border-black/20 text-black/30 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-0.5 transition-colors"
                          aria-label={`Plot vacant GEC on ${day} at ${slot.label}`}
                          onClick={() => openModalForEmptyCell(day, slotIdx)}
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden />
                        </button>
                      </td>
                    );
                  }

                  const rowspan = Math.max(
                    ...atHere.map((e) => entryTimeBounds(e)?.dur ?? 1),
                  );
                  const cfMerged = atHere.map((e) => conflictForEntry(e));
                  const scanHit = atHere.some((e) => highlightConflictEntryIds.has(e.id));
                  const mergedCf: RowConflictFlags = {
                    faculty: cfMerged.some((c) => c.faculty === "Yes") ? "Yes" : "No",
                    room: cfMerged.some((c) => c.room === "Yes") ? "Yes" : "No",
                    section: cfMerged.some((c) => c.section === "Yes") ? "Yes" : "No",
                  };

                  return (
                    <td
                      key={day}
                      rowSpan={rowspan}
                      className={`px-0.5 py-0.5 min-w-[100px] ${cellConflictClasses(
                        mergedCf,
                        scanHit,
                        selected,
                        atHere.some((e) => vacantGecSourceIds.has(e.id)),
                      )}`}
                    >
                      <ul className="space-y-1">
                        {atHere.map((e) => {
                          const bounds = entryTimeBounds(e);
                          const anchor: CellAnchor = {
                            day: e.day as BsitEvaluatorWeekday,
                            slotIdx: bounds?.startIdx ?? Math.max(0, startSlotIndexFromEntry(e)),
                          };
                          const sub = subjectById.get(e.subjectId);
                          const room = roomById.get(e.roomId);
                          const inst = userById.get(e.instructorId);
                          const isVacant = vacantGecSourceIds.has(e.id);
                          const cf = conflictForEntry(e);
                          const dur = bounds?.dur ?? 1;
                          const hasConflict =
                            cf.faculty === "Yes" || cf.room === "Yes" || cf.section === "Yes";

                          return (
                            <li key={e.id} id={`gec-hub-eval-row-${e.id}`}>
                              <div
                                role="button"
                                tabIndex={0}
                                className={`w-full text-left rounded-md px-1.5 py-1.5 leading-tight cursor-pointer transition-colors ${
                                  isVacant
                                    ? "bg-emerald-100/90 ring-1 ring-emerald-400/70 hover:bg-emerald-100"
                                    : "bg-gray-200/70 text-black/70 hover:bg-gray-200/90"
                                } ${hasConflict ? "border border-red-300/80" : "border border-transparent"}`}
                                onClick={() => openModalForEntry(e, anchor)}
                                onKeyDown={(ev) => {
                                  if (ev.key === "Enter" || ev.key === " ") {
                                    ev.preventDefault();
                                    openModalForEntry(e, anchor);
                                  }
                                }}
                              >
                                <span className="text-[10px] font-bold text-black block truncate">
                                  {sub?.code ?? "—"}
                                </span>
                                {room ? (
                                  <span className="text-[8px] text-black/55 block truncate">{room.code}</span>
                                ) : null}
                                {inst ? (
                                  <span className="text-[8px] text-black/55 block truncate">
                                    {formatUserInstructorLabel(inst, facultyProfileByUserId.get(e.instructorId))}
                                  </span>
                                ) : null}
                                {bounds ? (
                                  <span className="text-[8px] text-black/45 tabular-nums">
                                    {formatTimeRangeFromSlots(bounds.startIdx, dur)}
                                  </span>
                                ) : null}
                                {hasConflict ? (
                                  <span className="text-[7px] font-bold text-red-800 mt-0.5 block">Conflict</span>
                                ) : null}
                                {!isVacant ? (
                                  <span className="text-[7px] font-semibold text-black/45 block">Locked</span>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {gridFooter ? <div className="mt-4 space-y-3 border-t border-black/10 pt-4">{gridFooter}</div> : null}

      <GecPlotScheduleModal
        open={modal != null}
        onClose={closeModal}
        draft={modal?.draft ?? sectionRows[0] ?? ({} as ScheduleEntry)}
        onDraftChange={(next) => setModal((m) => (m ? { ...m, draft: next } : m))}
        buildingValue={modal?.buildingValue ?? ""}
        onBuildingChange={(b) => setModal((m) => (m ? { ...m, buildingValue: b } : m))}
        programCode={programCode}
        sectionName={sectionName}
        gecSubjects={gecSubjects}
        instructorPlotOptions={instructorPlotOptions}
        rooms={rooms}
        buildingLabels={buildingLabels}
        conflictFlags={modalConflictFlags}
        conflictDetailLines={modalConflictLines}
        durationSlots={modal?.durationSlots ?? 1}
        onDurationSlotsChange={(slots) =>
          setModal((m) => {
            if (!m) return m;
            const sub = subjectById.get(m.draft.subjectId);
            const d = plotEntryDurationSlots(programCode, sub, slots);
            const startIdx = startSlotIndexFromEntry(m.draft);
            const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - d;
            const eff = Math.min(Math.max(0, startIdx), maxS);
            const times = timesFromSlotRange(eff, d);
            return {
              ...m,
              durationSlots: slots,
              draft: times ? { ...m.draft, startTime: times.startTime, endTime: times.endTime } : m.draft,
            };
          })
        }
        plottedGecSubjectIds={plottedGecSubjectIds}
        readOnly={modal?.readOnly ?? true}
        isNewPlot={modal?.isNew ?? false}
        anchorLabel={anchorLabel}
        pickedSummaryCode={pickedSummaryCode}
        pickedSubjectId={pickedSubjectId}
        onApplyPickedSummary={
          modal && pickedSubjectId && !modal.readOnly
            ? () => {
                const sub = gecSubjects.find((s) => s.id === pickedSubjectId);
                if (!sub) return;
                const d = plotEntryDurationSlots(programCode, sub, 1);
                const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - d;
                const eff = Math.min(startSlotIndexFromEntry(modal.draft), maxS);
                const times = timesFromSlotRange(eff, d);
                if (!times) return;
                setModal((m) =>
                  m
                    ? {
                        ...m,
                        durationSlots: 1,
                        draft: {
                          ...m.draft,
                          subjectId: pickedSubjectId,
                          startTime: times.startTime,
                          endTime: times.endTime,
                        },
                      }
                    : m,
                );
              }
            : undefined
        }
        onApply={handleApply}
        onRemove={
          modal && modal.isNew && pendingNewEntryIds.has(modal.entryId) ? handleRemove : undefined
        }
      />
    </div>
  );
}
