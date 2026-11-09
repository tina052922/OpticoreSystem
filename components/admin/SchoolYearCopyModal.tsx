"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, FilePlus2, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/api/client";
import type { AcademicPeriod } from "@/types/db";
import { copySourceFor, type SchoolYearDraft } from "@/lib/system-configuration/school-year-defaults";

/** Campus-wide records every term already shares — shown so the admin knows they are kept. */
const SHARED_DATA = [
  "Buildings & Rooms",
  "Programs & Sections",
  "Subject Codes",
  "Instructors & Faculty Profiles",
] as const;

export type SchoolYearCopyChoice = { copySchedule: boolean };

/**
 * Asked when "Add school year" is pressed: start the new school year from the previous one's
 * plotted schedule, or start it empty.
 *
 * Only the plotted schedule is per term. Buildings, rooms, programs, sections, subjects and faculty
 * are campus-wide, so every school year already uses them — they are listed (ticked, locked) so
 * nobody thinks they are lost by choosing "start empty".
 */
export function SchoolYearCopyModal({
  open,
  draft,
  periods,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  draft: SchoolYearDraft;
  periods: AcademicPeriod[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: (choice: SchoolYearCopyChoice) => void;
}) {
  const [mode, setMode] = useState<"copy" | "empty">("copy");
  const [copySchedule, setCopySchedule] = useState(true);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("copy");
    setCopySchedule(true);
    let alive = true;
    adminApi
      .getScheduleCountsByPeriod()
      .then((r) => alive && setCounts(r.counts))
      .catch(() => alive && setCounts({}));
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  /** Which earlier semester each new one would copy from, skipping semesters the year already has. */
  const plan = useMemo(() => {
    const ay = draft.academicYear.trim();
    const have = new Set(
      periods.filter((p) => p.academicYear === ay).map((p) => (p.semester ?? "").trim().toLowerCase()),
    );
    return (
      [
        ["1st Semester", draft.firstSemester.startDate],
        ["2nd Semester", draft.secondSemester.startDate],
      ] as const
    )
      .filter(([label]) => !have.has(label.toLowerCase()))
      .map(([label, startDate]) => {
        const source = copySourceFor({ semester: label, startDate }, periods);
        return { label, source, count: source ? (counts?.[source.id] ?? null) : 0 };
      });
  }, [draft, periods, counts]);

  const totalToCopy = plan.reduce((n, p) => n + (p.count ?? 0), 0);
  const willCopy = mode === "copy" && copySchedule;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sy-copy-title"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-black/10 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/10 px-5 py-4">
          <div>
            <h2 id="sy-copy-title" className="text-lg font-bold text-[#780301]">
              Add school year {draft.academicYear}
            </h2>
            <p className="mt-0.5 text-[12px] text-black/55">How should the new semesters start?</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="rounded-lg p-1.5 text-black/50 hover:bg-black/5 hover:text-black"
            onClick={onCancel}
            disabled={busy}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["copy", Copy, "Copy from last school year", "Start from the previous school year's plotted schedule."],
                ["empty", FilePlus2, "Start empty", "No plotted classes. Plot the semesters from scratch."],
              ] as const
            ).map(([value, Icon, title, hint]) => (
              <label
                key={value}
                className={`flex cursor-pointer gap-2 rounded-lg border p-3 text-[13px] transition-colors ${
                  mode === value ? "border-[#780301] bg-[#780301]/[0.04]" : "border-black/15 hover:bg-black/[0.02]"
                }`}
              >
                <input
                  type="radio"
                  name="sy-copy-mode"
                  className="mt-1"
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                <span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Icon className="h-4 w-4 text-[#780301]" aria-hidden />
                    {title}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-black/60">{hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="rounded-lg border border-black/10">
            <p className="border-b border-black/10 bg-black/[0.02] px-3 py-1.5 text-xs font-bold text-black/70">
              Data for the new school year
            </p>
            <ul className="divide-y divide-black/5 text-[13px]">
              {SHARED_DATA.map((label) => (
                <li key={label} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded border border-black/20 bg-black/[0.06]">
                      <Check className="h-3 w-3 text-black/50" aria-hidden />
                    </span>
                    <span className="text-black/70">{label}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-black/45">
                    <Lock className="h-3 w-3" aria-hidden />
                    Shared by every term — always kept
                  </span>
                </li>
              ))}
              <li className="px-3 py-2">
                <label className={`flex items-center gap-2 ${mode === "copy" ? "" : "opacity-50"}`}>
                  <input
                    type="checkbox"
                    checked={willCopy}
                    disabled={mode !== "copy"}
                    onChange={(e) => setCopySchedule(e.target.checked)}
                  />
                  <span className="font-semibold">Plotted schedule</span>
                  <span className="text-[11px] text-black/50">(classes, instructors, rooms, times, enrollment)</span>
                </label>
                {mode === "copy" ? (
                  <ul className="mt-1.5 space-y-0.5 pl-6 text-[12px] text-black/65">
                    {plan.length === 0 ? (
                      <li>This school year already has both semesters.</li>
                    ) : (
                      plan.map((p) => (
                        <li key={p.label}>
                          <strong className="text-black/80">{p.label}</strong> ←{" "}
                          {p.source ? (
                            <>
                              {p.source.name}{" "}
                              <span className="text-black/45">
                                ({p.count == null ? "counting…" : `${p.count} class${p.count === 1 ? "" : "es"}`})
                              </span>
                            </>
                          ) : (
                            <span className="text-black/45">no earlier {p.label} to copy — starts empty</span>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </li>
            </ul>
          </div>

          {willCopy ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-950">
              Copied classes come in as <strong>drafts</strong>, unlocked, so chairmen can adjust them. Each semester
              copies from the same semester of the previous school year (1st → 1st, 2nd → 2nd).
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 px-5 py-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#780301] text-white hover:bg-[#5a0201]"
            disabled={busy || (willCopy && counts == null)}
            onClick={() => onConfirm({ copySchedule: willCopy })}
          >
            {busy
              ? "Adding…"
              : willCopy && totalToCopy > 0
                ? `Add school year & copy ${totalToCopy} class${totalToCopy === 1 ? "" : "es"}`
                : "Add school year"}
          </Button>
        </div>
      </div>
    </div>
  );
}
