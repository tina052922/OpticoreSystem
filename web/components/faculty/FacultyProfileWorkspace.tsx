"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GEC_VACANT_INSTRUCTOR_USER_ID, isGecCurriculumSubjectCode } from "@/lib/gec/gec-vacant";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Q } from "@/lib/supabase/catalog-columns";
import type { FacultyProfile, Program, Section, User } from "@/types/db";

/**
 * Chairman adds faculty here with **Employee ID** before (or while) plotting. That creates `User` + `FacultyProfile`
 * without Auth; `User.email` is a unique placeholder until self-registration (see `register-instructor` API).
 * The Evaluator assigns `ScheduleEntry.instructorId` to that `User.id`. Self-registration with the same Employee ID
 * links Auth and schedules.
 */

export type FacultyProfileWorkspaceProps = {
  chairmanCollegeId?: string | null;
  chairmanProgramCode?: string | null;
  viewerCollegeId?: string | null;
  /** From `FacultyProfileWithScope` + CampusScopeFilters */
  scopeCollegeId?: string | null;
  /** Chairman Faculty Profile page: edit status & designation on list rows (updates evaluator load rules). */
  enableFacultyListEdit?: boolean;
  /**
   * GEC Chairman: show instructors who teach at least one GEC/GEE course (or have no plots yet).
   * Excludes faculty who only appear on major (non-GEC) schedules, and the vacant-slot placeholder user.
   */
  gecFacultyFilter?: boolean;
};

type ListRow = {
  user: Pick<User, "id" | "name" | "employeeId">;
  profile: FacultyProfile | null;
};

export function FacultyProfileWorkspace({
  chairmanCollegeId = null,
  chairmanProgramCode = null,
  viewerCollegeId = null,
  scopeCollegeId = null,
  enableFacultyListEdit = false,
  gecFacultyFilter = false,
}: FacultyProfileWorkspaceProps) {
  const collegeId = chairmanCollegeId ?? viewerCollegeId ?? scopeCollegeId ?? null;
  const programLabel = chairmanProgramCode ?? "—";

  const [tab, setTab] = useState<"profile" | "designation" | "advisory">("profile");

  const [employeeId, setEmployeeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [aka, setAka] = useState("");
  const [bsDegree, setBsDegree] = useState("");
  const [msDegree, setMsDegree] = useState("");
  const [doctoralDegree, setDoctoralDegree] = useState("");
  const [major1, setMajor1] = useState("");
  const [major2, setMajor2] = useState("");
  const [major3, setMajor3] = useState("");
  const [minor1, setMinor1] = useState("");
  const [minor2, setMinor2] = useState("");
  const [minor3, setMinor3] = useState("");
  const [research, setResearch] = useState("");
  const [extension, setExtension] = useState("");
  const [production, setProduction] = useState("");
  const [specialTraining, setSpecialTraining] = useState("");
  const [status, setStatus] = useState("Organic");
  const [designation, setDesignation] = useState("");
  const [advisorySectionId, setAdvisorySectionId] = useState("");

  const [rows, setRows] = useState<ListRow[]>([]);
  const [facultyListSearch, setFacultyListSearch] = useState("");
  const [editState, setEditState] = useState<
    Record<string, { status: string; designation: string; advisorySectionId: string }>
  >({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  const loadFaculty = useCallback(async () => {
    if (!collegeId) {
      setRows([]);
      setSections([]);
      setPrograms([]);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setLoadingList(true);
    setError(null);
    const { data: users, error: uErr } = await supabase
      .from("User")
      .select("id, name, employeeId, role")
      .eq("collegeId", collegeId)
      .eq("role", "instructor");
    if (uErr) {
      setLoadingList(false);
      setError(uErr.message);
      return;
    }
    let list = (users ?? []) as Pick<User, "id" | "name" | "employeeId" | "role">[];
    if (list.length === 0) {
      setRows([]);
      setLoadingList(false);
      return;
    }

    if (gecFacultyFilter) {
      list = list.filter((u) => u.id !== GEC_VACANT_INSTRUCTOR_USER_ID);
      const idsForScope = list.map((u) => u.id);
      const { data: seRows } = await supabase
        .from("ScheduleEntry")
        .select("instructorId, subjectId")
        .in("instructorId", idsForScope);
      const subIds = [...new Set((seRows ?? []).map((r) => r.subjectId).filter(Boolean))] as string[];
      const codeById = new Map<string, string>();
      if (subIds.length > 0) {
        const { data: subs } = await supabase.from("Subject").select("id, code").in("id", subIds);
        for (const s of subs ?? []) codeById.set(s.id, s.code);
      }
      const byInst = new Map<string, { any: boolean; gec: boolean }>();
      for (const u of list) byInst.set(u.id, { any: false, gec: false });
      for (const r of seRows ?? []) {
        const code = codeById.get(r.subjectId) ?? "";
        const cur = byInst.get(r.instructorId);
        if (!cur) continue;
        cur.any = true;
        if (isGecCurriculumSubjectCode(code)) cur.gec = true;
      }
      list = list.filter((u) => {
        const st = byInst.get(u.id);
        if (!st) return true;
        if (!st.any) return true;
        return st.gec;
      });
    }

    const ids = list.map((u) => u.id);
    const [profsRes, progRes] = await Promise.all([
      supabase.from("FacultyProfile").select(Q.facultyProfileRow).in("userId", ids),
      supabase.from("Program").select(Q.program).eq("collegeId", collegeId).order("name"),
    ]);
    setLoadingList(false);
    if (profsRes.error) {
      setError(profsRes.error.message);
      return;
    }
    if (progRes.error) {
      setError(progRes.error.message);
      return;
    }
    setPrograms((progRes.data ?? []) as Program[]);

    const programIds = (progRes.data ?? []).map((p) => p.id);
    const secRes =
      programIds.length > 0
        ? await supabase.from("Section").select(Q.section).in("programId", programIds).order("name")
        : { data: [] as Section[], error: null };
    if (secRes.error) {
      setError(secRes.error.message);
      return;
    }
    setSections((secRes.data ?? []) as Section[]);

    const byUser = new Map((profsRes.data as FacultyProfile[] | null)?.map((p) => [p.userId, p]) ?? []);
    setRows(
      list.map((u) => ({
        user: { id: u.id, name: u.name, employeeId: u.employeeId },
        profile: byUser.get(u.id) ?? null,
      })),
    );
  }, [collegeId, gecFacultyFilter]);

  useEffect(() => {
    void loadFaculty();
  }, [loadFaculty]);

  useEffect(() => {
    setEditState((prev) => {
      const next = { ...prev };
      for (const { user, profile } of rows) {
        next[user.id] = {
          status: profile?.status ?? "Organic",
          designation: profile?.designation ?? "",
          advisorySectionId: profile?.advisorySectionId ?? "",
        };
      }
      return next;
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = facultyListSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(({ user, profile }) => {
      const name = (profile?.fullName ?? user.name).toLowerCase();
      const st = (profile?.status ?? "").toLowerCase();
      const des = (profile?.designation ?? "").toLowerCase();
      const eid = (user.employeeId ?? "").toLowerCase();
      return name.includes(q) || st.includes(q) || des.includes(q) || eid.includes(q);
    });
  }, [rows, facultyListSearch]);

  async function saveFacultyEdits(userId: string) {
    setError(null);
    setSuccess(null);
    const draft = editState[userId];
    if (!draft || !collegeId) return;
    const row = rows.find((r) => r.user.id === userId);
    if (!row) return;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setSavingRowId(userId);
    const name = row.profile?.fullName ?? row.user.name;
    const statusVal = draft.status.trim() || null;
    const designationVal = draft.designation.trim() || null;
    const advisorySectionIdVal = draft.advisorySectionId.trim() || null;

    if (row.profile) {
      const { error: uErr } = await supabase
        .from("FacultyProfile")
        .update({ status: statusVal, designation: designationVal, advisorySectionId: advisorySectionIdVal })
        .eq("id", row.profile.id);
      setSavingRowId(null);
      if (uErr) {
        setError(uErr.message);
        return;
      }
    } else {
      const { error: insErr } = await supabase.from("FacultyProfile").insert({
        userId,
        fullName: name,
        status: statusVal,
        designation: designationVal,
        advisorySectionId: advisorySectionIdVal,
        ratePerHour: null,
      });
      setSavingRowId(null);
      if (insErr) {
        setError(insErr.message);
        return;
      }
    }

    setSuccess("Faculty details updated.");
    void loadFaculty();
  }

  function placeholderEmailForPendingUser(userId: string) {
    return `pending.${userId}@opticore.local`.toLowerCase();
  }

  async function assertNoDuplicateFaculty(supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>) {
    const eid = employeeId.trim();
    if (!eid) return "Employee ID is required.";

    const { data: byEid } = await supabase.from("User").select("id").eq("employeeId", eid).maybeSingle();
    if (byEid) return "Faculty already exists.";

    const nameKey = fullName.trim().toLowerCase();
    if (nameKey) {
      const { data: instructors } = await supabase
        .from("User")
        .select("id, name")
        .eq("collegeId", collegeId!)
        .eq("role", "instructor");
      const instList = instructors ?? [];
      const hitName = instList.some((u: { name: string }) => u.name.trim().toLowerCase() === nameKey);
      if (hitName) return "Faculty already exists.";

      const instIds = instList.map((u: { id: string }) => u.id);
      if (instIds.length > 0) {
        const { data: profiles } = await supabase.from("FacultyProfile").select("fullName").in("userId", instIds);
        const hitProfile = (profiles ?? []).some(
          (p: { fullName: string }) => p.fullName.trim().toLowerCase() === nameKey,
        );
        if (hitProfile) return "Faculty already exists.";
      }
    }

    return null;
  }

  async function onAddFaculty() {
    setError(null);
    setSuccess(null);
    if (!collegeId) {
      setError("Select your college scope (or sign in as Chairman) before adding faculty.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const dupMsg = await assertNoDuplicateFaculty(supabase);
    if (dupMsg) {
      setError(dupMsg);
      return;
    }

    const nameTrim = fullName.trim();
    if (!nameTrim) {
      setError("Full Name is required.");
      return;
    }

    setSaving(true);
    const id = crypto.randomUUID();
    const payloadUser = {
      id,
      email: placeholderEmailForPendingUser(id),
      name: nameTrim,
      role: "instructor" as const,
      collegeId,
      employeeId: employeeId.trim() || null,
    };

    const { error: uIns } = await supabase.from("User").insert(payloadUser);
    if (uIns) {
      setSaving(false);
      if (uIns.code === "23505") {
        setError("Faculty already exists.");
      } else {
        setError(uIns.message);
      }
      return;
    }

    const { error: pIns } = await supabase.from("FacultyProfile").insert({
      userId: id,
      fullName: nameTrim,
      aka: aka.trim() || null,
      advisorySectionId: advisorySectionId.trim() || null,
      bsDegree: bsDegree.trim() || null,
      msDegree: msDegree.trim() || null,
      doctoralDegree: doctoralDegree.trim() || null,
      major1: major1.trim() || null,
      major2: major2.trim() || null,
      major3: major3.trim() || null,
      minor1: minor1.trim() || null,
      minor2: minor2.trim() || null,
      minor3: minor3.trim() || null,
      research: research.trim() || null,
      extension: extension.trim() || null,
      production: production.trim() || null,
      specialTraining: specialTraining.trim() || null,
      status: status.trim() || null,
      designation: designation.trim() || null,
      ratePerHour: null,
    });

    if (pIns) {
      await supabase.from("User").delete().eq("id", id);
      setSaving(false);
      if (pIns.code === "23505") {
        setError("Faculty already exists.");
      } else {
        setError(pIns.message);
      }
      return;
    }

    setSaving(false);
    setSuccess("Faculty saved.");
    setEmployeeId("");
    setFullName("");
    setAka("");
    setBsDegree("");
    setMsDegree("");
    setDoctoralDegree("");
    setMajor1("");
    setMajor2("");
    setMajor3("");
    setMinor1("");
    setMinor2("");
    setMinor3("");
    setResearch("");
    setExtension("");
    setProduction("");
    setSpecialTraining("");
    setStatus("Organic");
    setDesignation("");
    setAdvisorySectionId("");
    void loadFaculty();
  }

  const sectionNameById = useMemo(() => {
    const m = new Map<string, string>();
    sections.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [sections]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 space-y-6 max-h-[min(85vh,1200px)] overflow-y-auto">
      {gecFacultyFilter ? (
        <div className="rounded-xl border border-[var(--color-opticore-orange)]/35 bg-orange-50/90 px-4 py-3 text-sm text-black/80">
          <strong className="text-[var(--color-opticore-orange)]">GEC scope.</strong> Listed faculty either have no
          plots yet (eligible for GEC assignment) or teach at least one GEC/GEE course. Major-only instructors are
          hidden. Plotting non-GEC courses stays with the Program Chairman.
        </div>
      ) : null}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { id: "profile" as const, label: "Faculty Profile" },
            { id: "designation" as const, label: "Designation" },
            { id: "advisory" as const, label: "Advisory" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`h-10 px-4 rounded-[15px] font-bold text-[14px] ${
                tab === t.id ? "bg-[#ff990a] text-white" : "bg-white text-black border border-black/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "profile" ? (
          <Button
            type="button"
            className="bg-[#ff990a] text-white hover:bg-[#e68a09]"
            disabled={saving || !collegeId}
            onClick={() => void onAddFaculty()}
          >
            + Add Faculty
          </Button>
        ) : null}
      </div>

      {tab === "profile" || tab === "designation" ? (
        <div className="bg-white rounded-xl border border-black/10 p-4 shadow-[0px_2px_4px_rgba(0,0,0,0.06)]">
          <div className="w-full max-w-md space-y-1">
            <div className="text-[11px] font-medium text-black/60">Search faculty</div>
            <Input
              placeholder="Name, status, designation, employee ID…"
              value={facultyListSearch}
              onChange={(e) => setFacultyListSearch(e.target.value)}
              disabled={!collegeId}
              className="h-9 text-sm border-black/20 focus-visible:ring-[#ff990a]/40"
            />
          </div>
        </div>
      ) : null}

      {tab === "profile" ? (
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6">
          {!collegeId ? (
            <p className="text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Set college scope using the bar above (campus pages) or open this page as Chairman / College Admin with a
              linked college.
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>
          ) : null}
          {success ? (
            <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4">
              {success}
            </p>
          ) : null}

          <div className="text-[16px] font-semibold mb-3">New faculty</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <div className="space-y-1">
              <div className="text-sm font-medium">Employee ID</div>
              <Input
                placeholder="Required; must match self-registration"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Full Name</div>
              <Input placeholder="Juan Dela Cruz" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">A.K.A.</div>
              <Input placeholder="Juan" value={aka} onChange={(e) => setAka(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">BS Degree</div>
              <Input placeholder="BS Information Technology" value={bsDegree} onChange={(e) => setBsDegree(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">MS Degree</div>
              <Input value={msDegree} onChange={(e) => setMsDegree(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Doctoral Degree</div>
              <Input value={doctoralDegree} onChange={(e) => setDoctoralDegree(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Major 1</div>
              <Input placeholder="Software Engineering" value={major1} onChange={(e) => setMajor1(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Major 2</div>
              <Input value={major2} onChange={(e) => setMajor2(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Major 3</div>
              <Input value={major3} onChange={(e) => setMajor3(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Minor 1</div>
              <Input placeholder="Web Development" value={minor1} onChange={(e) => setMinor1(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Minor 2</div>
              <Input value={minor2} onChange={(e) => setMinor2(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Minor 3</div>
              <Input value={minor3} onChange={(e) => setMinor3(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Research</div>
              <Input value={research} onChange={(e) => setResearch(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Extension</div>
              <Input value={extension} onChange={(e) => setExtension(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Production</div>
              <Input value={production} onChange={(e) => setProduction(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Special Training</div>
              <Input value={specialTraining} onChange={(e) => setSpecialTraining(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Status</div>
              <Input value={status} onChange={(e) => setStatus(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Administrative Designation</div>
              <Input placeholder="Instructor I" value={designation} onChange={(e) => setDesignation(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Advisory (Assigned Section)</div>
              <select
                className="h-10 w-full rounded-md border border-black/25 bg-white px-2 text-[12px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40 disabled:opacity-60"
                value={advisorySectionId}
                onChange={(e) => setAdvisorySectionId(e.target.value)}
                disabled={!collegeId}
              >
                <option value="">— None —</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-black/50 leading-relaxed">
                Saved on the faculty profile as <code className="bg-black/[0.04] px-1 rounded">advisorySectionId</code>.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="text-[16px] font-semibold">Faculty List {loadingList ? "· Loading…" : ""}</div>
            {enableFacultyListEdit ? (
              <p className="text-[12px] text-black/55">
                Status (Organic / Part-time) and designation drive teaching caps in the Evaluator policy engine (part-time
                weekly limits and designation-based caps).
              </p>
            ) : null}
            <div className="overflow-auto rounded-xl border border-black/10">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#ff990a] text-white text-[11px]">
                    <th className="border border-black/10 px-2 py-2 text-left">Name</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Employee ID</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Status</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Designation</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Advisory</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Program</th>
                    {enableFacultyListEdit ? (
                      <th className="border border-black/10 px-2 py-2 text-left w-28">Save</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="text-[12px]">
                  {!collegeId ? (
                    <tr>
                      <td
                        colSpan={enableFacultyListEdit ? 7 : 6}
                        className="border border-black/10 px-2 py-6 text-center text-black/45"
                      >
                        No college in scope.
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={enableFacultyListEdit ? 7 : 6}
                        className="border border-black/10 px-2 py-6 text-center text-black/45"
                      >
                        No instructors in the database for this college yet.
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={enableFacultyListEdit ? 7 : 6}
                        className="border border-black/10 px-2 py-6 text-center text-black/45"
                      >
                        No faculty match &quot;{facultyListSearch.trim()}&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(({ user, profile }) => {
                      const draft = editState[user.id] ?? {
                        status: profile?.status ?? "Organic",
                        designation: profile?.designation ?? "",
                        advisorySectionId: profile?.advisorySectionId ?? "",
                      };
                      return (
                        <tr key={user.id}>
                          <td className="border border-black/10 px-2 py-2">{profile?.fullName ?? user.name}</td>
                          <td className="border border-black/10 px-2 py-2 tabular-nums">{user.employeeId ?? "—"}</td>
                          <td className="border border-black/10 px-2 py-2 align-top">
                            {enableFacultyListEdit ? (
                              <select
                                className="w-full min-h-9 rounded-md border border-gray-300 bg-white px-2 text-[12px] focus-visible:ring-2 focus-visible:ring-[#ff990a]/40"
                                value={draft.status}
                                onChange={(e) =>
                                  setEditState((s) => ({
                                    ...s,
                                    [user.id]: { ...draft, status: e.target.value },
                                  }))
                                }
                              >
                                <option value="Organic">Organic</option>
                                <option value="Part-time">Part-time</option>
                                <option value="Permanent">Permanent</option>
                              </select>
                            ) : (
                              (profile?.status ?? "—")
                            )}
                          </td>
                          <td className="border border-black/10 px-2 py-2 align-top">
                            {enableFacultyListEdit ? (
                              <Input
                                className="h-9 text-[12px]"
                                placeholder="e.g. Instructor I"
                                value={draft.designation}
                                onChange={(e) =>
                                  setEditState((s) => ({
                                    ...s,
                                    [user.id]: { ...draft, designation: e.target.value },
                                  }))
                                }
                              />
                            ) : (
                              (profile?.designation ?? "—")
                            )}
                          </td>
                          <td className="border border-black/10 px-2 py-2 align-top">
                            {enableFacultyListEdit ? (
                              <select
                                className="w-full min-h-9 rounded-md border border-gray-300 bg-white px-2 text-[12px] focus-visible:ring-2 focus-visible:ring-[#ff990a]/40"
                                value={draft.advisorySectionId}
                                onChange={(e) =>
                                  setEditState((s) => ({
                                    ...s,
                                    [user.id]: { ...draft, advisorySectionId: e.target.value },
                                  }))
                                }
                              >
                                <option value="">— None —</option>
                                {sections.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            ) : profile?.advisorySectionId ? (
                              (sectionNameById.get(profile.advisorySectionId) ?? "—")
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="border border-black/10 px-2 py-2">{programLabel}</td>
                          {enableFacultyListEdit ? (
                            <td className="border border-black/10 px-2 py-2">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-[#ff990a] text-white hover:bg-[#e68a09] h-8 text-[11px]"
                                disabled={savingRowId === user.id}
                                onClick={() => void saveFacultyEdits(user.id)}
                              >
                                {savingRowId === user.id ? "…" : "Save"}
                              </Button>
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
        </div>
      ) : null}

      {tab === "designation" ? (
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6">
          <div className="text-[16px] font-semibold mb-3">Designations</div>
          <div className="overflow-auto rounded-xl border border-black/10">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#ff990a] text-white text-[11px]">
                  <th className="border border-black/10 px-2 py-2 text-left">Faculty</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Designation</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Effective</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="border border-black/10 px-2 py-6 text-center text-black/45">
                      {rows.length === 0 ? "No data — add faculty on the Profile tab." : "No rows match your search."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr key={r.user.id}>
                      <td className="border border-black/10 px-2 py-2">{r.profile?.fullName ?? r.user.name}</td>
                      <td className="border border-black/10 px-2 py-2">{r.profile?.designation ?? "—"}</td>
                      <td className="border border-black/10 px-2 py-2">—</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "advisory" ? (
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6">
          <div className="text-[16px] font-semibold mb-3">Advisory Assignments</div>
          <div className="overflow-auto rounded-xl border border-black/10">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#ff990a] text-white text-[11px]">
                  <th className="border border-black/10 px-2 py-2 text-left">Adviser</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Section</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Students</th>
                  {enableFacultyListEdit ? (
                    <th className="border border-black/10 px-2 py-2 text-left w-28">Save</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={enableFacultyListEdit ? 4 : 3}
                      className="border border-black/10 px-2 py-6 text-center text-black/45"
                    >
                      {rows.length === 0 ? "No data — add faculty on the Profile tab." : "No rows match your search."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(({ user, profile }) => {
                    const draft = editState[user.id] ?? {
                      status: profile?.status ?? "Organic",
                      designation: profile?.designation ?? "",
                      advisorySectionId: profile?.advisorySectionId ?? "",
                    };
                    const sec = draft.advisorySectionId ? sections.find((s) => s.id === draft.advisorySectionId) : null;
                    return (
                      <tr key={user.id}>
                        <td className="border border-black/10 px-2 py-2">{profile?.fullName ?? user.name}</td>
                        <td className="border border-black/10 px-2 py-2 align-top">
                          {enableFacultyListEdit ? (
                            <select
                              className="w-full min-h-9 rounded-md border border-gray-300 bg-white px-2 text-[12px] focus-visible:ring-2 focus-visible:ring-[#ff990a]/40"
                              value={draft.advisorySectionId}
                              onChange={(e) =>
                                setEditState((s) => ({
                                  ...s,
                                  [user.id]: { ...draft, advisorySectionId: e.target.value },
                                }))
                              }
                            >
                              <option value="">— None —</option>
                              {sections.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          ) : profile?.advisorySectionId ? (
                            (sectionNameById.get(profile.advisorySectionId) ?? "—")
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="border border-black/10 px-2 py-2 tabular-nums">{sec?.studentCount ?? "—"}</td>
                        {enableFacultyListEdit ? (
                          <td className="border border-black/10 px-2 py-2">
                            <Button
                              type="button"
                              size="sm"
                              className="bg-[#ff990a] text-white hover:bg-[#e68a09] h-8 text-[11px]"
                              disabled={savingRowId === user.id}
                              onClick={() => void saveFacultyEdits(user.id)}
                            >
                              {savingRowId === user.id ? "…" : "Save"}
                            </Button>
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
      ) : null}
    </div>
  );
}
