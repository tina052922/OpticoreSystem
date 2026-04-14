"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  BSIT_EVALUATOR_TIME_SLOTS,
  BSIT_EVALUATOR_WEEKDAYS,
  type BsitEvaluatorWeekday,
} from "@/lib/chairman/bsit-evaluator-constants";
import { scheduleSlotDurationForSubject } from "@/lib/chairman/prospectus-registry";
import { detectConflictsSparse } from "@/lib/scheduling/conflicts";
import type { SparseScheduleBlock } from "@/lib/scheduling/conflicts";
import { GEC_VACANT_INSTRUCTOR_USER_ID, isGecCurriculumSubjectCode, isGecVacantScheduleEntry } from "@/lib/gec/gec-vacant";
import type { Program, Room, ScheduleEntry, Section, Subject, User } from "@/types/db";

const selectClass =
  "w-full min-h-9 rounded-md border border-black/25 bg-white px-2 text-[11px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";

export type GecPlotEditPatch = Partial<
  Pick<ScheduleEntry, "subjectId" | "instructorId" | "sectionId" | "roomId" | "day" | "startTime" | "endTime">
>;

type Props = {
  collegeId: string;
  academicPeriodId: string;
  sectionId: string;
  /** Merged DB + local edits (full college load; we filter to `sectionId` for display). */
  mergedEntries: ScheduleEntry[];
  /** Original rows — defines which ids are vacant GEC placeholders eligible for plotting. */
  entries: ScheduleEntry[];
  subjectById: Map<string, Subject>;
  sectionById: Map<string, Section>;
  programById: Map<string, Program>;
  instructors: User[];
  /** All users (for locked-row instructor names). */
  userById: Map<string, User>;
  rooms: Room[];
  edits: Record<string, GecPlotEditPatch>;
  patchEdit: (entryId: string, patch: GecPlotEditPatch) => void;
  canEditVacant: boolean;
  /** Restrict subject dropdown to these ids (e.g., prospectus year+semester filter). */
  allowedSubjectIds?: Set<string> | null;
  /** From prospectus summary click — optional quick-apply to vacant rows. */
  pickedSummaryCode: string | null;
  pickedSubjectId: string | null;
  /** Program Chairman parity: add a new vacant GEC row for this section. */
  onAddScheduleRow?: () => void;
  showAddScheduleButton?: boolean;
  /** Locally added rows (not yet persisted) — show remove until saved. */
  pendingNewEntryIds?: Set<string>;
  onRemovePendingEntry?: (entryId: string) => void;
};

function hhmm(t: string): string {
  return t.trim().length > 5 ? t.trim().slice(0, 5) : t.trim();
}

function startSlotIndexFromEntry(e: ScheduleEntry): number {
  const h = hhmm(e.startTime);
  return BSIT_EVALUATOR_TIME_SLOTS.findIndex((t) => t.startTime === h);
}

function entryToSparse(e: ScheduleEntry): SparseScheduleBlock | null {
  if (!e.academicPeriodId) return null;
  return {
    id: e.id,
    academicPeriodId: e.academicPeriodId,
    day: e.day,
    startTime: hhmm(e.startTime),
    endTime: hhmm(e.endTime),
    instructorId: e.instructorId,
    sectionId: e.sectionId,
    roomId: e.roomId,
  };
}

/**
 * Chairman-style plotting grid for one section: locked major rows read-only; vacant GEC rows use a light-green
 * treatment and accept instructor / room / day / slot (same mental model as Program Chairman).
 */
export function GecSectionPlottingTable({
  collegeId,
  academicPeriodId,
  sectionId,
  mergedEntries,
  entries,
  subjectById,
  sectionById,
  programById,
  instructors,
  userById,
  rooms,
  edits,
  patchEdit,
  canEditVacant,
  allowedSubjectIds = null,
  pickedSummaryCode,
  pickedSubjectId,
  onAddScheduleRow,
  showAddScheduleButton = false,
  pendingNewEntryIds = new Set(),
  onRemovePendingEntry,
}: Props) {
  const vacantSourceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of entries) {
      if (e.academicPeriodId !== academicPeriodId) continue;
      if (e.sectionId !== sectionId) continue;
      if (isGecVacantScheduleEntry(e, subjectById)) ids.add(e.id);
    }
    return ids;
  }, [entries, academicPeriodId, sectionId, subjectById]);

  const sectionRows = useMemo(() => {
    return mergedEntries
      .filter((e) => e.academicPeriodId === academicPeriodId && e.sectionId === sectionId)
      .slice()
      .sort((a, b) => {
        const da = BSIT_EVALUATOR_WEEKDAYS.indexOf(a.day as BsitEvaluatorWeekday);
        const db = BSIT_EVALUATOR_WEEKDAYS.indexOf(b.day as BsitEvaluatorWeekday);
        if (da !== db) return (da < 0 ? 99 : da) - (db < 0 ? 99 : db);
        return hhmm(a.startTime).localeCompare(hhmm(b.startTime));
      });
  }, [mergedEntries, academicPeriodId, sectionId]);

  const sparseCollegeUniverse = useMemo(() => {
    const list: SparseScheduleBlock[] = [];
    for (const e of mergedEntries) {
      if (e.academicPeriodId !== academicPeriodId) continue;
      const sec = sectionById.get(e.sectionId);
      const pr = sec ? programById.get(sec.programId) : null;
      if (!pr || pr.collegeId !== collegeId) continue;
      const b = entryToSparse(e);
      if (b) list.push(b);
    }
    return list;
  }, [mergedEntries, academicPeriodId, collegeId, sectionById, programById]);

  const sec = sectionById.get(sectionId);
  const program = sec ? programById.get(sec.programId) : null;
  const pid = sec?.programId ?? "";
  /** Matches `Program.code` in Supabase — drives which static prospectus drives slot spans. */
  const programCode = program?.code ?? "";

  const gecSubjects = useMemo(() => {
    if (!pid) return [];
    return [...subjectById.values()]
      .filter((s) => s.programId === pid && isGecCurriculumSubjectCode(s.code))
      .filter((s) => {
        if (!allowedSubjectIds || allowedSubjectIds.size === 0) return true;
        return allowedSubjectIds.has(s.id);
      });
  }, [subjectById, pid, allowedSubjectIds]);

  function conflictForEntry(e: ScheduleEntry): { faculty: string; room: string; section: string } {
    const candidate = entryToSparse(e);
    if (!candidate) return { faculty: "—", room: "—", section: "—" };
    const hits = detectConflictsSparse(candidate, sparseCollegeUniverse, candidate.id);
    const fac = hits.some((h) => h.type === "faculty");
    const room = hits.some((h) => h.type === "room");
    const secHit = hits.some((h) => h.type === "section");
    return {
      faculty: !candidate.instructorId ? "—" : fac ? "Yes" : "No",
      room: !candidate.roomId ? "—" : room ? "Yes" : "No",
      section: !candidate.sectionId ? "—" : secHit ? "Yes" : "No",
    };
  }

  function applySlotRange(entryId: string, subjectId: string, startIdx: number) {
    const dur = scheduleSlotDurationForSubject(programCode, subjectById.get(subjectId));
    const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
    const idx = Math.min(Math.max(0, startIdx), maxS);
    const start = BSIT_EVALUATOR_TIME_SLOTS[idx];
    const end = BSIT_EVALUATOR_TIME_SLOTS[idx + dur - 1];
    if (!start || !end) return;
    patchEdit(entryId, { startTime: start.startTime, endTime: end.endTime });
  }

  /** Actions column only when there are unsaved added rows (avoid an empty column). */
  const showActionsCol = Boolean(onRemovePendingEntry && pendingNewEntryIds.size > 0);

  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden border border-black/10">
      <div className="px-4 py-2 border-b border-black/10 bg-black/[0.02] flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-black/90">Main evaluator grid (section scope)</h3>
          <p className="text-[11px] text-black/55 mt-0.5">
            Locked rows: major subjects (read-only). Highlighted vacant GEC slots: plot subject, instructor, room, day,
            and start time — same fields as Program Chairman.
          </p>
        </div>
        {showAddScheduleButton && onAddScheduleRow ? (
          <Button
            type="button"
            className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold shrink-0"
            onClick={onAddScheduleRow}
          >
            + Add schedule row
          </Button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[1180px]">
          <thead>
            <tr className="bg-[#ff990a] text-white text-[11px]">
              <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Major</th>
              <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Section</th>
              <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Students</th>
              <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Subject</th>
              <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Instructor</th>
              <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Room</th>
              <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Time</th>
              <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Day</th>
              <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Faculty conflict</th>
              <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Room conflict</th>
              <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Section conflict</th>
              {showActionsCol ? (
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold w-16"> </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sectionRows.length === 0 ? (
              <tr>
                <td
                  colSpan={showActionsCol ? 12 : 11}
                  className="px-4 py-10 text-center text-[13px] text-black/50"
                >
                  No schedule rows for this section and term. Use &quot;+ Add schedule row&quot; to plot a GEC class
                  (same as Program Chairman).
                </td>
              </tr>
            ) : (
              sectionRows.map((e, i) => {
                const merged = { ...e, ...edits[e.id] };
                const sub = subjectById.get(merged.subjectId);
                const isVacantSlot = vacantSourceIds.has(e.id);
                const editable = canEditVacant && isVacantSlot;
                const cf = conflictForEntry(merged);
                const dur = scheduleSlotDurationForSubject(programCode, subjectById.get(merged.subjectId));
                const startIdx = startSlotIndexFromEntry(merged);
                const maxStart = Math.max(0, BSIT_EVALUATOR_TIME_SLOTS.length - dur);
                const effStart = startIdx >= 0 ? Math.min(startIdx, maxStart) : 0;
                const rowClass = editable
                  ? "bg-emerald-50/90 ring-1 ring-inset ring-emerald-400/70"
                  : i % 2 === 0
                    ? "bg-white"
                    : "bg-black/[0.02]";
                return (
                  <tr key={e.id} className={`text-[11px] ${rowClass}`}>
                    <td className="border border-black/10 px-2 py-1.5 font-semibold">{program?.code ?? "—"}</td>
                    <td className="border border-black/10 px-2 py-1.5">{sec?.name ?? "—"}</td>
                    <td className="border border-black/10 px-2 py-1.5 tabular-nums">{sec?.studentCount ?? "—"}</td>
                    <td className="border border-black/10 px-1 py-1 min-w-[160px]">
                      {editable ? (
                        <div className="space-y-1">
                          <select
                            className={selectClass}
                            value={merged.subjectId}
                            onChange={(ev) => {
                              const sid = ev.target.value;
                              patchEdit(e.id, { subjectId: sid });
                              applySlotRange(e.id, sid, effStart);
                            }}
                          >
                            <option value="">Select GEC subject…</option>
                            {gecSubjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.code}
                              </option>
                            ))}
                          </select>
                          {pickedSummaryCode && pickedSubjectId ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] w-full border-emerald-300 text-emerald-900"
                              onClick={() => {
                                patchEdit(e.id, { subjectId: pickedSubjectId });
                                applySlotRange(e.id, pickedSubjectId, effStart);
                              }}
                            >
                              Apply summary: {pickedSummaryCode}
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="font-medium text-black/85">{sub?.code ?? "—"}</span>
                      )}
                    </td>
                    <td className="border border-black/10 px-1 py-1 min-w-[140px]">
                      {editable ? (
                        <select
                          className={selectClass}
                          value={merged.instructorId}
                          onChange={(ev) => patchEdit(e.id, { instructorId: ev.target.value })}
                        >
                          <option value={GEC_VACANT_INSTRUCTOR_USER_ID}>— Vacant (TBD) —</option>
                          {instructors.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{userById.get(merged.instructorId)?.name ?? "—"}</span>
                      )}
                    </td>
                    <td className="border border-black/10 px-1 py-1 min-w-[120px]">
                      {editable ? (
                        <select
                          className={selectClass}
                          value={merged.roomId}
                          onChange={(ev) => patchEdit(e.id, { roomId: ev.target.value })}
                        >
                          <option value="">Select room…</option>
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.code}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{rooms.find((r) => r.id === merged.roomId)?.code ?? "—"}</span>
                      )}
                    </td>
                    <td className="border border-black/10 px-1 py-1 min-w-[200px]">
                      {editable && merged.subjectId ? (
                        <select
                          className={selectClass}
                          aria-label="First hour start slot"
                          value={effStart}
                          onChange={(ev) => applySlotRange(e.id, merged.subjectId, parseInt(ev.target.value, 10))}
                        >
                          {BSIT_EVALUATOR_TIME_SLOTS.slice(0, maxStart + 1).map((t, idx) => (
                            <option key={`${idx}-${t.label}`} value={idx}>
                              {t.label} ({dur}h)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="tabular-nums">
                          {hhmm(merged.startTime)}–{hhmm(merged.endTime)}
                        </span>
                      )}
                    </td>
                    <td className="border border-black/10 px-1 py-1">
                      {editable ? (
                        <select
                          className={selectClass}
                          value={merged.day}
                          onChange={(ev) => patchEdit(e.id, { day: ev.target.value })}
                        >
                          {BSIT_EVALUATOR_WEEKDAYS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{merged.day}</span>
                      )}
                    </td>
                    <td
                      className={`border border-black/10 px-2 py-1.5 font-semibold ${
                        cf.faculty === "Yes" ? "text-red-700 bg-red-50" : cf.faculty === "—" ? "text-black/45" : "text-green-800"
                      }`}
                    >
                      {cf.faculty}
                    </td>
                    <td
                      className={`border border-black/10 px-2 py-1.5 font-semibold ${
                        cf.room === "Yes" ? "text-red-700 bg-red-50" : cf.room === "—" ? "text-black/45" : "text-green-800"
                      }`}
                    >
                      {cf.room}
                    </td>
                    <td
                      className={`border border-black/10 px-2 py-1.5 font-semibold ${
                        cf.section === "Yes" ? "text-red-700 bg-red-50" : cf.section === "—" ? "text-black/45" : "text-green-800"
                      }`}
                    >
                      {cf.section}
                    </td>
                    {showActionsCol ? (
                      <td className="border border-black/10 px-1 py-1 align-middle">
                        {pendingNewEntryIds.has(e.id) && onRemovePendingEntry ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-[10px] px-2"
                            onClick={() => onRemovePendingEntry(e.id)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
