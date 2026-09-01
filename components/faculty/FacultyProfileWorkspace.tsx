"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { facultyProfileApi, userAdminApi } from "@/lib/api/client";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";
import type { FacultyProfile, Program, Section, User } from "@/types/db";
import { isPlottableFacultyUser } from "@/lib/auth/instructor-validation";
import { computeRatePerHour, DESIGNATION_POLICIES, getDesignationPolicyByLabel } from "@/lib/faculty/designation-system";
import { useSystemConfigurationOptional } from "@/contexts/SystemConfigurationContext";
import { resolveHourlyRates } from "@/lib/system-configuration/scheduling-policy";
import {
  FACULTY_EMPLOYMENT_ORGANIC,
  FACULTY_EMPLOYMENT_PART_TIME,
  normalizeFacultyProfileStatus,
} from "@/lib/faculty/employment-status";

/**
 * Chairman adds faculty here with **Employee ID** before (or while) plotting. That creates `User` + `FacultyProfile`
 * without Auth; `User.email` is a unique placeholder until self-registration (see `register-instructor` API).
 * The Evaluator assigns `ScheduleEntry.instructorId` to that `User.id`. Self-registration with the same Employee ID
 * links Auth and schedules.
 */

export type FacultyProfileWorkspaceProps = {
  chairmanCollegeId?: string | null;
  chairmanProgramId?: string | null;
  chairmanProgramCode?: string | null;
  viewerCollegeId?: string | null;
  /** From `FacultyProfileWithScope` + CampusScopeFilters */
  scopeCollegeId?: string | null;
  /** When set, list only faculty with teaching or advisory activity in this program. */
  scopeProgramId?: string | null;
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
  chairmanProgramId = null,
  chairmanProgramCode = null,
  viewerCollegeId = null,
  scopeCollegeId = null,
  scopeProgramId = null,
  enableFacultyListEdit = false,
  gecFacultyFilter = false,
}: FacultyProfileWorkspaceProps) {
  const collegeId = chairmanCollegeId ?? viewerCollegeId ?? scopeCollegeId ?? null;
  const programLabel = chairmanProgramCode ?? "—";
  const systemConfig = useSystemConfigurationOptional();
  const hourlyRateOverrides = useMemo(() => {
    const r = resolveHourlyRates(systemConfig?.schedulingPolicy ?? null);
    return { doctorate: r.DOCTORATE, masters: r.MASTERS, baccalaureate: r.BACCALAUREATE };
  }, [systemConfig?.schedulingPolicy]);
  const ratePerHourByDesignation = systemConfig?.schedulingPolicy?.ratePerHourByDesignation ?? null;

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
  const [status, setStatus] = useState<typeof FACULTY_EMPLOYMENT_ORGANIC | typeof FACULTY_EMPLOYMENT_PART_TIME>(
    FACULTY_EMPLOYMENT_ORGANIC,
  );
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
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
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
    setLoadingList(true);
    setError(null);

    let users: Pick<User, "id" | "name" | "employeeId">[] = [];
    try {
      const { apiFetch } = await import("@/lib/api/client");
      const data = await apiFetch<{
        users: Array<
          Pick<User, "id" | "name" | "employeeId" | "role" | "chairmanProgramId" | "instructorValidation">
        >;
      }>(
        `/api/catalog/users?collegeId=${collegeId}`,
        { method: "GET", forceRefresh: true },
      );
      users = data.users
        .filter((u) => {
          if (u.role !== "instructor" || !isPlottableFacultyUser(u)) return false;
          const home = String(u.chairmanProgramId ?? "").trim();
          const locked = String(chairmanProgramId ?? "").trim();
          if (locked && home && home !== locked) return false;
          return true;
        })
        .map((u) => ({ id: u.id, name: u.name, employeeId: u.employeeId }));
    } catch {
      setLoadingList(false);
      return;
    }
    let list = (users ?? []) as Pick<User, "id" | "name" | "employeeId" | "role">[];
    if (list.length === 0) {
      setRows([]);
      setLoadingList(false);
      return;
    }

    // GEC filter removed — requires Supabase catalog queries

    const ids = list.map((u) => u.id);

    let profs: FacultyProfile[] = [];
    let programs: Program[] = [];
    let sections: Section[] = [];

    try {
      const { apiFetch } = await import("@/lib/api/client");
      const idsParam = ids.join(",");
      const [profsData, progsData] = await Promise.all([
        apiFetch<{ profiles: FacultyProfile[] }>(
          `/api/catalog/faculty-profiles?ids=${idsParam}`,
          { method: "GET" },
        ),
        apiFetch<{ programs: Program[] }>(
          `/api/catalog/programs?collegeId=${collegeId}`,
          { method: "GET" },
        ),
      ]);
      profs = profsData.profiles;
      programs = progsData.programs;

      const progIds = programs.map((p) => p.id);
      if (progIds.length > 0) {
        try {
          const secData = await apiFetch<{ sections: Section[] }>(
            `/api/catalog/sections?programId=${progIds.join(",")}`,
            { method: "GET" },
          );
          sections = secData.sections;
        } catch {
          /* sections optional */
        }
      }
    } catch { /* ignore */ }
    setLoadingList(false);
    setPrograms(programs);

    const sectionsScoped = scopeProgramId
      ? sections.filter((s) => s.programId === scopeProgramId)
      : sections;
    setSections(sectionsScoped);

    const byUser = new Map(profs.map((p) => [p.userId, p]));

    if (scopeProgramId) {
      const secIds = new Set(sectionsScoped.map((s) => s.id));
      if (secIds.size === 0) {
        setRows([]);
        return;
      }
      // Keep instructors with advisory in the program,
      // or instructors with no advisory section (may teach in the program)
      list = list.filter((u) => {
        const fp = byUser.get(u.id);
        const adv = fp?.advisorySectionId;
        if (!adv) return true;
        return secIds.has(adv);
      });
    }

    setRows(
      list.map((u) => ({
        user: { id: u.id, name: u.name, employeeId: u.employeeId },
        profile: byUser.get(u.id) ?? null,
      })),
    );
  }, [collegeId, scopeProgramId, chairmanProgramId]);

  useEffect(() => {
    void loadFaculty();
  }, [loadFaculty]);

  useEffect(() => {
    setEditState((prev) => {
      const next = { ...prev };
      for (const { user, profile } of rows) {
        next[user.id] = {
          status: normalizeFacultyProfileStatus(profile?.status),
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
      const st = normalizeFacultyProfileStatus(profile?.status).toLowerCase();
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

    const name = row.profile?.fullName ?? row.user.name;
    const statusVal = normalizeFacultyProfileStatus(draft.status);
    const designationVal = draft.designation.trim() || null;
    const advisorySectionIdVal = draft.advisorySectionId.trim() || null;
    const ratePerHourVal = row.profile
      ? computeRatePerHour(row.profile, hourlyRateOverrides, ratePerHourByDesignation)
      : null;

    try {
      if (row.profile) {
        await facultyProfileApi.update(row.profile.id, {
          status: statusVal,
          designation: designationVal,
          advisorySectionId: advisorySectionIdVal,
          ratePerHour: ratePerHourVal,
        });
      } else {
        await facultyProfileApi.create({
          userId,
          fullName: name,
          status: statusVal,
          designation: designationVal,
          advisorySectionId: advisorySectionIdVal,
          ratePerHour: null,
        });
      }
    } catch (err) {
      setSavingRowId(null);
      setError(err instanceof Error ? err.message : "Failed to save");
      return;
    }
    setSavingRowId(null);

    setSuccess("Faculty details updated.");
    dispatchInsCatalogReload();
    void loadFaculty();
  }

  function placeholderEmailForPendingUser(userId: string) {
    return `pending.${userId}@opticore.local`.toLowerCase();
  }

  async function assertNoDuplicateFaculty() {
    const eid = employeeId.trim();
    if (!eid) return "Employee ID is required.";
    const { apiFetch } = await import("@/lib/api/client");

    const byEid = await apiFetch<{ users: { id: string }[] }>(
      `/api/catalog/users?employeeId=${encodeURIComponent(eid)}`,
      { method: "GET" },
    ).catch(() => ({ users: [] }));
    if (byEid.users.some((u) => u.id !== editingUserId)) return "Faculty already exists.";

    const nameKey = fullName.trim().toLowerCase();
    if (nameKey && collegeId) {
      const instructors = await apiFetch<{ users: { id: string; name: string }[] }>(
        `/api/catalog/users?collegeId=${collegeId}&role=instructor`,
        { method: "GET" },
      ).catch(() => ({ users: [] }));
      const instList = instructors.users ?? [];
      const hitName = instList.some(
        (u: { id: string; name: string }) =>
          u.id !== editingUserId && u.name.trim().toLowerCase() === nameKey,
      );
      if (hitName) return "Faculty already exists.";

      const instIds = instList.map((u: { id: string }) => u.id);
      if (instIds.length > 0) {
        const profiles = await apiFetch<{ profiles: { fullName: string }[] }>(
          `/api/catalog/faculty-profiles?userIds=${instIds.join(",")}`,
          { method: "GET" },
        ).catch(() => ({ profiles: [] }));
        const hitProfile = (profiles.profiles ?? []).some(
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

    const dupMsg = await assertNoDuplicateFaculty();
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
    if (editingUserId) {
      const computedRateEdit = computeRatePerHour(
        {
          bsDegree: bsDegree.trim() || null,
          msDegree: msDegree.trim() || null,
          doctoralDegree: doctoralDegree.trim() || null,
          designation: designation.trim() || null,
        } as Pick<FacultyProfile, "bsDegree" | "msDegree" | "doctoralDegree" | "designation">,
        hourlyRateOverrides,
        ratePerHourByDesignation,
      );
      const profilePayload = {
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
        status: normalizeFacultyProfileStatus(status),
        designation: designation.trim() || null,
        ratePerHour: computedRateEdit,
      };
      try {
        await userAdminApi.update(editingUserId, {
          name: nameTrim,
          employeeId: employeeId.trim() || null,
        });
        const row = rows.find((r) => r.user.id === editingUserId);
        if (row?.profile) {
          await facultyProfileApi.update(row.profile.id, profilePayload);
        } else {
          await facultyProfileApi.create({ userId: editingUserId, ...profilePayload });
        }
      } catch (err) {
        setSaving(false);
        setError(err instanceof Error ? err.message : "Failed to update faculty.");
        return;
      }
      setSaving(false);
      setSuccess("Faculty updated.");
      resetFacultyForm();
      dispatchInsCatalogReload();
      void loadFaculty();
      return;
    }

    const id = crypto.randomUUID();

    try {
      await userAdminApi.create({
        id,
        email: placeholderEmailForPendingUser(id),
        name: nameTrim,
        role: "instructor",
        collegeId,
        employeeId: employeeId.trim() || null,
        chairmanProgramId: chairmanProgramId || null,
        instructorValidation: "active",
      });
    } catch (err: any) {
      setSaving(false);
      const msg = err?.message ?? "";
      if (msg.includes("duplicate") || msg.includes("already exists") || msg.includes("23505")) {
        setError("Faculty already exists.");
      } else {
        setError(msg);
      }
      return;
    }

    const computedRate = computeRatePerHour(
      {
        bsDegree: bsDegree.trim() || null,
        msDegree: msDegree.trim() || null,
        doctoralDegree: doctoralDegree.trim() || null,
        designation: designation.trim() || null,
      } as Pick<FacultyProfile, "bsDegree" | "msDegree" | "doctoralDegree" | "designation">,
      hourlyRateOverrides,
      ratePerHourByDesignation,
    );

    try {
      await facultyProfileApi.create({
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
        status: normalizeFacultyProfileStatus(status),
        designation: designation.trim() || null,
        ratePerHour: computedRate,
      });
    } catch {
      try { await userAdminApi.delete(id); } catch {}
      setSaving(false);
      setError("Faculty already exists.");
      return;
    }

    setSaving(false);
    setSuccess("Faculty saved.");
    resetFacultyForm();
    dispatchInsCatalogReload();
    void loadFaculty();
  }

  function resetFacultyForm() {
    setEditingUserId(null);
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
    setStatus(FACULTY_EMPLOYMENT_ORGANIC);
    setDesignation("");
    setAdvisorySectionId("");
  }

  function startEditFaculty(row: ListRow) {
    setError(null);
    setSuccess(null);
    setTab("profile");
    setEditingUserId(row.user.id);
    setEmployeeId(row.user.employeeId ?? "");
    setFullName(row.profile?.fullName ?? row.user.name ?? "");
    setAka(row.profile?.aka ?? "");
    setBsDegree(row.profile?.bsDegree ?? "");
    setMsDegree(row.profile?.msDegree ?? "");
    setDoctoralDegree(row.profile?.doctoralDegree ?? "");
    setMajor1(row.profile?.major1 ?? "");
    setMajor2(row.profile?.major2 ?? "");
    setMajor3(row.profile?.major3 ?? "");
    setMinor1(row.profile?.minor1 ?? "");
    setMinor2(row.profile?.minor2 ?? "");
    setMinor3(row.profile?.minor3 ?? "");
    setResearch(row.profile?.research ?? "");
    setExtension(row.profile?.extension ?? "");
    setProduction(row.profile?.production ?? "");
    setSpecialTraining(row.profile?.specialTraining ?? "");
    setStatus(normalizeFacultyProfileStatus(row.profile?.status));
    setDesignation(row.profile?.designation ?? "");
    setAdvisorySectionId(row.profile?.advisorySectionId ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteFaculty(row: ListRow) {
    if (!enableFacultyListEdit) return;
    const label = row.profile?.fullName ?? row.user.name;
    if (!window.confirm(`Delete faculty record for ${label}? This cannot be undone.`)) return;
    setError(null);
    setSuccess(null);
    setDeletingUserId(row.user.id);
    try {
      if (row.profile?.id) {
        await facultyProfileApi.delete(row.profile.id);
      }
      await userAdminApi.delete(row.user.id);
      if (editingUserId === row.user.id) resetFacultyForm();
      setSuccess("Faculty deleted.");
      dispatchInsCatalogReload();
      void loadFaculty();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete faculty.");
    } finally {
      setDeletingUserId(null);
    }
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
          <div className="flex flex-wrap gap-2">
            {editingUserId ? (
              <Button type="button" variant="outline" disabled={saving} onClick={() => resetFacultyForm()}>
                Cancel edit
              </Button>
            ) : null}
            <Button
              type="button"
              className="bg-[#ff990a] text-white hover:bg-[#e68a09]"
              disabled={saving || !collegeId}
              onClick={() => void onAddFaculty()}
            >
              {saving ? "Saving…" : editingUserId ? "Save faculty" : "+ Add Faculty"}
            </Button>
          </div>
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

          <div className="text-[16px] font-semibold mb-3">{editingUserId ? "Edit faculty" : "New faculty"}</div>
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
              <select
                className="h-10 w-full rounded-md border border-black/25 bg-white px-2 text-[12px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40 disabled:opacity-60"
                value={status}
                onChange={(e) => setStatus(normalizeFacultyProfileStatus(e.target.value))}
                disabled={!collegeId}
              >
                <option value={FACULTY_EMPLOYMENT_ORGANIC}>{FACULTY_EMPLOYMENT_ORGANIC}</option>
                <option value={FACULTY_EMPLOYMENT_PART_TIME}>{FACULTY_EMPLOYMENT_PART_TIME}</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Administrative Designation</div>
              <select
                className="h-10 w-full rounded-md border border-black/25 bg-white px-2 text-[12px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40 disabled:opacity-60"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                disabled={!collegeId}
              >
                <option value="">Regular Faculty (no designation)</option>
                {DESIGNATION_POLICIES.filter((d) => d.key !== "Regular Faculty").map((d) => (
                  <option key={d.key} value={d.label}>
                    {d.label} ({d.hoursPerWeekMin}–{d.hoursPerWeekMax} hrs/wk)
                  </option>
                ))}
              </select>
              {(() => {
                const pol = getDesignationPolicyByLabel(designation) ?? DESIGNATION_POLICIES.find((d) => d.key === "Regular Faculty")!;
                const rate = computeRatePerHour(
                  {
                    bsDegree: bsDegree.trim() || null,
                    msDegree: msDegree.trim() || null,
                    doctoralDegree: doctoralDegree.trim() || null,
                    designation: designation.trim() || null,
                  } as Pick<FacultyProfile, "bsDegree" | "msDegree" | "doctoralDegree" | "designation">,
                  hourlyRateOverrides,
                  ratePerHourByDesignation,
                );
                return (
                  <div className="text-[11px] text-black/55 leading-relaxed">
                    Teaching load: <strong>{pol.hoursPerWeekMin}–{pol.hoursPerWeekMax} hrs/week</strong>
                    {" · "}
                    Rate/hour (highest degree): <strong>{rate != null ? `₱${rate}` : "—"}</strong>
                  </div>
                );
              })()}
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
                    {enableFacultyListEdit ? (
                      <th className="border border-black/10 px-2 py-2 text-left w-40">Actions</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="text-[12px]">
                  {!collegeId ? (
                    <tr>
                      <td
                        colSpan={enableFacultyListEdit ? 8 : 6}
                        className="border border-black/10 px-2 py-6 text-center text-black/45"
                      >
                        No college in scope.
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={enableFacultyListEdit ? 8 : 6}
                        className="border border-black/10 px-2 py-6 text-center text-black/45"
                      >
                        No instructors in the database for this college yet.
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={enableFacultyListEdit ? 8 : 6}
                        className="border border-black/10 px-2 py-6 text-center text-black/45"
                      >
                        No faculty match &quot;{facultyListSearch.trim()}&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(({ user, profile }) => {
                      const draft = editState[user.id] ?? {
                        status: normalizeFacultyProfileStatus(profile?.status),
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
                                    [user.id]: { ...draft, status: normalizeFacultyProfileStatus(e.target.value) },
                                  }))
                                }
                              >
                                <option value={FACULTY_EMPLOYMENT_ORGANIC}>{FACULTY_EMPLOYMENT_ORGANIC}</option>
                                <option value={FACULTY_EMPLOYMENT_PART_TIME}>{FACULTY_EMPLOYMENT_PART_TIME}</option>
                              </select>
                            ) : (
                              (profile ? normalizeFacultyProfileStatus(profile.status) : "—")
                            )}
                          </td>
                          <td className="border border-black/10 px-2 py-2 align-top">
                            {enableFacultyListEdit ? (
                              <select
                                className="w-full min-h-9 rounded-md border border-gray-300 bg-white px-2 text-[12px] focus-visible:ring-2 focus-visible:ring-[#ff990a]/40"
                                value={draft.designation}
                                onChange={(e) =>
                                  setEditState((s) => ({
                                    ...s,
                                    [user.id]: { ...draft, designation: e.target.value },
                                  }))
                                }
                              >
                                <option value="">Regular Faculty (no designation)</option>
                                {DESIGNATION_POLICIES.filter((d) => d.key !== "Regular Faculty").map((d) => (
                                  <option key={d.key} value={d.label}>
                                    {d.label}
                                  </option>
                                ))}
                              </select>
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
                          {enableFacultyListEdit ? (
                            <td className="border border-black/10 px-2 py-2">
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-[11px]"
                                  onClick={() => startEditFaculty({ user, profile })}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-[11px] text-red-800 border-red-200"
                                  disabled={deletingUserId === user.id}
                                  onClick={() => void deleteFaculty({ user, profile })}
                                >
                                  {deletingUserId === user.id ? "…" : "Delete"}
                                </Button>
                              </div>
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
                      status: normalizeFacultyProfileStatus(profile?.status),
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
