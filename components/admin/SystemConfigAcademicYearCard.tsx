"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi, semestersApi, ApiClientError } from "@/lib/api/client";
import { notifySystemConfigurationSaved } from "@/contexts/SystemConfigurationContext";
import type { AcademicPeriod } from "@/types/db";
import {
  defaultSchoolYearDraft,
  formatSpan,
  parseSchoolYearStart,
  periodContainingDate,
  suggestedSchoolYearDraft,
  todayYmd,
  type SchoolYearDraft,
} from "@/lib/system-configuration/school-year-defaults";

type Msg = { kind: "ok" | "error"; text: string } | null;

const labelClass = "text-[11px] font-semibold text-black/60";

/**
 * Academic year & semester.
 *
 * A school year is added as one unit — its 1st and 2nd Semester with their date spans — instead of
 * one free-typed period at a time. Defaults come from this computer's date (1st Sem Aug–Dec, 2nd
 * Sem Jan–Jun), and the semester containing today becomes current on save. Everything stays
 * editable: each semester's name and dates can be changed, and any semester can be set as current.
 */
export function SystemConfigAcademicYearCard({ canWrite }: { canWrite: boolean }) {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const today = todayYmd();
  const [draft, setDraft] = useState<SchoolYearDraft>(() => suggestedSchoolYearDraft([]));
  /** Once the admin edits the form, reloading the list must not overwrite what they typed. */
  const draftTouched = useRef(false);
  const [setCurrentFromToday, setSetCurrentFromToday] = useState(true);

  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", startDate: "", endDate: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await semestersApi.list({ forceRefresh: true });
      const list = (data.semesters as AcademicPeriod[]) ?? [];
      setPeriods(list);
      // Suggest the next school year that does not exist yet, unless the admin is mid-edit.
      if (!draftTouched.current) setDraft(suggestedSchoolYearDraft(list.map((p) => p.academicYear)));
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof ApiClientError ? e.message : "Could not load terms" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** School years newest first, each with its semesters in date order. */
  const groups = useMemo(() => {
    const byYear = new Map<string, AcademicPeriod[]>();
    for (const p of periods) {
      const key = p.academicYear || "—";
      byYear.set(key, [...(byYear.get(key) ?? []), p]);
    }
    return [...byYear.entries()]
      .map(([year, list]) => ({
        year,
        list: [...list].sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? "")),
      }))
      .sort((a, b) => b.year.localeCompare(a.year));
  }, [periods]);

  const current = periods.find((p) => p.isCurrent) ?? null;
  const todaysPeriod = periodContainingDate(periods, today);
  const todayLabel = formatSpan(today, null);

  function patchDraft(next: SchoolYearDraft) {
    draftTouched.current = true;
    setDraft(next);
  }

  function changeAcademicYear(value: string) {
    const start = parseSchoolYearStart(value);
    // A valid year resets the spans to that year's Aug–Dec / Jan–Jun; anything else just updates text.
    patchDraft(start != null ? { ...defaultSchoolYearDraft(start), academicYear: value } : { ...draft, academicYear: value });
  }

  async function setCurrent(id: string, name: string) {
    setMsg(null);
    setBusy(true);
    try {
      await adminApi.setCurrentAcademicPeriod(id);
      setMsg({ kind: "ok", text: `${name} is now the current term campus-wide.` });
      await load();
      notifySystemConfigurationSaved("academicPeriod");
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof ApiClientError ? e.message : "Update failed" });
    } finally {
      setBusy(false);
    }
  }

  async function addSchoolYear(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await adminApi.createSchoolYear({
        academicYear: draft.academicYear.trim(),
        firstSemester: draft.firstSemester,
        secondSemester: draft.secondSemester,
        today,
        setCurrentFromToday,
      });
      draftTouched.current = false;
      setMsg({
        kind: "ok",
        text: res.current
          ? `School year ${draft.academicYear} added. ${res.current.name} is now current (today falls in it).`
          : `School year ${draft.academicYear} added. The current term was not changed.`,
      });
      await load();
      notifySystemConfigurationSaved("academicPeriod");
    } catch (err) {
      setMsg({ kind: "error", text: err instanceof ApiClientError ? err.message : "Could not add the school year" });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p: AcademicPeriod) {
    setMsg(null);
    setEditId(p.id);
    setEditDraft({ name: p.name, startDate: (p.startDate ?? "").slice(0, 10), endDate: (p.endDate ?? "").slice(0, 10) });
  }

  async function saveEdit(id: string) {
    if (editDraft.startDate && editDraft.endDate && editDraft.startDate > editDraft.endDate) {
      setMsg({ kind: "error", text: "The start date must be before the end date." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.updateAcademicPeriod(id, {
        name: editDraft.name.trim(),
        startDate: editDraft.startDate || null,
        endDate: editDraft.endDate || null,
      });
      setEditId(null);
      setMsg({ kind: "ok", text: "Semester updated." });
      await load();
      notifySystemConfigurationSaved("academicPeriod");
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof ApiClientError ? e.message : "Update failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* What the computer date says, next to what the system currently uses. */}
      {!loading ? (
        <div className="flex items-start gap-2 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2.5 text-[13px]">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#780301]" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <p>
              Today ({todayLabel}):{" "}
              {todaysPeriod ? <strong>{todaysPeriod.name}</strong> : <span className="text-black/60">not inside any semester&apos;s dates</span>}
            </p>
            <p className="text-black/60">
              Current term: <strong className="text-black">{current?.name ?? "none set"}</strong>
            </p>
            {canWrite && todaysPeriod && !todaysPeriod.isCurrent ? (
              <Button
                type="button"
                size="sm"
                className="mt-1 bg-[#780301] text-white hover:bg-[#5a0201]"
                disabled={busy}
                onClick={() => void setCurrent(todaysPeriod.id, todaysPeriod.name)}
              >
                Set {todaysPeriod.name} as current
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-black/50">Loading terms…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-black/50">No school years yet. Add one below.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.year} className="rounded-lg border border-black/10">
              <p className="border-b border-black/10 bg-black/[0.02] px-3 py-1.5 text-xs font-bold text-black/70">
                School Year {g.year}
              </p>
              <ul className="divide-y divide-black/5">
                {g.list.map((p) => {
                  const isToday = todaysPeriod?.id === p.id;
                  if (editId === p.id) {
                    return (
                      <li key={p.id} className="space-y-2 px-3 py-2.5">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div className="sm:col-span-3">
                            <label className={labelClass}>Name</label>
                            <Input
                              value={editDraft.name}
                              onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Start date</label>
                            <Input
                              type="date"
                              value={editDraft.startDate}
                              onChange={(e) => setEditDraft((d) => ({ ...d, startDate: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>End date</label>
                            <Input
                              type="date"
                              value={editDraft.endDate}
                              onChange={(e) => setEditDraft((d) => ({ ...d, endDate: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-[#780301] text-white hover:bg-[#5a0201]"
                            disabled={busy || !editDraft.name.trim()}
                            onClick={() => void saveEdit(p.id)}
                          >
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditId(null)} disabled={busy}>
                            Cancel
                          </Button>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {p.semester || p.name}
                          {p.isCurrent ? (
                            <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                              Current
                            </span>
                          ) : null}
                          {isToday && !p.isCurrent ? (
                            <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                              Today
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-black/55">{formatSpan(p.startDate, p.endDate) || "No dates set"}</p>
                      </div>
                      {canWrite ? (
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => startEdit(p)} disabled={busy}>
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Edit
                          </Button>
                          {!p.isCurrent ? (
                            <Button type="button" size="sm" variant="outline" onClick={() => void setCurrent(p.id, p.name)} disabled={busy}>
                              Set as current
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {canWrite ? (
        <form onSubmit={(e) => void addSchoolYear(e)} className="space-y-3 border-t border-black/10 pt-4">
          <div>
            <p className="text-sm font-semibold text-black/80">Add school year</p>
            <p className="text-xs text-black/55">
              Creates the 1st and 2nd Semester together (or just the one a school year is missing). Dates are filled in
              from this computer&apos;s date — change any of them before saving.
            </p>
          </div>

          <div className="max-w-xs">
            <label className={labelClass} htmlFor="sy-year">
              School year
            </label>
            <Input
              id="sy-year"
              placeholder="2026-2027"
              value={draft.academicYear}
              onChange={(e) => changeAcademicYear(e.target.value)}
              required
            />
          </div>

          {(
            [
              ["firstSemester", "1st Semester"],
              ["secondSemester", "2nd Semester"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="rounded-lg border border-black/10 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-black/55">{formatSpan(draft[key].startDate, draft[key].endDate)}</p>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Start date</label>
                  <Input
                    type="date"
                    value={draft[key].startDate}
                    onChange={(e) => patchDraft({ ...draft, [key]: { ...draft[key], startDate: e.target.value } })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>End date</label>
                  <Input
                    type="date"
                    value={draft[key].endDate}
                    onChange={(e) => patchDraft({ ...draft, [key]: { ...draft[key], endDate: e.target.value } })}
                    required
                  />
                </div>
              </div>
            </div>
          ))}

          <label className="flex items-start gap-2 text-[13px] text-black/75">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={setCurrentFromToday}
              onChange={(e) => setSetCurrentFromToday(e.target.checked)}
            />
            Set the semester that contains today ({todayLabel}) as current
          </label>

          <Button type="submit" disabled={busy} className="bg-[#780301] text-white hover:bg-[#5a0201]">
            Add school year
          </Button>
        </form>
      ) : null}

      {msg ? (
        <p className={`text-sm ${msg.kind === "ok" ? "text-emerald-800" : "text-red-700"}`} role="status">
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
