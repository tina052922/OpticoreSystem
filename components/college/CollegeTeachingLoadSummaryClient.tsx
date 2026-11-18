"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { TeachingLoadSummaryTable } from "@/components/college/TeachingLoadSummaryTable";
import { TeachingLoadSummaryDocument } from "@/components/pdf/forms/TeachingLoadSummaryDocument";
import { PDFPreviewModal } from "@/components/pdf/preview/PDFPreviewModal";
import { Button } from "@/components/ui/button";
import { apiFetch, authApi, catalogApi } from "@/lib/api/client";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { useCampusBranding } from "@/contexts/CampusBrandingContext";
import { hydrateScheduleEntries } from "@/lib/scheduling/program-mode";
import { buildTeachingLoadSummaryByCategory } from "@/lib/scheduling/teaching-load-summary";
import {
  buildTeachingLoadSignatories,
  departmentHeading,
  type TeachingLoadSignatories,
} from "@/lib/scheduling/teaching-load-signatories";
import type { College, CollegeInsSignerDisplay } from "@/types/db";
import type { FacultyProfile, Program, ScheduleEntry, ScheduleLoadJustification, Section, Subject, User } from "@/types/db";
import { useActionToast } from "@/components/alerts/useActionToast";
import { downloadTeachingLoadSummaryWorkbook } from "@/lib/scheduling/teaching-load-summary-export";
import { DEFAULT_REPORT_FOOTER_BANNER } from "@/lib/system-configuration/campus-branding";
import { embedImageUrlForPdf } from "@/lib/pdf/embed-image-urls";
import { usePdfFooterBanner } from "@/hooks/use-pdf-footer-banner";

const ALL_CATEGORIES = "";
const ALL_COLLEGES = "";

type CollegeOption = { id: string; name?: string; code?: string };

type BundlePayload = {
  collegeId: string;
  collegeName: string;
  colleges: CollegeOption[];
  entries: ScheduleEntry[];
  users: User[];
  profiles: FacultyProfile[];
  programs: Program[];
  sections: Section[];
  subjects: Subject[];
  justifications: ScheduleLoadJustification[];
};

/**
 * Summary of Teaching Load.
 *
 * College Admin: their own college, by department. DOI (`campusWide`): every college — pick one
 * college or "All colleges", then a department.
 */
export function CollegeTeachingLoadSummaryClient({ campusWide = false }: { campusWide?: boolean } = {}) {
  const { selectedPeriodId, selectedPeriod } = useSemesterFilter();
  const [colleges, setColleges] = useState<CollegeOption[]>([]);
  const [pickedCollegeId, setPickedCollegeId] = useState(ALL_COLLEGES);
  const branding = useCampusBranding();
  /** Rankings strip embedded for the PDF. */
  const footerBanner = usePdfFooterBanner();
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [collegeName, setCollegeName] = useState("College");
  const [loading, setLoading] = useState(true);
  const toast = useActionToast();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<FacultyProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [justifications, setJustifications] = useState<ScheduleLoadJustification[]>([]);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);
  const cacheRef = useRef<Map<string, BundlePayload>>(new Map());
  /** Colleges' signer links + campus signatory display, for the signature block. */
  const [signerColleges, setSignerColleges] = useState<College[]>([]);
  const [campusSignerDisplay, setCampusSignerDisplay] = useState<CollegeInsSignerDisplay | null>(null);
  const [campusSignatureUrls, setCampusSignatureUrls] = useState<{ doi: string | null; campus: string | null }>({
    doi: null,
    campus: null,
  });
  useEffect(() => {
    let alive = true;
    apiFetch<{
      settings?: {
        insSignerDisplay?: CollegeInsSignerDisplay | null;
        doiSignatureImageUrl?: string | null;
        campusDirectorSignatureImageUrl?: string | null;
      } | null;
      colleges?: College[];
    }>(
      "/api/catalog/campus-ins-settings",
      { method: "GET" },
    )
      .then((r) => {
        if (!alive) return;
        setSignerColleges(r.colleges ?? []);
        setCampusSignerDisplay(r.settings?.insSignerDisplay ?? null);
        setCampusSignatureUrls({
          doi: r.settings?.doiSignatureImageUrl ?? null,
          campus: r.settings?.campusDirectorSignatureImageUrl ?? null,
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  const loadedKeyRef = useRef<string | null>(null);

  const applyPayload = useCallback((payload: BundlePayload) => {
    setCollegeId(payload.collegeId);
    setCollegeName(payload.collegeName);
    setColleges(payload.colleges);
    setEntries(payload.entries);
    setUsers(payload.users);
    setProfiles(payload.profiles);
    setPrograms(payload.programs);
    setSections(payload.sections);
    setSubjects(payload.subjects);
    setJustifications(payload.justifications);
  }, []);

  const load = useCallback(async (periodId: string | null) => {
    const key = periodId ?? "";
    const cached = cacheRef.current.get(key);
    if (cached) {
      applyPayload(cached);
      setLoading(false);
      loadedKeyRef.current = key;
      return;
    }

    const hadRows = loadedKeyRef.current !== null;
    if (!hadRows) setLoading(true);
    try {
      const { user } = await authApi.me();
      // DOI is not tied to one college: "*" stands for campus-wide and is never used as an id.
      const cid = campusWide ? "*" : user?.collegeId?.trim() || null;
      if (!cid || !periodId) {
        const empty: BundlePayload = {
          collegeId: cid ?? "",
          collegeName: "College",
          colleges: [],
          entries: [],
          users: [],
          profiles: [],
          programs: [],
          sections: [],
          subjects: [],
          justifications: [],
        };
        if (cid) setCollegeId(cid);
        applyPayload(empty);
        cacheRef.current.set(key, empty);
        loadedKeyRef.current = key;
        return;
      }
      const [bundle, profileRes, collegesRes] = await Promise.all([
        apiFetch<{
          entries?: ScheduleEntry[];
          users?: User[];
          programs?: Program[];
          sections?: Section[];
          subjects?: Subject[];
          justifications?: ScheduleLoadJustification[];
          facultyProfiles?: FacultyProfile[];
        }>(`/api/catalog/evaluator-bundle?academicPeriodId=${encodeURIComponent(periodId)}`, {
          method: "GET",
        }),
        apiFetch<{ profiles: FacultyProfile[] }>("/api/catalog/faculty-profiles", { method: "GET" }),
        catalogApi.colleges().catch(() => ({ colleges: [] as { id: string; name?: string; code?: string }[] })),
      ]);
      const college = (collegesRes.colleges as { id: string; name?: string; code?: string }[]).find((c) => c.id === cid);
      const payload: BundlePayload = {
        collegeId: cid,
        collegeName: campusWide ? "All colleges" : college?.name?.trim() || college?.code?.trim() || "College",
        colleges: (collegesRes.colleges as CollegeOption[]) ?? [],
        entries: hydrateScheduleEntries(bundle.entries ?? []),
        users: bundle.users ?? [],
        programs: bundle.programs ?? [],
        sections: bundle.sections ?? [],
        subjects: bundle.subjects ?? [],
        justifications: bundle.justifications ?? [],
        profiles: profileRes.profiles ?? bundle.facultyProfiles ?? [],
      };
      cacheRef.current.set(key, payload);
      applyPayload(payload);
      loadedKeyRef.current = key;
    } catch (e) {
      toast.fail(e, "Could not load the teaching load", "teaching load summary");
    } finally {
      setLoading(false);
    }
  }, [applyPayload, toast, campusWide]);

  useEffect(() => {
    void load(selectedPeriodId);
  }, [load, selectedPeriodId]);

  /** Colleges this summary covers: the admin's own, or (DOI) the picked one / every college. */
  const scopeColleges = useMemo<CollegeOption[]>(() => {
    if (!campusWide) return collegeId ? [{ id: collegeId, name: collegeName }] : [];
    const sorted = [...colleges].sort((a, b) =>
      (a.code || a.name || "").localeCompare(b.code || b.name || ""),
    );
    return pickedCollegeId ? sorted.filter((c) => c.id === pickedCollegeId) : sorted;
  }, [campusWide, collegeId, collegeName, colleges, pickedCollegeId]);

  const groups = useMemo(() => {
    if (!collegeId || !selectedPeriodId) return [];
    const many = campusWide && scopeColleges.length > 1;
    return scopeColleges.flatMap((c) =>
      withDepartmentHeadings(buildTeachingLoadSummaryByCategory({
        collegeId: c.id,
        academicPeriodId: selectedPeriodId,
        entries,
        users,
        profiles,
        programs,
        sections,
        subjects,
        justifications,
      })).map((g) => ({
        ...g,
        // With every college listed, name the college on each department.
        categoryLabel: many ? `${c.code || c.name || "College"} — ${g.categoryLabel}` : g.categoryLabel,
        heading: many ? `${c.code || c.name || "College"} · ${g.heading}` : g.heading,
      })),
    );
  }, [collegeId, selectedPeriodId, campusWide, scopeColleges, entries, users, profiles, programs, sections, subjects, justifications]);

  // A department picked under another college no longer applies.
  useEffect(() => {
    setCategoryId(ALL_CATEGORIES);
  }, [pickedCollegeId]);

  const pickedCollege = colleges.find((c) => c.id === pickedCollegeId);

  const documentCollegeName = campusWide
    ? pickedCollege?.name?.trim() || pickedCollege?.code?.trim() || "All colleges"
    : collegeName;

  const visibleGroups = useMemo(() => {
    if (!categoryId) return groups;
    return groups.filter((g) => g.programId === categoryId);
  }, [groups, categoryId]);

  /**
   * Signature block (Prepared by chairpersons · Noted by Dean · Recommending Approval DOI ·
   * Approved by Campus Director). One college's form only: with "All colleges" there is no single
   * Dean or set of chairpersons to sign.
   */
  const signatoryCollegeId = campusWide ? pickedCollegeId : collegeId;
  const signatories = useMemo<TeachingLoadSignatories | null>(() => {
    if (visibleGroups.length === 0) return null;
    // With "All colleges" there is no single college: chairpersons of every department shown,
    // and the Dean line is left to sign.
    const oneCollege = Boolean(signatoryCollegeId && signatoryCollegeId !== "*");
    const college = oneCollege
      ? signerColleges.find((c) => c.id === signatoryCollegeId) ??
        ((colleges.find((c) => c.id === signatoryCollegeId) as College | undefined) ?? null) ??
        ({ id: signatoryCollegeId, code: "", name: collegeName } as College)
      : null;
    return buildTeachingLoadSignatories({
      college,
      groups: visibleGroups,
      users,
      campusInsSignerDisplay: campusSignerDisplay,
      doiSignatureImageUrl: campusSignatureUrls.doi,
      campusDirectorSignatureImageUrl: campusSignatureUrls.campus,
    });
  }, [signatoryCollegeId, signerColleges, colleges, collegeName, visibleGroups, users, campusSignerDisplay, campusSignatureUrls]);

  /** Same signatories with the e-signatures embedded, so the PDF and Excel can draw them. */
  const [embeddedSignatories, setEmbeddedSignatories] = useState<TeachingLoadSignatories | null>(null);
  useEffect(() => {
    let alive = true;
    if (!signatories) {
      setEmbeddedSignatories(null);
      return;
    }
    setEmbeddedSignatories(signatories);
    const all = [
      ...signatories.preparedBy,
      signatories.notedBy,
      signatories.recommendingApproval,
      signatories.approvedBy,
    ];
    void Promise.all(all.map((s) => embedImageUrlForPdf(s.imageUrl ?? null).catch(() => null))).then((urls) => {
      if (!alive) return;
      const withUrl = all.map((s, i) => ({ ...s, imageUrl: urls[i] ?? null }));
      const n = signatories.preparedBy.length;
      setEmbeddedSignatories({
        preparedBy: withUrl.slice(0, n),
        notedBy: withUrl[n]!,
        recommendingApproval: withUrl[n + 1]!,
        approvedBy: withUrl[n + 2]!,
      });
    });
    return () => {
      alive = false;
    };
  }, [signatories]);

  // "2nd Semester, AY 2026-2027" already names the year: add it only when the name does not.
  const semesterLabel = selectedPeriod
    ? selectedPeriod.academicYear && !selectedPeriod.name.includes(selectedPeriod.academicYear)
      ? `${selectedPeriod.name} · ${selectedPeriod.academicYear}`
      : selectedPeriod.name
    : "Selected term";
  /** College line in the header; none for "All colleges" (each department heading names its college). */
  const headerCollegeName = campusWide && !pickedCollegeId ? "" : documentCollegeName;
  const pdfFilename = `Summary-of-Teaching-Load-${documentCollegeName.replace(/\s+/g, "-")}.pdf`;
  const [exportingExcel, setExportingExcel] = useState(false);
  async function exportExcel() {
    setExportingExcel(true);
    try {
      await downloadTeachingLoadSummaryWorkbook({
        collegeName: headerCollegeName,
        semesterLabel,
        groups: visibleGroups,
        signatories: embeddedSignatories ?? signatories,
        headerBannerUrl: branding.insHeaderBannerUrl,
        fileName: pdfFilename.replace(/\.pdf$/, ".xlsx"),
      });
      toast.ok("Summary exported successfully", "Saved as an Excel file.");
    } catch (e) {
      toast.fail(e, "Could not export the summary", "teaching load summary: excel");
    } finally {
      setExportingExcel(false);
    }
  }
  const showInitialLoading = loading && loadedKeyRef.current === null;

  return (
    <div>
      <ChairmanPageHeader title="Summary of Teaching Load" />
      <div className="px-4 md:px-8 pb-10 max-w-[1400px] mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-black/65">
            Instructors grouped by department. Day and Evening loads stay separate. Numbers come from plotted
            schedules. The Justification column is the recorded overload reason for DOI (notification only — no
            approval).
          </p>
          {/* Same values in both: unique Subjects Handled, Total Preps/Week, Total Hours/Week. */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={showInitialLoading || groups.length === 0 || exportingExcel}
              onClick={() => void exportExcel()}
            >
              {exportingExcel ? "Preparing…" : "Export to Excel"}
            </Button>
            <Button type="button" disabled={showInitialLoading || groups.length === 0} onClick={() => setPdfOpen(true)}>
              Export to PDF
            </Button>
          </div>
        </div>
        {groups.length > 0 ? (
          <div className="rounded-lg border border-black/10 bg-white px-4 py-4 text-center">
            {/* Campus letterhead (System Configuration → INS header banner), as on the paper form. */}
            {/* eslint-disable-next-line no-restricted-syntax */}
            <img
              src={branding.insHeaderBannerUrl}
              alt="Cebu Technological University – Argao Campus"
              className="mx-auto h-auto w-full max-w-[640px]"
            />
            {headerCollegeName ? (
              <div className="mt-3 text-[16px] font-bold uppercase">{headerCollegeName}</div>
            ) : null}
            <div className="mt-4 text-[24px] font-extrabold">Summary of Teaching Load</div>
            <div className="text-[14px] font-bold">{semesterLabel}</div>
          </div>
        ) : null}
        {campusWide ? (
          <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-black/75">
            College
            <select
              className="h-9 min-w-[240px] rounded-md border border-black/15 bg-white px-2 text-[13px] font-normal"
              value={pickedCollegeId}
              onChange={(e) => setPickedCollegeId(e.target.value)}
            >
              <option value={ALL_COLLEGES}>All colleges</option>
              {[...colleges]
                .sort((a, b) => (a.code || a.name || "").localeCompare(b.code || b.name || ""))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code && c.name ? `${c.code} — ${c.name}` : c.name || c.code || c.id}
                  </option>
                ))}
            </select>
          </label>
        ) : null}
        {groups.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryId(ALL_CATEGORIES)}
              className={`h-8 px-3 rounded-md text-[12px] font-semibold border ${
                categoryId === ALL_CATEGORIES
                  ? "bg-[#780301] text-white border-[#780301]"
                  : "bg-white text-black/80 border-black/15"
              }`}
            >
              All departments
            </button>
            {groups.map((g) => (
              <button
                key={g.programId}
                type="button"
                onClick={() => setCategoryId(g.programId)}
                className={`h-8 px-3 rounded-md text-[12px] font-semibold border ${
                  categoryId === g.programId
                    ? "bg-[#780301] text-white border-[#780301]"
                    : "bg-white text-black/80 border-black/15"
                }`}
              >
                {g.categoryLabel}
              </button>
            ))}
          </div>
        ) : null}
        {showInitialLoading ? (
          <p className="text-sm text-black/55">Loading summary…</p>
        ) : !collegeId ? (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Your account is not linked to a college, so this summary cannot be scoped.
          </p>
        ) : !selectedPeriodId ? (
          <p className="text-sm text-black/55">Select an academic term in the sidebar.</p>
        ) : (
          <div className="space-y-6">
            {visibleGroups.length === 0 ? (
              <TeachingLoadSummaryTable
                rows={[]}
                emptyHint={campusWide ? "No departments found." : "No departments found for this college."}
              />
            ) : (
              visibleGroups.map((g) => (
                <TeachingLoadSummaryTable
                  key={g.programId}
                  categoryLabel={g.heading}
                  rows={g.rows}
                  emptyHint={`No instructors with plotted load in ${g.categoryLabel} for the selected term.`}
                />
              ))
            )}
            {signatories ? <SignatureBlock signatories={signatories} /> : null}
          </div>
        )}
      </div>
      <PDFPreviewModal
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        filename={pdfFilename}
        document={
          <TeachingLoadSummaryDocument
            collegeName={headerCollegeName}
            semesterLabel={semesterLabel}
            groups={visibleGroups}
            signatories={embeddedSignatories ?? signatories}
            footerBanner={footerBanner}
            headerBanner={branding.insHeaderBannerUrl}
            insFooterText={branding.insFooterText.trim() || branding.footerText}
          />
        }
      />
    </div>
  );
}

/** "A. BACHELOR OF …" per department, lettered within its college. */
function withDepartmentHeadings<T extends Parameters<typeof departmentHeading>[0]>(
  groups: T[],
): (T & { heading: string })[] {
  return groups.map((g, i) => ({ ...g, heading: departmentHeading(g, i) }));
}

function Signer({ name, title, imageUrl }: { name: string; title: string; imageUrl?: string | null }) {
  return (
    <div className="relative min-w-[220px] pt-9 text-center">
      {imageUrl ? (
        // The e-signature sits over the name, as signed on paper.
        // eslint-disable-next-line no-restricted-syntax
        <img
          src={imageUrl}
          alt=""
          className="pointer-events-none absolute left-1/2 top-0 h-14 w-auto max-w-[160px] -translate-x-1/2 object-contain"
        />
      ) : null}
      <div className="relative text-[13px] font-bold uppercase underline underline-offset-2">{name}</div>
      <div className="text-[12px] text-black/75">{title}</div>
    </div>
  );
}

/** Prepared by · Noted by · Recommending Approval · Approved by — laid out as on the college's sheet. */
function SignatureBlock({ signatories }: { signatories: TeachingLoadSignatories }) {
  const lines: [string, TeachingLoadSignatories["notedBy"]][] = [
    ["Noted By:", signatories.notedBy],
    ["Recommending Approval:", signatories.recommendingApproval],
    ["Approved by:", signatories.approvedBy],
  ];
  return (
    <div className="rounded-lg border border-black/10 bg-white px-5 py-6 space-y-6">
      <div>
        <div className="text-[12px] text-black/80">Prepared by:</div>
        <div className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {signatories.preparedBy.map((s, i) => (
            <Signer key={`${s.title}-${i}`} name={s.name} title={s.title} imageUrl={s.imageUrl} />
          ))}
        </div>
      </div>
      {lines.map(([label, s]) => (
        <div key={label} className="grid grid-cols-1 items-start gap-1 sm:grid-cols-[1fr_auto_1fr]">
          <div className="pt-1 text-[12px] text-black/80 sm:text-right">{label}</div>
          <Signer name={s.name} title={s.title} imageUrl={s.imageUrl} />
          <div />
        </div>
      ))}
      {/* Rankings / certifications strip, as at the foot of the college's sheet. */}
      {/* eslint-disable-next-line no-restricted-syntax */}
      <img
        src={DEFAULT_REPORT_FOOTER_BANNER}
        alt="University rankings and certifications"
        className="mx-auto h-auto w-full max-w-[560px] pt-2"
      />
    </div>
  );
}
