"use client";

import type { BsitEvaluatorWeekday } from "@/lib/chairman/bsit-evaluator-constants";
import {
  PLOT_MEETING_SLOT_COUNT,
  durationHoursAfterDayChange,
  formatPlotDurationHours,
  plotDurationChoices,
  type PlotMeetingsDraft,
} from "@/lib/evaluator/plot-meetings";

const fieldClass =
  "w-full min-h-10 rounded-lg border border-black/20 bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";
const labelClass = "text-[12px] font-semibold text-black/75";

export type PlotMeetingSlotsFieldsProps = {
  idPrefix: string;
  draft: PlotMeetingsDraft;
  onChange: (next: PlotMeetingsDraft) => void;
  days: readonly BsitEvaluatorWeekday[];
  maxDur: number;
  readOnly: boolean;
  busyDays?: Set<string> | null;
  incomplete?: boolean;
  error?: string | null;
};

export function PlotMeetingSlotsFields({
  idPrefix,
  draft,
  onChange,
  days,
  maxDur,
  readOnly,
  busyDays,
  incomplete = false,
  error = null,
}: PlotMeetingSlotsFieldsProps) {
  /* Half-hour steps, offered as a list so a duration can only ever be a plottable one. */
  const durationOptions = plotDurationChoices(maxDur);

  const timeFieldClass = incomplete
    ? `${fieldClass} mt-1 ring-2 ring-red-500 border-red-400 bg-red-50/70`
    : `${fieldClass} mt-1`;

  function patchTime(timeText: string) {
    onChange({ ...draft, timeText });
  }

  function patchSlot(index: number, patch: Partial<PlotMeetingsDraft["slots"][number]>) {
    const slots = draft.slots.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange({ ...draft, slots });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-start-time`}>
          Start time
        </label>
        <input
          id={`${idPrefix}-start-time`}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          className={`${timeFieldClass} tabular-nums`}
          placeholder="e.g. 8:00 AM or 2:30 PM"
          disabled={readOnly}
          value={draft.timeText}
          onChange={(e) => patchTime(e.target.value)}
        />
        <p className="text-[10px] text-black/50 mt-1">
          Type a start on the hour or half hour (8:00 AM, 2:30 PM, 14:30). The same start applies
          to each day below.
        </p>
      </div>

      <div>
        <p className={labelClass}>Days and duration</p>
        <p className="text-[10px] text-black/50 mt-0.5 mb-2">
          Up to {PLOT_MEETING_SLOT_COUNT} meetings in one plot — fill extra days instead of clicking the
          grid again.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {draft.slots.map((slot, i) => {
            const dayId = `${idPrefix}-day-${i + 1}`;
            const durId = `${idPrefix}-duration-${i + 1}`;
            return (
              <div key={dayId} className="space-y-2 min-w-0">
                <div>
                  <label className={labelClass} htmlFor={dayId}>
                    Day {i + 1}
                  </label>
                  <select
                    id={dayId}
                    className={`${fieldClass} mt-1`}
                    value={slot.day}
                    disabled={readOnly}
                    onChange={(e) => {
                      const day = e.target.value;
                      patchSlot(i, {
                        day,
                        durationHours: durationHoursAfterDayChange(day, slot.durationHours),
                      });
                    }}
                  >
                    <option value="">{i === 0 ? "Select day…" : "—"}</option>
                    {days.map((d) => {
                      const conflict = busyDays?.has(d) === true;
                      const usedElsewhere = draft.slots.some((s, j) => j !== i && s.day === d);
                      return (
                        <option
                          key={d}
                          value={d}
                          disabled={(conflict && slot.day !== d) || usedElsewhere}
                        >
                          {d}
                          {conflict ? " — Busy" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor={durId}>
                    Duration {i + 1}
                  </label>
                  <select
                    id={durId}
                    className={`${fieldClass} mt-1 tabular-nums`}
                    disabled={readOnly || !slot.day}
                    value={slot.durationHours}
                    onChange={(e) => patchSlot(i, { durationHours: e.target.value })}
                  >
                    <option value="">hrs</option>
                    {durationOptions.map((h) => {
                      const value = formatPlotDurationHours(h);
                      return (
                        <option key={value} value={value}>
                          {value} {h === 1 ? "hr" : "hrs"}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-black/50 mt-1">
          Duration runs from the start time in 30-minute steps (max {maxDur} for this subject) — a
          1.5 hr meeting starting 1:00 PM ends 2:30 PM, leaving 2:30 PM free for the next one. Clear
          Day to also clear Hours.
        </p>
      </div>
      {error ? (
        <p className="text-[12px] font-medium text-red-800 rounded-lg border border-red-200 bg-red-50 px-3 py-2" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
