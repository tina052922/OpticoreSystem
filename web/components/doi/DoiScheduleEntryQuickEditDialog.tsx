"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { TIME_SLOT_OPTIONS, WEEKDAYS } from "@/lib/scheduling/constants";
import type { Room, ScheduleEntry, User } from "@/types/db";

export type DoiScheduleEntryQuickEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: ScheduleEntry | null;
  rooms: Room[];
  instructors: User[];
  busy?: boolean;
  onSave: (patch: Pick<ScheduleEntry, "day" | "startTime" | "endTime" | "roomId" | "instructorId">) => Promise<void>;
};

/**
 * DOI-only quick edit for a timetable row (RLS: scheduleentry_update_doi_final).
 */
export function DoiScheduleEntryQuickEditDialog({
  open,
  onOpenChange,
  entry,
  rooms,
  instructors,
  busy,
  onSave,
}: DoiScheduleEntryQuickEditDialogProps) {
  const [day, setDay] = useState("");
  const [slotKey, setSlotKey] = useState("");
  const [roomId, setRoomId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    setDay(entry.day);
    const match = TIME_SLOT_OPTIONS.find((o) => o.startTime === entry.startTime && o.endTime === entry.endTime);
    setSlotKey(match ? `${match.startTime}|${match.endTime}` : `${entry.startTime}|${entry.endTime}`);
    setRoomId(entry.roomId);
    setInstructorId(entry.instructorId);
    setErr(null);
  }, [entry]);

  const slot = useMemo(() => {
    const [s, e] = slotKey.split("|");
    if (!s || !e) return null;
    return { startTime: s, endTime: e };
  }, [slotKey]);

  const slotOptions = useMemo(() => {
    const base = TIME_SLOT_OPTIONS.map((o) => ({
      value: `${o.startTime}|${o.endTime}`,
      label: o.label,
    }));
    if (entry && !base.some((b) => b.value === slotKey)) {
      return [
        {
          value: slotKey,
          label: `${entry.startTime}–${entry.endTime} (current)`,
        },
        ...base,
      ];
    }
    return base;
  }, [entry, slotKey]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-black/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="doi-edit-entry-title"
      >
        <h2 id="doi-edit-entry-title" className="text-lg font-semibold text-gray-900 mb-1">
          Edit schedule row
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Changes apply immediately to this <code className="text-[11px]">ScheduleEntry</code>. Re-run the campus
          conflict check afterward.
        </p>

        {!entry ? (
          <p className="text-sm text-gray-600">No row selected.</p>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-600">
              Day
              <select
                className="mt-1 w-full h-10 rounded-lg border border-gray-200 px-2 text-sm"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              >
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Time slot
              <select
                className="mt-1 w-full h-10 rounded-lg border border-gray-200 px-2 text-sm"
                value={slotKey}
                onChange={(e) => setSlotKey(e.target.value)}
              >
                {slotOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Room
              <select
                className="mt-1 w-full h-10 rounded-lg border border-gray-200 px-2 text-sm"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Instructor
              <select
                className="mt-1 w-full h-10 rounded-lg border border-gray-200 px-2 text-sm"
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
              >
                {instructors.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </label>
            {err ? <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">{err}</p> : null}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white"
            disabled={busy || !entry || !slot}
            onClick={() => {
              if (!entry || !slot) return;
              setErr(null);
              void onSave({
                day,
                startTime: slot.startTime,
                endTime: slot.endTime,
                roomId,
                instructorId,
              }).catch((e) => setErr(e instanceof Error ? e.message : "Save failed"));
            }}
          >
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
