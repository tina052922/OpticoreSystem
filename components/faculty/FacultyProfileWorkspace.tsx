"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { facultyProfileApi, userAdminApi, apiFetch } from "@/lib/api/client";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";
import type { FacultyProfile, Program, ScheduleLoadJustification, Section, User } from "@/types/db";
import { isPlottableFacultyUser } from "@/lib/auth/instructor-validation";
import {
  FACULTY_CATEGORY_GEC,
  FACULTY_CATEGORY_PROGRAM,
  isGecInstructorUser,
  parseFacultyCategory,
  type FacultyCategory,
} from "@/lib/faculty/faculty-category";
import { computeRatePerHour, DESIGNATION_POLICIES, getDesignationPolicyByLabel } from "@/lib/faculty/designation-system";
import { useSystemConfigurationOptional } from "@/contexts/SystemConfigurationContext";
import { resolveHourlyRates } from "@/lib/system-configuration/scheduling-policy";
import {
  FACULTY_EMPLOYMENT_NON_RESIDENT,
  FACULTY_EMPLOYMENT_RESIDENT,
  normalizeFacultyProfileStatus,
} from "@/lib/faculty/employment-status";
import type { FacultyNameParts } from "@/lib/faculty/hr-form-23b";
import {
  duplicateFacultyReason,
  MISSING_EMPLOYEE_ID_MESSAGE,
} from "@/lib/faculty/duplicate-faculty";
import { downloadHr23bWorkbook } from "@/lib/faculty/hr23b-export";
import {
  advisoryLabel,
  advisorySectionIdsOf,
  advisoryWriteFields,
} from "@/lib/faculty/advisory-sections";
import {
  ACADEMIC_RANK_SUGGESTIONS,
  compareFacultyAlphabetically,
  composeFullName,
  composeListName,
  computeAge,
  facultyNamePartsFrom,
  formatDateOfBirth,
  normalizeFacultySex,
  toDateInputValue,
} from "@/lib/faculty/hr-form-23b";
import { FacultyLoadJustificationRecord } from "@/components/faculty/FacultyLoadJustificationRecord";
import { useSemesterFilterOptional } from "@/contexts/SemesterFilterContext";

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
  user: Pick<User, "id" | "name" | "employeeId" | "chairmanProgramId" | "facultyCategory">;
  profile: FacultyProfile | null;
};

/** A list row with its 23B name cells resolved (stored columns, else a split of `fullName`). */
type ListRowView = ListRow & { parts: FacultyNameParts };

/**
 * Designation is free text. These are suggestions only — typing a Merit System label exactly is what
 * links the profile to a teaching-hour cap; anything else is stored as-is and uses the standard load.
 */
const DESIGNATION_SUGGESTIONS_ID = "faculty-designation-suggestions";

/** Plantilla ranks offered for the 23B "ACADEMIC RANK" cell; the column itself stays free text. */
const ACADEMIC_RANK_SUGGESTIONS_ID = "faculty-academic-rank-suggestions";

/**
 * Faculty list columns: the twelve HR Form 23B cells (No. … Eligibility) plus Employee ID,
 * Designation, Advisory, Justification and Program. Save/Actions add two more when editing.
 */
const FACULTY_LIST_COLUMNS = 17;

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
  const semester = useSemesterFilterOptional();
  const selectedPeriodId = semester?.selectedPeriodId ?? "";

  const [tab, setTab] = useState<"profile" | "designation" | "advisory">("profile");

  const [employeeId, setEmployeeId] = useState("");
  // HR Form 23B splits the name into three cells; `fullName` is recomposed from them on save.
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [academicRank, setAcademicRank] = useState("");
  const [sex, setSex] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [educationalQualification, setEducationalQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [status, setStatus] = useState<typeof FACULTY_EMPLOYMENT_RESIDENT | typeof FACULTY_EMPLOYMENT_NON_RESIDENT>(
    FACULTY_EMPLOYMENT_RESIDENT,
  );
  const [designation, setDesignation] = useState("");
  const [advisorySectionIds, setAdvisorySectionIds] = useState<string[]>([]);
  /** Department the instructor belongs to (`User.chairmanProgramId`). Locked for a Program Chairman. */
  const [departmentProgramId, setDepartmentProgramId] = useState("");
  /**
   * Teaching category. A GEC instructor is college-scoped and teaches across departments, so they
   * carry no home department — a Program Chairman can enroll one from here.
   */
  const [facultyCategory, setFacultyCategory] = useState<FacultyCategory>(
    gecFacultyFilter ? FACULTY_CATEGORY_GEC : FACULTY_CATEGORY_PROGRAM,
  );

  const [rows, setRows] = useState<ListRow[]>([]);
  const [facultyListSearch, setFacultyListSearch] = useState("");
  // HR Form 23B column filters; they narrow the list on screen and therefore the Excel export too.
  const [statusFilter, setStatusFilter] = useState("");
  const [sexFilter, setSexFilter] = useState("");
  const [rankFilter, setRankFilter] = useState("");
  const [exporting, setExporting] = useState(false);
  const [editState, setEditState] = useState<
    Record<string, { status: string; designation: string; advisorySectionIds: string[] }>
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
  const [justificationByUserId, setJustificationByUserId] = useState<Record<string, string>>({});

  /** What gets stored in `fullName`, so INS documents keep printing one readable name. */
  const composedFullName = useMemo(
    () => composeFullName({ lastName, firstName, middleName }),
    [lastName, firstName, middleName],
  );
  const ageFromBirthDate = useMemo(() => computeAge(dateOfBirth), [dateOfBirth]);
  /**
   * Hourly rate for what is typed in the form: the designation override if the policy names one,
   * else the tier read off the 23B educational qualification.
   */
  const ratePerHourForForm = useMemo(
    () =>
      computeRatePerHour(
        {
          educationalQualification: educationalQualification.trim() || null,
          designation: designation.trim() || null,
        } as Parameters<typeof computeRatePerHour>[0],
        hourlyRateOverrides,
        ratePerHourByDesignation,
      ),
    [educationalQualification, designation, hourlyRateOverrides, ratePerHourByDesignation],
  );

  const loadFaculty = useCallback(async () => {
    if (!collegeId) {
      setRows([]);
      setSections([]);
      setPrograms([]);
      return;
    }
    setLoadingList(true);
    setError(null);

    let users: Pick<User, "id" | "name" | "employeeId" | "chairmanProgramId" | "facultyCategory">[] = [];
    try {
      const { apiFetch } = await import("@/lib/api/client");
      const data = await apiFetch<{
        users: Array<
          Pick<User, "id" | "name" | "employeeId" | "role" | "chairmanProgramId" | "instructorValidation" | "facultyCategory">
        >;
      }>(
        `/api/catalog/users?collegeId=${collegeId}`,
        { method: "GET", forceRefresh: true },
      );
      users = data.users
        .filter((u) => {
          if (u.role !== "instructor" || !isPlottableFacultyUser(u)) return false;
          const locked = String(chairmanProgramId ?? "").trim();
          // Department chairs manage program faculty only — GEC instructors are college-scoped.
          if (locked && isGecInstructorUser(u)) return false;
          const home = String(u.chairmanProgramId ?? "").trim();
          if (locked && home && home !== locked) return false;
          return true;
        })
        .map((u) => ({
          id: u.id,
          name: u.name,
          employeeId: u.employeeId,
          chairmanProgramId: u.chairmanProgramId ?? null,
          facultyCategory: u.facultyCategory ?? null,
        }));
    } catch {
      setLoadingList(false);
      return;
    }
    let list = (users ?? []) as Pick<
      User,
      "id" | "name" | "employeeId" | "chairmanProgramId" | "facultyCategory"
    >[];
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
        const advised = advisorySectionIdsOf(byUser.get(u.id) ?? null);
        if (advised.length === 0) return true;
        return advised.some((id) => secIds.has(id));
      });
    }

    setRows(
      list.map((u) => ({
        user: {
          id: u.id,
          name: u.name,
          employeeId: u.employeeId,
          chairmanProgramId: u.chairmanProgramId ?? null,
          facultyCategory: u.facultyCategory ?? null,
        },
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
          advisorySectionIds: advisorySectionIdsOf(profile),
        };
      }
      return next;
    });
  }, [rows]);

  /** "(Alphabetical Order)" on the form — by last name, then first, then middle. */
  const viewRows = useMemo<ListRowView[]>(
    () =>
      rows
        .map((r) => ({ ...r, parts: facultyNamePartsFrom(r.profile ?? {}, r.user.name) }))
        .sort((a, b) => compareFacultyAlphabetically(a.parts, b.parts)),
    [rows],
  );

  /** Academic ranks actually present, for the rank filter. */
  const rankOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of viewRows) {
      const rank = (r.profile?.academicRank ?? "").trim();
      if (rank) set.add(rank);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  }, [viewRows]);

  const filteredRows = useMemo(() => {
    const q = facultyListSearch.trim().toLowerCase();
    const columnFiltered = viewRows.filter(({ profile }) => {
      if (statusFilter && normalizeFacultyProfileStatus(profile?.status) !== statusFilter) return false;
      if (sexFilter && normalizeFacultySex(profile?.sex) !== sexFilter) return false;
      if (rankFilter && (profile?.academicRank ?? "").trim() !== rankFilter) return false;
      return true;
    });
    if (!q) return columnFiltered;
    return columnFiltered.filter(({ user, profile, parts }) => {
      const haystack = [
        parts.lastName,
        parts.firstName,
        parts.middleName,
        profile?.fullName ?? user.name,
        profile?.academicRank,
        normalizeFacultyProfileStatus(profile?.status),
        profile?.educationalQualification,
        profile?.experience,
        profile?.eligibility,
        profile?.designation,
        user.employeeId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [viewRows, facultyListSearch, statusFilter, sexFilter, rankFilter]);

  const loadJustifications = useCallback(() => {
    if (!collegeId) {
      setJustificationByUserId({});
      return () => {};
    }
    let cancelled = false;
    const qs = new URLSearchParams();
    qs.set("collegeId", collegeId);
    if (selectedPeriodId) qs.set("academicPeriodId", selectedPeriodId);
    void apiFetch<{ justifications: ScheduleLoadJustification[] }>(
      `/api/catalog/schedule-load-justifications?${qs.toString()}`,
      { method: "GET" },
    )
      .then((data) => {
        if (cancelled) return;
        const latest: Record<string, string> = {};
        for (const j of data.justifications ?? []) {
          const fid = (j.facultyUserId ?? "").trim();
          if (!fid || latest[fid]) continue;
          const text = (j.justification ?? "").trim();
          if (text) latest[fid] = text;
        }
        setJustificationByUserId(latest);
      })
      .catch(() => {
        if (!cancelled) setJustificationByUserId({});
      });
    return () => {
      cancelled = true;
    };
  }, [collegeId, selectedPeriodId]);

  useEffect(() => loadJustifications(), [loadJustifications]);

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
    const advisoryFields = advisoryWriteFields(draft.advisorySectionIds);
    const ratePerHourVal = row.profile
      ? computeRatePerHour(row.profile, hourlyRateOverrides, ratePerHourByDesignation)
      : null;

    try {
      if (row.profile) {
        await facultyProfileApi.update(row.profile.id, {
          status: statusVal,
          designation: designationVal,
          ...advisoryFields,
          ratePerHour: ratePerHourVal,
        });
      } else {
        const parts = facultyNamePartsFrom(row.profile ?? {}, name);
        await facultyProfileApi.create({
          userId,
          fullName: name,
          lastName: parts.lastName || null,
          firstName: parts.firstName || null,
          middleName: parts.middleName || null,
          status: statusVal,
          designation: designationVal,
          ...advisoryFields,
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
    if (!eid) return MISSING_EMPLOYEE_ID_MESSAGE;
    const { apiFetch } = await import("@/lib/api/client");

    const byEid = await apiFetch<{ users: { id: string }[] }>(
      `/api/catalog/users?employeeId=${encodeURIComponent(eid)}`,
      { method: "GET" },
    ).catch(() => ({ users: [] }));

    let collegeInstructors: { id: string; name: string }[] = [];
    let profiles: { userId: string; fullName: string | null }[] = [];

    if (composedFullName && collegeId) {
      const instructors = await apiFetch<{ users: { id: string; name: string }[] }>(
        `/api/catalog/users?collegeId=${collegeId}&role=instructor`,
        { method: "GET" },
      ).catch(() => ({ users: [] }));
      collegeInstructors = instructors.users ?? [];

      const instIds = collegeInstructors.map((u) => u.id);
      if (instIds.length > 0) {
        const profilesRes = await apiFetch<{ profiles: { userId: string; fullName: string | null }[] }>(
          `/api/catalog/faculty-profiles?userIds=${instIds.join(",")}`,
          { method: "GET" },
        ).catch(() => ({ profiles: [] }));
        profiles = profilesRes.profiles ?? [];
      }
    }

    return duplicateFacultyReason({
      editingUserId,
      employeeId: eid,
      usersWithEmployeeId: byEid.users ?? [],
      collegeInstructors,
      profiles,
      fullName: composedFullName,
    });
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

    const nameTrim = composedFullName;
    if (!lastName.trim() || !firstName.trim()) {
      setError("Last Name and First Name are required.");
      return;
    }

    /** HR Form 23B cells, written on both create and update. */
    const hrFormFields = {
      lastName: lastName.trim() || null,
      firstName: firstName.trim() || null,
      middleName: middleName.trim() || null,
      academicRank: academicRank.trim() || null,
      sex: normalizeFacultySex(sex) || null,
      dateOfBirth: dateOfBirth.trim() || null,
      educationalQualification: educationalQualification.trim() || null,
      experience: experience.trim() || null,
      eligibility: eligibility.trim() || null,
    };

    const isGec = facultyCategory === FACULTY_CATEGORY_GEC;

    setSaving(true);
    if (editingUserId) {
      const profilePayload = {
        fullName: nameTrim,
        ...hrFormFields,
        ...advisoryWriteFields(advisorySectionIds),
        status: normalizeFacultyProfileStatus(status),
        designation: designation.trim() || null,
        ratePerHour: ratePerHourForForm,
      };
      try {
        await userAdminApi.update(editingUserId, {
          name: nameTrim,
          employeeId: employeeId.trim() || null,
          // A GEC instructor is not tied to one department.
          chairmanProgramId: isGec ? null : departmentProgramId.trim() || null,
          facultyCategory,
        });
        const row = rows.find((r) => r.user.id === editingUserId);
        if (row?.profile) {
          await facultyProfileApi.update(row.profile.id, profilePayload);
        } else {
          await facultyProfileApi.create({
            id: crypto.randomUUID(),
            userId: editingUserId,
            ...profilePayload,
          });
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
        chairmanProgramId: isGec ? null : chairmanProgramId || departmentProgramId.trim() || null,
        facultyCategory,
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

    try {
      await facultyProfileApi.create({
        id: crypto.randomUUID(),
        userId: id,
        fullName: nameTrim,
        ...hrFormFields,
        ...advisoryWriteFields(advisorySectionIds),
        status: normalizeFacultyProfileStatus(status),
        designation: designation.trim() || null,
        ratePerHour: ratePerHourForForm,
      });
    } catch (err) {
      try { await userAdminApi.delete(id); } catch {}
      setSaving(false);
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("duplicate") || msg.includes("already exists") || msg.includes("23505")) {
        setError("Faculty already exists.");
      } else {
        setError(msg || "Failed to save faculty profile.");
      }
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
    setLastName("");
    setFirstName("");
    setMiddleName("");
    setAcademicRank("");
    setSex("");
    setDateOfBirth("");
    setEducationalQualification("");
    setExperience("");
    setEligibility("");
    setDepartmentProgramId(chairmanProgramId ?? "");
    setFacultyCategory(gecFacultyFilter ? FACULTY_CATEGORY_GEC : FACULTY_CATEGORY_PROGRAM);
    setStatus(FACULTY_EMPLOYMENT_RESIDENT);
    setDesignation("");
    setAdvisorySectionIds([]);
  }

  function startEditFaculty(row: ListRow) {
    setError(null);
    setSuccess(null);
    setTab("profile");
    setEditingUserId(row.user.id);
    setEmployeeId(row.user.employeeId ?? "");
    const parts = facultyNamePartsFrom(row.profile ?? {}, row.user.name);
    setLastName(parts.lastName);
    setFirstName(parts.firstName);
    setMiddleName(parts.middleName);
    setAcademicRank(row.profile?.academicRank ?? "");
    setSex(normalizeFacultySex(row.profile?.sex));
    setDateOfBirth(toDateInputValue(row.profile?.dateOfBirth));
    setEducationalQualification(row.profile?.educationalQualification ?? "");
    setExperience(row.profile?.experience ?? "");
    setEligibility(row.profile?.eligibility ?? "");
    setDepartmentProgramId(row.user.chairmanProgramId ?? chairmanProgramId ?? "");
    setFacultyCategory(parseFacultyCategory(row.user.facultyCategory));
    setStatus(normalizeFacultyProfileStatus(row.profile?.status));
    setDesignation(row.profile?.designation ?? "");
    setAdvisorySectionIds(advisorySectionIdsOf(row.profile));
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

  /** Program code when one is in scope, else the college — used for the export file name. */
  const exportScopeLabel = useMemo(() => {
    if (programLabel && programLabel !== "\u2014") return programLabel;
    const scoped = programs.find((p) => p.id === scopeProgramId);
    return scoped?.code ?? "";
  }, [programLabel, programs, scopeProgramId]);

  async function exportFacultyList() {
    setError(null);
    setSuccess(null);
    if (filteredRows.length === 0) {
      setError("Nothing to export \u2014 no faculty match the current filters.");
      return;
    }
    setExporting(true);
    try {
      const period = semester?.selectedPeriod ?? null;
      const academicYear = period
        ? [period.academicYear, period.semester].filter(Boolean).join(" \u00b7 ")
        : "";
      await downloadHr23bWorkbook(
        filteredRows.map(({ user, profile }) => ({ user, profile })),
        { academicYear, scopeLabel: exportScopeLabel },
      );
      setSuccess(`Exported ${filteredRows.length} faculty to Excel (HR Form 23B).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export the faculty list.");
    } finally {
      setExporting(false);
    }
  }

  const programLabelById = useMemo(() => {
    const m = new Map<string, string>();
    programs.forEach((p) => m.set(p.id, p.code || p.name));
    return m;
  }, [programs]);

  /** Department shown per row: the instructor's own program, else the page scope. */
  function departmentLabelFor(row: ListRow): string {
    const own = (row.user.chairmanProgramId ?? "").trim();
    if (own) return programLabelById.get(own) ?? own;
    return programLabel && programLabel !== "\u2014" ? programLabel : "Unassigned";
  }

  const sectionNameById = useMemo(() => {
    const m = new Map<string, string>();
    sections.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [sections]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 space-y-6 max-h-[min(85vh,1200px)] overflow-y-auto">
      <datalist id={ACADEMIC_RANK_SUGGESTIONS_ID}>
        {ACADEMIC_RANK_SUGGESTIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <datalist id={DESIGNATION_SUGGESTIONS_ID}>
        {DESIGNATION_POLICIES.filter((d) => d.key !== "Regular Faculty").map((d) => (
          <option key={d.key} value={d.label}>
            {d.hoursPerWeekMin}–{d.hoursPerWeekMax} hrs/wk
          </option>
        ))}
      </datalist>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-black/60">Search faculty</div>
              <Input
                placeholder="Name, rank, qualification, employee ID…"
                value={facultyListSearch}
                onChange={(e) => setFacultyListSearch(e.target.value)}
                disabled={!collegeId}
                className="h-9 text-sm border-black/20 focus-visible:ring-[#ff990a]/40"
              />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-black/60">Status</div>
              <select
                className="h-9 w-full rounded-md border border-black/20 bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40 disabled:opacity-60"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={!collegeId}
              >
                <option value="">All statuses</option>
                <option value={FACULTY_EMPLOYMENT_RESIDENT}>{FACULTY_EMPLOYMENT_RESIDENT}</option>
                <option value={FACULTY_EMPLOYMENT_NON_RESIDENT}>{FACULTY_EMPLOYMENT_NON_RESIDENT}</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-black/60">Sex</div>
              <select
                className="h-9 w-full rounded-md border border-black/20 bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40 disabled:opacity-60"
                value={sexFilter}
                onChange={(e) => setSexFilter(e.target.value)}
                disabled={!collegeId}
              >
                <option value="">All</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-black/60">Academic rank</div>
              <select
                className="h-9 w-full rounded-md border border-black/20 bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40 disabled:opacity-60"
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                disabled={!collegeId || rankOptions.length === 0}
              >
                <option value="">All ranks</option>
                {rankOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
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

          <div className="mb-3">
            <div className="text-[16px] font-semibold">{editingUserId ? "Edit faculty" : "New faculty"}</div>
            <p className="text-[11px] text-black/55">
              Fields follow CTU HR Form 23B — Faculty Profile as to their Educational Qualification (June 2012, Rev. 0).
            </p>
          </div>
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
              <div className="text-sm font-medium">Last Name</div>
              <Input placeholder="Dela Cruz" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">First Name</div>
              <Input placeholder="Juan" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Middle Name</div>
              <Input placeholder="Miguel" value={middleName} onChange={(e) => setMiddleName(e.target.value)} disabled={!collegeId} />
              <p className="text-[11px] text-black/50">
                Stored as <strong>{composedFullName || "—"}</strong> for INS documents.
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Academic Rank</div>
              <Input
                list={ACADEMIC_RANK_SUGGESTIONS_ID}
                placeholder="Instructor I"
                value={academicRank}
                onChange={(e) => setAcademicRank(e.target.value)}
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Sex</div>
              <select
                className="h-10 w-full rounded-md border border-black/25 bg-white px-2 text-[12px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40 disabled:opacity-60"
                value={sex}
                onChange={(e) => setSex(normalizeFacultySex(e.target.value))}
                disabled={!collegeId}
              >
                <option value="">—</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Date of Birth</div>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Age</div>
              <Input
                readOnly
                tabIndex={-1}
                className="bg-black/[0.04] text-black/70"
                placeholder="—"
                value={ageFromBirthDate != null ? String(ageFromBirthDate) : ""}
                disabled={!collegeId}
              />
              <p className="text-[11px] text-black/50">Computed from the date of birth.</p>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Educational Qualification</div>
              <Input
                placeholder="MS Information Technology"
                value={educationalQualification}
                onChange={(e) => setEducationalQualification(e.target.value)}
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Experience</div>
              <Input
                placeholder="8 years teaching, 3 years industry"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Eligibility</div>
              <Input
                placeholder="CSC Professional / LET / PRC licence"
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Instructor category</div>
              <select
                className="h-10 w-full rounded-md border border-black/25 bg-white px-2 text-[12px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40 disabled:opacity-60"
                value={facultyCategory}
                onChange={(e) => setFacultyCategory(parseFacultyCategory(e.target.value))}
                disabled={!collegeId}
              >
                <option value={FACULTY_CATEGORY_PROGRAM}>Program / department instructor</option>
                <option value={FACULTY_CATEGORY_GEC}>GEC instructor</option>
              </select>
              <p className="text-[11px] text-black/50 leading-relaxed">
                {facultyCategory === FACULTY_CATEGORY_GEC
                  ? "Teaches GEC subjects across departments; the GEC Chairman plots their load."
                  : "Belongs to one department, plotted by that Program Chairman."}
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Program (department)</div>
              <select
                className="h-10 w-full rounded-md border border-black/25 bg-white px-2 text-[12px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40 disabled:opacity-60"
                value={facultyCategory === FACULTY_CATEGORY_GEC ? "" : departmentProgramId}
                onChange={(e) => setDepartmentProgramId(e.target.value)}
                disabled={
                  !collegeId ||
                  facultyCategory === FACULTY_CATEGORY_GEC ||
                  Boolean(chairmanProgramId)
                }
              >
                <option value="">— Unassigned —</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-black/50 leading-relaxed">
                {facultyCategory === FACULTY_CATEGORY_GEC
                  ? "Not applicable — GEC instructors are college-scoped."
                  : chairmanProgramId
                    ? "Locked to your department."
                    : "Which department this instructor belongs to. Used for Faculty Profile scope and plotting."}
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Status</div>
              <select
                className="h-10 w-full rounded-md border border-black/25 bg-white px-2 text-[12px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40 disabled:opacity-60"
                value={status}
                onChange={(e) => setStatus(normalizeFacultyProfileStatus(e.target.value))}
                disabled={!collegeId}
              >
                <option value={FACULTY_EMPLOYMENT_RESIDENT}>{FACULTY_EMPLOYMENT_RESIDENT}</option>
                <option value={FACULTY_EMPLOYMENT_NON_RESIDENT}>{FACULTY_EMPLOYMENT_NON_RESIDENT}</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Administrative Designation</div>
              <Input
                list={DESIGNATION_SUGGESTIONS_ID}
                placeholder="Regular Faculty (no designation)"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                disabled={!collegeId}
              />
              {(() => {
                const matched = getDesignationPolicyByLabel(designation);
                const pol = matched ?? DESIGNATION_POLICIES.find((d) => d.key === "Regular Faculty")!;
                const custom = Boolean(designation.trim()) && !matched;
                return (
                  <div className="text-[11px] text-black/55 leading-relaxed">
                    Teaching load: <strong>{pol.hoursPerWeekMin}–{pol.hoursPerWeekMax} hrs/week</strong>
                    {" · "}
                    Rate/hour (educational qualification):{" "}
                    <strong>{ratePerHourForForm != null ? `₱${ratePerHourForForm}` : "—"}</strong>
                    {custom ? (
                      <>
                        <br />
                        Custom designation — no Merit System cap matches this text, so the standard load applies.
                      </>
                    ) : null}
                  </div>
                );
              })()}
            </div>
            <div className="space-y-1 lg:col-span-2">
              <div className="text-sm font-medium">Advisory (Assigned Sections)</div>
              <div className="max-h-40 overflow-auto rounded-md border border-black/25 bg-white p-2">
                {sections.length === 0 ? (
                  <p className="text-[11px] text-black/45 px-1 py-2">
                    No sections in scope yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {sections.map((sec) => {
                      const checked = advisorySectionIds.includes(sec.id);
                      return (
                        <label
                          key={sec.id}
                          className="flex items-center gap-2 text-[12px] px-1 py-1 rounded hover:bg-black/[0.03] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="accent-[#ff990a]"
                            checked={checked}
                            disabled={!collegeId}
                            onChange={(e) =>
                              setAdvisorySectionIds((prev) =>
                                e.target.checked
                                  ? [...prev, sec.id]
                                  : prev.filter((id) => id !== sec.id),
                              )
                            }
                          />
                          <span>{sec.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-black/50 leading-relaxed">
                A faculty may advise more than one section — tick every section they handle.
                {advisorySectionIds.length > 0 ? ` Selected: ${advisorySectionIds.length}.` : ""}
              </p>
            </div>
          </div>

          {editingUserId ? (
            <div className="mt-6">
              <FacultyLoadJustificationRecord
                facultyUserId={editingUserId}
                collegeId={collegeId}
                onCleared={() => loadJustifications()}
              />
            </div>
          ) : null}

          <div className="mt-8 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <div className="text-[16px] font-semibold">Faculty List {loadingList ? "· Loading…" : ""}</div>
                <p className="text-[12px] text-black/55">
                  HR Form 23B — Faculty Profile as to their Educational Qualification, in alphabetical order by last
                  name.
                </p>
              </div>
              <div className="shrink-0 space-y-1">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-[12px] font-semibold"
                  disabled={exporting || filteredRows.length === 0}
                  onClick={() => void exportFacultyList()}
                >
                  {exporting ? "Preparing\u2026" : "Export to Excel"}
                </Button>
                <p className="text-[11px] text-black/50 text-right">
                  {filteredRows.length} row{filteredRows.length === 1 ? "" : "s"} · print-ready HR Form 23B
                </p>
              </div>
            </div>
            {enableFacultyListEdit ? (
              <p className="text-[12px] text-black/55">
                Status (Resident / Non-resident) and designation drive teaching caps in the Evaluator policy engine
                (non-resident weekly limits and designation-based caps).
              </p>
            ) : null}
            <div className="overflow-auto rounded-xl border border-black/10">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#ff990a] text-white text-[11px]">
                    <th className="border border-black/10 px-2 py-2 text-left w-10">No.</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Last Name</th>
                    <th className="border border-black/10 px-2 py-2 text-left">First Name</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Middle Name</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Academic Rank</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Status</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Sex</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Date of Birth</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Age</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Educational Qualification</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Experience</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Eligibility</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Employee ID</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Designation</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Advisory</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Justification</th>
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
                        colSpan={enableFacultyListEdit ? FACULTY_LIST_COLUMNS + 2 : FACULTY_LIST_COLUMNS}
                        className="border border-black/10 px-2 py-6 text-center text-black/45"
                      >
                        No college in scope.
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={enableFacultyListEdit ? FACULTY_LIST_COLUMNS + 2 : FACULTY_LIST_COLUMNS}
                        className="border border-black/10 px-2 py-6 text-center text-black/45"
                      >
                        No instructors in the database for this college yet.
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={enableFacultyListEdit ? FACULTY_LIST_COLUMNS + 2 : FACULTY_LIST_COLUMNS}
                        className="border border-black/10 px-2 py-6 text-center text-black/45"
                      >
                        No faculty match &quot;{facultyListSearch.trim()}&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(({ user, profile, parts }, index) => {
                      const draft = editState[user.id] ?? {
                        status: normalizeFacultyProfileStatus(profile?.status),
                        designation: profile?.designation ?? "",
                        advisorySectionId: profile?.advisorySectionId ?? "",
                      };
                      const age = computeAge(profile?.dateOfBirth);
                      return (
                        <tr key={user.id}>
                          <td className="border border-black/10 px-2 py-2 tabular-nums text-black/55">{index + 1}</td>
                          <td className="border border-black/10 px-2 py-2 font-semibold">{parts.lastName || "—"}</td>
                          <td className="border border-black/10 px-2 py-2">{parts.firstName || "—"}</td>
                          <td className="border border-black/10 px-2 py-2">{parts.middleName || "—"}</td>
                          <td className="border border-black/10 px-2 py-2">{profile?.academicRank ?? "—"}</td>
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
                                <option value={FACULTY_EMPLOYMENT_RESIDENT}>{FACULTY_EMPLOYMENT_RESIDENT}</option>
                                <option value={FACULTY_EMPLOYMENT_NON_RESIDENT}>{FACULTY_EMPLOYMENT_NON_RESIDENT}</option>
                              </select>
                            ) : (
                              (profile ? normalizeFacultyProfileStatus(profile.status) : "—")
                            )}
                          </td>
                          <td className="border border-black/10 px-2 py-2">{normalizeFacultySex(profile?.sex) || "—"}</td>
                          <td className="border border-black/10 px-2 py-2 whitespace-nowrap">
                            {formatDateOfBirth(profile?.dateOfBirth) || "—"}
                          </td>
                          <td className="border border-black/10 px-2 py-2 tabular-nums">{age != null ? age : "—"}</td>
                          <td className="border border-black/10 px-2 py-2 max-w-[200px]">
                            {profile?.educationalQualification ?? "—"}
                          </td>
                          <td className="border border-black/10 px-2 py-2 max-w-[180px]">{profile?.experience ?? "—"}</td>
                          <td className="border border-black/10 px-2 py-2 max-w-[180px]">{profile?.eligibility ?? "—"}</td>
                          <td className="border border-black/10 px-2 py-2 tabular-nums">{user.employeeId ?? "—"}</td>
                          <td className="border border-black/10 px-2 py-2 align-top">
                            {enableFacultyListEdit ? (
                              <input
                                className="w-full min-h-9 rounded-md border border-gray-300 bg-white px-2 text-[12px] focus-visible:ring-2 focus-visible:ring-[#ff990a]/40"
                                list={DESIGNATION_SUGGESTIONS_ID}
                                placeholder="Regular Faculty (no designation)"
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
<div className="space-y-1">
                                <div className="max-h-28 overflow-auto rounded-md border border-gray-300 bg-white p-1">
                                  {sections.length === 0 ? (
                                    <span className="text-[11px] text-black/45 px-1">No sections in scope.</span>
                                  ) : (
                                    sections.map((sec) => (
                                      <label
                                        key={sec.id}
                                        className="flex items-center gap-2 text-[11px] px-1 py-0.5 rounded hover:bg-black/[0.03] cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          className="accent-[#ff990a]"
                                          checked={draft.advisorySectionIds.includes(sec.id)}
                                          onChange={(e) =>
                                            setEditState((st) => ({
                                              ...st,
                                              [user.id]: {
                                                ...draft,
                                                advisorySectionIds: e.target.checked
                                                  ? [...draft.advisorySectionIds, sec.id]
                                                  : draft.advisorySectionIds.filter((id) => id !== sec.id),
                                              },
                                            }))
                                          }
                                        />
                                        <span>{sec.name}</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              </div>
                            ) : (
                              advisoryLabel(profile, sectionNameById)
                            )}
                          </td>
                          <td className="border border-black/10 px-2 py-2 max-w-[220px]">
                            {justificationByUserId[user.id] ? (
                              <span className="line-clamp-3 whitespace-pre-wrap text-black/80">
                                {justificationByUserId[user.id]}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="border border-black/10 px-2 py-2">
                            {isGecInstructorUser(user) ? (
                              <span className="inline-flex items-center rounded-md bg-[#ff990a]/15 px-1.5 py-0.5 text-[11px] font-semibold text-[#8a5200]">
                                GEC instructor
                              </span>
                            ) : (
                              departmentLabelFor({ user, profile })
                            )}
                          </td>
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
                      <td className="border border-black/10 px-2 py-2">{composeListName(r.parts) || r.user.name}</td>
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
                  filteredRows.map(({ user, profile, parts }) => {
                    const draft = editState[user.id] ?? {
                      status: normalizeFacultyProfileStatus(profile?.status),
                      designation: profile?.designation ?? "",
                      advisorySectionIds: advisorySectionIdsOf(profile),
                    };
                    // Students column sums every section the faculty advises.
                    const advisedSections = sections.filter((sec) => draft.advisorySectionIds.includes(sec.id));
                    const advisedStudents = advisedSections.reduce(
                      (total, sec) => total + (sec.studentCount ?? 0),
                      0,
                    );
                    return (
                      <tr key={user.id}>
                        <td className="border border-black/10 px-2 py-2">{composeListName(parts) || user.name}</td>
                        <td className="border border-black/10 px-2 py-2 align-top">
                          {enableFacultyListEdit ? (
<div className="space-y-1">
                                <div className="max-h-28 overflow-auto rounded-md border border-gray-300 bg-white p-1">
                                  {sections.length === 0 ? (
                                    <span className="text-[11px] text-black/45 px-1">No sections in scope.</span>
                                  ) : (
                                    sections.map((sec) => (
                                      <label
                                        key={sec.id}
                                        className="flex items-center gap-2 text-[11px] px-1 py-0.5 rounded hover:bg-black/[0.03] cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          className="accent-[#ff990a]"
                                          checked={draft.advisorySectionIds.includes(sec.id)}
                                          onChange={(e) =>
                                            setEditState((st) => ({
                                              ...st,
                                              [user.id]: {
                                                ...draft,
                                                advisorySectionIds: e.target.checked
                                                  ? [...draft.advisorySectionIds, sec.id]
                                                  : draft.advisorySectionIds.filter((id) => id !== sec.id),
                                              },
                                            }))
                                          }
                                        />
                                        <span>{sec.name}</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              </div>
                          ) : (
                            advisoryLabel(profile, sectionNameById)
                          )}
                        </td>
                        <td className="border border-black/10 px-2 py-2 tabular-nums">
                          {advisedSections.length > 0 ? advisedStudents : "\u2014"}
                        </td>
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
