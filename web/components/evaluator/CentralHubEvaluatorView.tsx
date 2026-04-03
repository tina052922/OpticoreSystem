"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  CAMPUS_WIDE_COLLEGE_SLUG,
  CENTRAL_HUB_COLLEGES,
  hubCollegeBySlug,
  hubSlugForCollegeId,
} from "@/lib/evaluator-central-hub";
import { buildScheduleEvaluatorTableRows } from "@/lib/evaluator/schedule-evaluator-table";
import { runRuleBasedGeneticAlgorithm } from "@/lib/scheduling/ruleBasedGA";
import type { GASuggestion, ScheduleBlock } from "@/lib/scheduling/types";
import type { AcademicPeriod, College, Program, Room, ScheduleEntry, Section, Subject, User } from "@/types/db";
import { EvaluatorScheduleOverviewTable } from "@/components/evaluator/EvaluatorScheduleOverviewTable";

function HubEvaluatorTabs({
  basePath,
  collegeSlug,
  panel,
}: {
  basePath: string;
  collegeSlug: string | null;
  panel: "timetabling" | "hrs";
}) {
  const isLanding = !collegeSlug;
  const collegesActive = isLanding;
  const timetablingActive = !isLanding && panel === "timetabling";
  const hrsActive = !isLanding && panel === "hrs";

  const timetablingHref = isLanding
    ? `${basePath}?college=${CAMPUS_WIDE_COLLEGE_SLUG}`
    : `${basePath}?college=${encodeURIComponent(collegeSlug!)}`;

  const hrsHref = isLanding
    ? `${basePath}?college=${CAMPUS_WIDE_COLLEGE_SLUG}&panel=hrs`
    : `${basePath}?college=${encodeURIComponent(collegeSlug!)}&panel=hrs`;

  const tabClass = (active: boolean) =>
    `px-6 py-3 font-medium transition-colors rounded-t-lg ${
      active ? "bg-[#FF990A] text-white" : "text-gray-600 hover:text-gray-800 bg-gray-100"
    }`;

  return (
    <div className="flex gap-2 border-b border-gray-200 mb-6 flex-wrap">
      <Link href={basePath} className={tabClass(collegesActive)}>
        Colleges
      </Link>
      <Link href={timetablingHref} className={tabClass(timetablingActive)}>
        Timetabling & Optimization
      </Link>
      <Link href={hrsHref} className={tabClass(hrsActive)}>
        Hrs-Units-Preps-Remarks
      </Link>
    </div>
  );
}

function toBlock(e: ScheduleEntry): ScheduleBlock {
  return {
    id: e.id,
    academicPeriodId: e.academicPeriodId,
    subjectId: e.subjectId,
    instructorId: e.instructorId,
    sectionId: e.sectionId,
    roomId: e.roomId,
    day: e.day,
    startTime: e.startTime,
    endTime: e.endTime,
  };
}

type LoadRow = {
  faculty: string;
  hours: number;
  preps: number;
  units: number;
  designation: string;
  status: string;
  rate: number;
  remark: "Underloaded" | "Maximum" | "Overloaded";
};

const sampleLoadRows: LoadRow[] = [
  {
    faculty: "Juan Dela Cruz",
    hours: 10,
    preps: 3,
    units: 15,
    designation: "Instructor I",
    status: "Organic",
    rate: 250,
    remark: "Underloaded",
  },
  {
    faculty: "Ana Reyes",
    hours: 18,
    preps: 6,
    units: 24,
    designation: "Instructor (PT)",
    status: "Part-Time",
    rate: 200,
    remark: "Maximum",
  },
  {
    faculty: "Dr. Maria Santos",
    hours: 22,
    preps: 7,
    units: 30,
    designation: "Chair / Instructor",
    status: "Permanent",
    rate: 300,
    remark: "Overloaded",
  },
];

function remarkClass(r: LoadRow["remark"]) {
  if (r === "Underloaded") return "bg-green-100 text-green-900";
  if (r === "Maximum") return "bg-yellow-100 text-yellow-900";
  return "bg-red-100 text-red-900";
}

export type CentralHubEvaluatorViewProps = {
  /** e.g. `/admin/college/evaluator` — used for hub tile links and back link */
  basePath: string;
};

export function CentralHubEvaluatorView({ basePath }: CentralHubEvaluatorViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const collegeSlug = searchParams.get("college");
  const isCampusWide = collegeSlug?.toLowerCase() === CAMPUS_WIDE_COLLEGE_SLUG;
  const hub = hubCollegeBySlug(collegeSlug);
  const panel = searchParams.get("panel") === "hrs" ? "hrs" : "timetabling";
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);

  const [academicPeriodId, setAcademicPeriodId] = useState("");
  const [programId, setProgramId] = useState("");

  const [altOpen, setAltOpen] = useState(false);
  const [altSuggestions, setAltSuggestions] = useState<GASuggestion[]>([]);
  const [altBusy, setAltBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoadError("Supabase env missing.");
      setLoading(false);
      return;
    }
    const [
      { data: ap, error: e1 },
      { data: prog, error: e2 },
      { data: sec, error: e3 },
      { data: sub, error: e4 },
      { data: rm, error: e5 },
      { data: fac, error: e6 },
      { data: sch, error: e7 },
      { data: col, error: e8 },
    ] = await Promise.all([
      supabase.from("AcademicPeriod").select("*").order("startDate", { ascending: false }),
      supabase.from("Program").select("*").order("name"),
      supabase.from("Section").select("*").order("name"),
      supabase.from("Subject").select("*").order("code"),
      supabase.from("Room").select("*").order("code"),
      supabase.from("User").select("id,email,name,role,collegeId,employeeId"),
      supabase.from("ScheduleEntry").select("*"),
      supabase.from("College").select("*").order("name"),
    ]);
    const err = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8;
    if (err) {
      setLoadError(err.message);
      setLoading(false);
      return;
    }
    setPeriods((ap ?? []) as AcademicPeriod[]);
    setPrograms((prog ?? []) as Program[]);
    setSections((sec ?? []) as Section[]);
    setSubjects((sub ?? []) as Subject[]);
    setRooms((rm ?? []) as Room[]);
    setUsers((fac ?? []) as User[]);
    setEntries((sch ?? []) as ScheduleEntry[]);
    setColleges((col ?? []) as College[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (periods.length === 0 || academicPeriodId) return;
    const cur = periods.find((x) => x.isCurrent) ?? periods[0];
    if (cur) setAcademicPeriodId(cur.id);
  }, [periods, academicPeriodId]);

  /** null = all colleges (campus-wide); string = one college in DB */
  const scopeCollegeId = isCampusWide ? null : hub?.collegeId ?? null;

  const programsInCollege = useMemo(
    () => programs.filter((p) => !scopeCollegeId || p.collegeId === scopeCollegeId),
    [programs, scopeCollegeId],
  );

  const subjectById = useMemo(() => {
    const m = new Map<string, Subject>();
    subjects.forEach((s) => m.set(s.id, s));
    return m;
  }, [subjects]);

  const roomById = useMemo(() => {
    const m = new Map<string, Room>();
    rooms.forEach((r) => m.set(r.id, r));
    return m;
  }, [rooms]);

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const sectionById = useMemo(() => {
    const m = new Map<string, Section>();
    sections.forEach((s) => m.set(s.id, s));
    return m;
  }, [sections]);

  const programById = useMemo(() => {
    const m = new Map<string, Program>();
    programs.forEach((p) => m.set(p.id, p));
    return m;
  }, [programs]);

  const universe = useMemo(() => entries.map(toBlock), [entries]);

  const collegeNameById = useMemo(() => {
    const m = new Map<string, string>();
    colleges.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [colleges]);

  const tableRows = useMemo(() => {
    if (!academicPeriodId) return [];
    return buildScheduleEvaluatorTableRows({
      entries,
      academicPeriodId,
      scopeCollegeId,
      programId,
      sectionById,
      programById,
      subjectById,
      roomById,
      userById,
      collegeNameById,
    });
  }, [
    entries,
    scopeCollegeId,
    academicPeriodId,
    programId,
    sectionById,
    subjectById,
    roomById,
    userById,
    programById,
    collegeNameById,
  ]);

  function runAlternativeSuggestion() {
    if (!academicPeriodId) return;
    const first = entries.find((e) => {
      if (e.academicPeriodId !== academicPeriodId) return false;
      const sec = sectionById.get(e.sectionId);
      if (!sec) return false;
      const pr = programById.get(sec.programId);
      if (!pr) return false;
      if (scopeCollegeId && pr.collegeId !== scopeCollegeId) return false;
      if (programId && sec.programId !== programId) return false;
      return true;
    });
    if (!first) {
      setAltSuggestions([]);
      setAltOpen(true);
      return;
    }
    const sec0 = sectionById.get(first.sectionId);
    const pr0 = sec0 ? programById.get(sec0.programId) : null;
    const cid = pr0?.collegeId ?? scopeCollegeId;
    if (!cid) {
      setAltSuggestions([]);
      setAltOpen(true);
      return;
    }
    const roomIds = rooms.filter((r) => r.collegeId === cid || r.collegeId == null).map((r) => r.id);
    const instructorIds = users
      .filter((u) => u.collegeId === cid && (u.role === "instructor" || u.role === "chairman_admin"))
      .map((u) => u.id);
    if (roomIds.length === 0 || instructorIds.length === 0) {
      setAltSuggestions([]);
      setAltOpen(true);
      return;
    }
    setAltBusy(true);
    try {
      const sug = runRuleBasedGeneticAlgorithm({
        universe,
        sectionId: first.sectionId,
        subjectId: first.subjectId,
        academicPeriodId: first.academicPeriodId,
        roomIds,
        instructorIds,
        generations: 40,
        populationSize: 56,
      });
      setAltSuggestions(sug);
      setAltOpen(true);
    } finally {
      setAltBusy(false);
    }
  }

  /* —— Hub: college tiles —— */
  if (!collegeSlug) {
    return (
      <div>
        <ChairmanPageHeader
          title="Central Hub Evaluator"
          subtitle="High-level view of today's academic activity and room usage."
        />
        <div className="px-4 md:px-8 pb-12 max-w-4xl mx-auto">
          <HubEvaluatorTabs basePath={basePath} collegeSlug={null} panel="timetabling" />
          <p className="text-[14px] text-black/70 mb-8 text-center">
            Campus-wide scope — select one college or <strong>all colleges</strong> to search and filter by department.
          </p>
          <div className="mb-4 flex justify-center">
            <Link
              href={`${basePath}?college=${CAMPUS_WIDE_COLLEGE_SLUG}`}
              className="inline-flex items-center justify-center min-h-[56px] rounded-[20px] bg-[#780301] text-white font-bold text-[14px] px-8 py-3 shadow-[0px_4px_4px_rgba(0,0,0,0.15)] hover:brightness-110 transition-[filter]"
            >
              All colleges (campus-wide timetable)
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {CENTRAL_HUB_COLLEGES.slice(0, 4).map((c) => (
              <Link
                key={c.slug}
                href={`${basePath}?college=${c.slug}`}
                className="flex items-center justify-center min-h-[72px] rounded-[20px] bg-[#ff990a] text-white font-bold text-[15px] text-center px-6 py-5 shadow-[0px_4px_4px_rgba(0,0,0,0.15)] hover:brightness-105 transition-[filter]"
              >
                {c.name}
              </Link>
            ))}
          </div>
          {CENTRAL_HUB_COLLEGES[4] ? (
            <div className="flex justify-center mt-5">
              <Link
                href={`${basePath}?college=${CENTRAL_HUB_COLLEGES[4]!.slug}`}
                className="flex items-center justify-center w-full sm:max-w-[calc(50%-10px)] min-h-[72px] rounded-[20px] bg-[#ff990a] text-white font-bold text-[15px] text-center px-6 py-5 shadow-[0px_4px_4px_rgba(0,0,0,0.15)] hover:brightness-105 transition-[filter]"
              >
                {CENTRAL_HUB_COLLEGES[4]!.name}
              </Link>
            </div>
          ) : null}
          <p className="text-[12px] text-black/45 mt-8 text-center">
            College Admin, CAS Admin, and DOI Admin use this hub to review schedules across colleges.
          </p>
        </div>
      </div>
    );
  }

  if (collegeSlug && !isCampusWide && !hub) {
    return (
      <div>
        <ChairmanPageHeader title="Central Hub Evaluator" subtitle="Invalid college selection." />
        <div className="px-4 md:px-8 pb-8">
          <Link href={basePath} className="text-[13px] font-semibold text-[#780301] hover:underline">
            ← Back to college hub
          </Link>
        </div>
      </div>
    );
  }

  if (!isCampusWide && hub && !hub.collegeId) {
    return (
      <div>
        <ChairmanPageHeader title="Central Hub Evaluator" subtitle={hub.name} />
        <div className="px-4 md:px-8 pb-8">
          <Link href={basePath} className="text-[13px] font-semibold text-[#780301] hover:underline mb-4 inline-block">
            ← All colleges
          </Link>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-[14px] text-amber-950">
            <strong>{hub.abbr}</strong> is not linked to database rows yet. Add this college in Supabase{" "}
            <code className="text-xs bg-white/80 px-1 rounded">public.&quot;College&quot;</code> and set{" "}
            <code className="text-xs bg-white/80 px-1">collegeId</code> in{" "}
            <code className="text-xs bg-white/80 px-1">lib/evaluator-central-hub.ts</code>.
          </div>
        </div>
      </div>
    );
  }

  const collegeRow = scopeCollegeId ? colleges.find((c) => c.id === scopeCollegeId) : null;

  return (
    <div>
      <ChairmanPageHeader
        title="Central Hub Evaluator"
        subtitle="Campus-wide data — narrow by college and department (program)."
      />

      <div className="px-4 md:px-8 pb-8">
        <HubEvaluatorTabs basePath={basePath} collegeSlug={collegeSlug} panel={panel} />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Link href={basePath} className="text-[13px] font-semibold text-[#780301] hover:underline">
            ← College hub
          </Link>
          <span className="text-[13px] text-black/55">
            Scope:{" "}
            <strong className="text-black/80">
              {isCampusWide ? "All colleges (campus-wide)" : collegeRow?.name ?? hub?.name ?? "—"}
            </strong>
          </span>
        </div>

        {panel === "timetabling" ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <label className="block min-w-[200px]">
                <span className="text-[13px] font-semibold text-black/70">College</span>
                <select
                  className="mt-1 w-full h-11 rounded-lg border border-black/25 bg-white px-3 text-sm shadow-sm"
                  value={
                    isCampusWide
                      ? CAMPUS_WIDE_COLLEGE_SLUG
                      : scopeCollegeId
                        ? hubSlugForCollegeId(scopeCollegeId) ?? collegeSlug ?? ""
                        : collegeSlug ?? ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    const keepHrs = searchParams.get("panel") === "hrs";
                    const q = keepHrs ? "&panel=hrs" : "";
                    router.replace(`${basePath}?college=${encodeURIComponent(v)}${q}`);
                  }}
                >
                  <option value={CAMPUS_WIDE_COLLEGE_SLUG}>All colleges (campus-wide)</option>
                  {CENTRAL_HUB_COLLEGES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.abbr} — {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-[200px]">
                <span className="text-[13px] font-semibold text-black/70">Department (program)</span>
                <select
                  className="mt-1 w-full h-11 rounded-lg border border-black/25 bg-white px-3 text-sm shadow-sm"
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                >
                  <option value="">All departments</option>
                  {programsInCollege.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <div className="flex flex-wrap gap-3 items-center">
                <label className="text-[13px] font-semibold text-black/70">
                  Term
                  <select
                    className="ml-2 h-11 rounded-lg border border-black/25 bg-white px-3 text-sm"
                    value={academicPeriodId}
                    onChange={(e) => setAcademicPeriodId(e.target.value)}
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold h-11 px-5"
                  disabled={altBusy || loading}
                  onClick={() => runAlternativeSuggestion()}
                >
                  {altBusy ? "Working…" : "Alternative Suggestion"}
                </Button>
              </div>
            </div>

            {loadError ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{loadError}</div>
            ) : loading ? (
              <div className="text-sm text-black/60 py-8">Loading schedule…</div>
            ) : (
              <EvaluatorScheduleOverviewTable rows={tableRows} showCollegeColumn={isCampusWide} />
            )}

            {altOpen ? (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
                <div
                  className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-black/10"
                  role="dialog"
                  aria-modal="true"
                >
                  <h2 className="text-lg font-semibold mb-2">Alternative suggestions</h2>
                  <p className="text-sm text-black/65 mb-4">
                    Rule-based optimization for the first scheduled row in this college (same engine as the Chairman
                    plotter).
                  </p>
                  {altSuggestions.length === 0 ? (
                    <p className="text-sm text-black/55">No suggestions returned. Add rooms, faculty, and schedule rows.</p>
                  ) : (
                    <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
                      {altSuggestions.slice(0, 6).map((s, i) => (
                        <li key={i} className="border border-black/10 rounded-md p-2">
                          {s.label}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex justify-end mt-6">
                    <Button type="button" variant="outline" onClick={() => setAltOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : panel === "hrs" ? (
          <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
            <div className="p-4 border-b border-black/10">
              <div className="text-[16px] font-semibold">Hrs · Units · Preps · Remarks</div>
              <div className="text-[12px] text-black/60 mt-1">Institutional load policy summary (sample rows).</div>
            </div>
            <div className="overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#ff990a] text-white text-[11px]">
                    <th className="border border-black/10 px-2 py-2 text-left">Faculty Name</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Hours/Week</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Preps</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Units</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Designation</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Status</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Rate per Hour</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleLoadRows.map((r) => (
                    <tr key={r.faculty} className="text-[11px]">
                      <td className="border border-black/10 px-2 py-2 font-semibold">{r.faculty}</td>
                      <td className="border border-black/10 px-2 py-2">{r.hours}</td>
                      <td className="border border-black/10 px-2 py-2">{r.preps}</td>
                      <td className="border border-black/10 px-2 py-2">{r.units}</td>
                      <td className="border border-black/10 px-2 py-2">{r.designation}</td>
                      <td className="border border-black/10 px-2 py-2">{r.status}</td>
                      <td className="border border-black/10 px-2 py-2">₱{r.rate}</td>
                      <td className="border border-black/10 px-2 py-2">
                        <span className={`px-2 py-1 rounded-md font-semibold ${remarkClass(r.remark)}`}>{r.remark}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
