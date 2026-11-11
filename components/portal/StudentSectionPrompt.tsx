"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type Enrolment = {
  programId: string | null;
  programName: string | null;
  yearCount: number;
  sectionId: string | null;
  sectionName: string | null;
  yearLevel: number | null;
  confirmedAt: string | null;
  currentPeriod: { id: string; name: string; startDate: string | null } | null;
  needsConfirmation: boolean;
  sections: Array<{ id: string; name: string; yearLevel: number }>;
};

const ENDPOINT = "/api/portal/my-student-enrolment";
/** "Remind me later" lasts for this browser session and this semester only. */
const SNOOZE_KEY = "opticore.studentSectionPrompt.snoozedPeriod";

const fieldClass =
  "h-10 w-full rounded-lg border border-black/20 bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";

function ordinalYear(n: number): string {
  return ["1st", "2nd", "3rd", "4th", "5th", "6th"][n - 1] ? `${["1st", "2nd", "3rd", "4th", "5th", "6th"][n - 1]} year` : `Year ${n}`;
}

function useStudentEnrolment() {
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => {
    try {
      const r = await apiFetch<{ enrolment: Enrolment | null }>(ENDPOINT, { method: "GET", forceRefresh: true });
      setEnrolment(r.enrolment);
    } catch {
      setEnrolment(null);
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { enrolment, setEnrolment, loaded };
}

/** Year + section pickers for the student's own program; the section list follows the year. */
function SectionPicker({
  enrolment,
  onSaved,
  onCancel,
  saveLabel = "Save",
}: {
  enrolment: Enrolment;
  onSaved: (next: Enrolment) => void;
  onCancel?: () => void;
  saveLabel?: string;
}) {
  const [year, setYear] = useState<number>(enrolment.yearLevel ?? 1);
  const [sectionId, setSectionId] = useState<string>(enrolment.sectionId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const years = useMemo(() => Array.from({ length: Math.max(1, enrolment.yearCount) }, (_, i) => i + 1), [enrolment.yearCount]);
  const sectionsForYear = useMemo(
    () => enrolment.sections.filter((s) => s.yearLevel === year),
    [enrolment.sections, year],
  );

  async function save() {
    if (!sectionId) {
      setError("Choose your section.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const r = await apiFetch<{ enrolment: Enrolment }>(ENDPOINT, { method: "PUT", body: { sectionId } });
      onSaved(r.enrolment);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="stu-year" className="text-[12px] font-semibold text-black/70">
            Year level
          </label>
          <select
            id="stu-year"
            className={`${fieldClass} mt-1`}
            value={year}
            onChange={(e) => {
              const y = Number(e.target.value);
              setYear(y);
              // A section from another year cannot stay picked.
              setSectionId((cur) => (enrolment.sections.some((s) => s.id === cur && s.yearLevel === y) ? cur : ""));
            }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {ordinalYear(y)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="stu-section" className="text-[12px] font-semibold text-black/70">
            Section
          </label>
          <select
            id="stu-section"
            className={`${fieldClass} mt-1`}
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          >
            <option value="">{sectionsForYear.length === 0 ? "No sections for this year" : "Select section…"}</option>
            {sectionsForYear.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800" role="status">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          className="bg-[#780301] text-white hover:bg-[#5a0201]"
          onClick={() => void save()}
          disabled={saving || !sectionId}
        >
          {saving ? "Saving…" : saveLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Asks a student to confirm their year and section when a new semester has started and their
 * profile has not been confirmed since. Without it a student who moved up (BSIT-2A → BSIT-3A)
 * keeps last term's section — and last term's schedule.
 */
export function StudentSectionPrompt() {
  const { enrolment, setEnrolment, loaded } = useStudentEnrolment();
  const [snoozed, setSnoozed] = useState(false);
  const [changing, setChanging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodId = enrolment?.currentPeriod?.id ?? "";
  useEffect(() => {
    try {
      setSnoozed(Boolean(periodId) && window.sessionStorage.getItem(SNOOZE_KEY) === periodId);
    } catch {
      setSnoozed(false);
    }
  }, [periodId]);

  if (!loaded || !enrolment || !enrolment.needsConfirmation || snoozed) return null;

  function done(next: Enrolment) {
    setEnrolment(next);
    setChanging(false);
    // Full reload: the schedule is fetched client-side for the old section.
    window.location.reload();
  }

  function remindLater() {
    try {
      window.sessionStorage.setItem(SNOOZE_KEY, periodId);
    } catch {
      /* private mode: just hide for now */
    }
    setSnoozed(true);
  }

  async function keepCurrent() {
    if (!enrolment?.sectionId) return;
    setConfirming(true);
    setError(null);
    try {
      const r = await apiFetch<{ enrolment: Enrolment }>(ENDPOINT, {
        method: "PUT",
        body: { sectionId: enrolment.sectionId },
      });
      done(r.enrolment);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  const hasSection = Boolean(enrolment.sectionId);

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stu-section-title"
        className="w-full max-w-md rounded-xl border border-black/10 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/10 px-5 py-4">
          <div className="flex gap-2.5">
            <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-[#780301]" aria-hidden />
            <div>
              <h2 id="stu-section-title" className="text-lg font-bold text-[#780301]">
                New semester — confirm your section
              </h2>
              <p className="mt-0.5 text-[12px] text-black/60">
                {enrolment.currentPeriod?.name ?? "A new semester"} has started. Make sure your year and section are
                right so you see the correct schedule.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Remind me later"
            className="rounded-lg p-1.5 text-black/50 hover:bg-black/5 hover:text-black"
            onClick={remindLater}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {hasSection && !changing ? (
            <>
              <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2.5 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-black/50">On file</p>
                <p className="mt-0.5 font-semibold">
                  {enrolment.sectionName ?? "—"}
                  {enrolment.yearLevel ? <span className="font-normal text-black/60"> · {ordinalYear(enrolment.yearLevel)}</span> : null}
                </p>
                {enrolment.programName ? <p className="text-[12px] text-black/55">{enrolment.programName}</p> : null}
              </div>
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800" role="status">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" className="gap-1.5" onClick={() => setChanging(true)} disabled={confirming}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Change section
                </Button>
                <Button
                  type="button"
                  className="bg-[#780301] text-white hover:bg-[#5a0201]"
                  onClick={() => void keepCurrent()}
                  disabled={confirming}
                >
                  {confirming ? "Saving…" : `Keep ${enrolment.sectionName ?? "this section"}`}
                </Button>
              </div>
            </>
          ) : (
            <SectionPicker
              enrolment={enrolment}
              onSaved={done}
              onCancel={hasSection ? () => setChanging(false) : undefined}
              saveLabel="Save section"
            />
          )}
          <button type="button" className="text-[12px] text-black/50 hover:text-black hover:underline" onClick={remindLater}>
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}

/** Profile page: the student's program, year and section for this semester, changeable any time. */
export function StudentEnrolmentCard() {
  const { enrolment, setEnrolment, loaded } = useStudentEnrolment();
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!loaded) {
    return <div className="rounded-xl border border-black/10 bg-white p-5 text-sm text-black/50 shadow-sm">Loading enrolment…</div>;
  }
  if (!enrolment) return null;

  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-500">Section this semester</h2>
          <p className="mt-0.5 text-[12px] text-black/55">
            {enrolment.currentPeriod?.name ?? "Current semester"} — update it when you move to a new section.
          </p>
        </div>
        {!editing ? (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => { setMsg(null); setEditing(true); }}>
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Change
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-4">
          <SectionPicker
            enrolment={enrolment}
            onCancel={() => setEditing(false)}
            onSaved={(next) => {
              setEnrolment(next);
              setEditing(false);
              setMsg("Section updated. Your schedule now follows the new section.");
              // Full reload: the schedule is fetched client-side for the old section.
    window.location.reload();
            }}
          />
        </div>
      ) : (
        <dl className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-black/50">Program</dt>
            <dd className="mt-0.5 font-semibold">{enrolment.programName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-black/50">Year level</dt>
            <dd className="mt-0.5 font-semibold">{enrolment.yearLevel ? ordinalYear(enrolment.yearLevel) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-black/50">Section</dt>
            <dd className="mt-0.5 font-semibold">{enrolment.sectionName ?? "—"}</dd>
          </div>
        </dl>
      )}

      {enrolment.needsConfirmation && !editing ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-950">
          Not yet confirmed for {enrolment.currentPeriod?.name ?? "this semester"}. Check your section, then press Change
          if it is different.
        </p>
      ) : null}
      {msg ? <p className="mt-3 text-[12px] font-medium text-emerald-800">{msg}</p> : null}
    </section>
  );
}
