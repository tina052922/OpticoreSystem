"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Eye, MoreHorizontal, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shareInsView, shareInsWorkflowBundle } from "@/lib/share-ins";
import { buildWorkflowScheduleBundle } from "@/lib/workflow-schedule-bundle";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { OpticoreInsForm5A } from "@/components/ins/ins-layout/OpticoreInsDocuments";
import { InsScheduleEntitySearch } from "@/components/ins/InsScheduleEntitySearch";
import { useInsLiveSchedule } from "@/hooks/use-ins-live-schedule";
import { InsPublishedBanner } from "@/components/ins/InsPublishedBanner";
import { InsEntityGroupingStrip, insTabHref } from "@/components/ins/InsEntityGroupingStrip";
import { InsSignerLabelsEditor } from "@/components/ins/InsSignerLabelsEditor";
import { useInsInnerTabIsActive } from "@/hooks/use-ins-inner-tab-active";
import { DoiInsFormalApprovalPanel } from "@/components/doi/DoiInsFormalApprovalPanel";
import { PDFPreviewModal } from "@/components/pdf/preview/PDFPreviewModal";
import { INS5ADocument } from "@/components/pdf/forms/INS5ADocument";
import { facultyScheduleToPdfGrid, signatureSlotsToPdf } from "@/lib/ins/ins-pdf-adapters";
import type { INS5AProps } from "@/components/pdf/types/insTypes";
import { useProgramMode } from "@/contexts/ProgramModeContext";
import { useCampusBranding } from "@/contexts/CampusBrandingContext";
import { insPdfBrandingProps } from "@/lib/system-configuration/campus-branding";
import { ProgramModeToggle } from "@/components/scheduling/ProgramModeToggle";
import { isFacultyInsPortal } from "@/lib/ins/schedule-visibility";

type DayKey = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

const DEMO_SCHEDULE: Record<DayKey, Array<{ time: string; course: string; yearSec: string; room: string }>> = {
  Monday: [{ time: "7:00-9:00", course: "IT 203", yearSec: "BSIT 2A", room: "Lab 301" }],
  Tuesday: [{ time: "9:00-11:00", course: "IT 101", yearSec: "BSIT 2B", room: "Room 201" }],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
};

const DEMO_COURSES = [
  { students: 42, code: "IT 101", title: "Introduction to Computing", degreeYrSec: "BSIT 2B" },
  { students: 40, code: "IT 203", title: "Data Structures", degreeYrSec: "BSIT 2A" },
];

/**
 * Faculty INS (Form 5A) uses `useInsLiveSchedule` with **college-wide** schedule rows for the selected instructor
 * so **Hours/Week** matches the faculty portal and chairman evaluator policy (cross-program load).
 *
 * **Policy justification (manual test):** overload the same instructor in the **Evaluator** (all their sections
 * across programs) past the cap; on Save, the justification modal should open. INS totals should reflect the
 * same entries after refresh — if they differ, hard-refresh and confirm migrations + `ignoreProgramScope` deploy.
 */
export type INSFormFacultyProps = {
  insBasePath?: string;
  chairmanCollegeId?: string | null;
  chairmanProgramId?: string | null;
  chairmanProgramCode?: string | null;
  chairmanProgramName?: string | null;
  /** When set (e.g. College Admin), live schedule uses this college even without chairman session props. */
  viewerCollegeId?: string | null;
  /** Logged-in faculty: lock the grid to this instructor. */
  lockedInstructorId?: string | null;
  /** Hide faculty search. Faculty portal always hides it when `lockedInstructorId` is set. */
  hideInstructorSearch?: boolean;
  /** DOI / VPAA: load all colleges’ schedule rows for INS Form 5A. */
  campusWide?: boolean;
  /** DOI: VPAA approval + campus conflict scan (must be rendered here — Server Components cannot pass render props into this client component). */
  doiFormalApprovalPanel?: boolean;
  /** Combined INS page (e.g. faculty portal): hide Faculty/Section/Room sub-tabs — parent provides tabs. */
  hideInnerInsTabs?: boolean;
};

export function INSFormFaculty({
  insBasePath = "/chairman/ins",
  chairmanCollegeId,
  chairmanProgramId = null,
  chairmanProgramCode = null,
  chairmanProgramName = null,
  viewerCollegeId = null,
  lockedInstructorId = null,
  hideInstructorSearch = false,
  campusWide = false,
  doiFormalApprovalPanel = false,
  hideInnerInsTabs = false,
}: INSFormFacultyProps) {
  const { programMode } = useProgramMode();
  const branding = useCampusBranding();
  const effectiveCollegeId = chairmanCollegeId ?? viewerCollegeId ?? null;
  const useLiveData = Boolean(effectiveCollegeId || campusWide);
  /** Instructor shell (`/faculty/ins`, `/faculty/schedule`). */
  const facultyPortalIns = isFacultyInsPortal(insBasePath);
  const instructorReadOnlyPortal = Boolean(facultyPortalIns && lockedInstructorId);
  const showInstructorSearch =
    Boolean(useLiveData) && !hideInstructorSearch && !instructorReadOnlyPortal;
  const facultyInnerActive = useInsInnerTabIsActive(insBasePath, "faculty");
  const sectionInnerActive = useInsInnerTabIsActive(insBasePath, "section");
  const roomInnerActive = useInsInnerTabIsActive(insBasePath, "room");

  const live = useInsLiveSchedule({
    collegeId: effectiveCollegeId,
    programId: chairmanProgramId,
    lockedInstructorId,
    campusWide,
    /** Faculty portal Form 5A is always this instructor — never another faculty’s personal schedule. */
    instructorPortalUserId: instructorReadOnlyPortal || hideInstructorSearch ? lockedInstructorId : null,
  });

  /** College Admin + DOI: allow one-click GA apply; chairmen use the Evaluator for edits. */
  const enableInsAltApply =
    (campusWide || insBasePath.includes("/college")) && useLiveData && !live.termPublishLocked;
  const [insAltBusy, setInsAltBusy] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  const displaySchedule = useLiveData ? live.schedule : DEMO_SCHEDULE;
  const displayCourses = useLiveData ? live.courses : DEMO_COURSES;
  const displayFacultyName = useLiveData ? live.selectedFacultyDisplayName : "Dr. Maria Santos (demo)";

  const pdfData = useMemo((): INS5AProps => ({
    facultyName: displayFacultyName,
    semesterLabel: (useLiveData ? live.periodLabel : undefined) ?? "____ Semester, AY ____",
    statusOfAppointment: null,
    credentials: useLiveData && live.facultyCredentials ? {
      bachelors: live.facultyCredentials.bachelors,
      masters: live.facultyCredentials.master,
      doctorate: live.facultyCredentials.doctorate,
      major: live.facultyCredentials.major,
      minor: live.facultyCredentials.minor,
      specialTraining: live.facultyCredentials.specialTraining,
    } : null,
    schedule: facultyScheduleToPdfGrid(displaySchedule, programMode),
    courses: displayCourses,
    summary: useLiveData ? live.facultyFormSummary : null,
    signatureSlots: signatureSlotsToPdf(useLiveData ? live.insSignatureSlots : null),
    programMode,
    ...insPdfBrandingProps(branding),
  }), [displayFacultyName, displaySchedule, displayCourses, useLiveData, live.periodLabel, live.facultyCredentials, live.facultyFormSummary, live.insSignatureSlots, programMode, branding]);

  async function onShare() {
    try {
      if (campusWide || !effectiveCollegeId || !live.academicPeriodId) {
        await shareInsView("faculty");
        alert(
          campusWide
            ? "Shared notice to College Admin (campus-wide: no single-college bundle attached)."
            : "Shared notice. Set a college scope to attach the full INS + Evaluator schedule bundle.",
        );
        return;
      }
      const termScoped = live.insResourceEntries.filter((e) => e.academicPeriodId === live.academicPeriodId);
      const bundle = buildWorkflowScheduleBundle({
        academicPeriodId: live.academicPeriodId,
        collegeId: effectiveCollegeId,
        programId: chairmanProgramId,
        programCode: chairmanProgramCode,
        insShareView: "faculty",
        termScopedEntries: termScoped,
        insContext: { selectedFacultyId: live.selectedInstructorId || undefined },
        subjectIdByCode: live.subjectIdByCode,
      });
      await shareInsWorkflowBundle(bundle);
      alert(
        `Shared to College Admin with ${bundle.scheduleEntries.length} linked schedule row(s) (INS + Evaluator drafts).`,
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Share failed");
    }
  }

  function handleDownload() {
    setPdfPreviewOpen(true);
  }

  async function runInsConflict() {
    if (!useLiveData) {
      alert("Set a college scope to run conflict checks on live data.");
      return;
    }
    const result = await live.runInsConflictCheck();
    if (result.conflictingCount === 0) {
      alert(result.message);
    } else {
      alert(`Conflict check\n\n${result.message}`);
    }
  }

  async function applyFirstInsAlternative() {
    if (!live.selectedInstructorId) {
      alert("Select a faculty member first.");
      return;
    }
    const id = live.getFirstConflictingEntryIdForInstructor(live.selectedInstructorId);
    if (!id) {
      alert("No conflicting schedule row found for this instructor.");
      return;
    }
    setInsAltBusy(true);
    try {
      const r = await live.applyInsConflictAlternative(id);
      alert(r.message);
    } finally {
      setInsAltBusy(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 bg-[#F8F8F8] min-h-full">
      <div className="no-print">
        {!lockedInstructorId && !campusWide ? (
          <div className="mb-6 max-w-[1200px] mx-auto">
            <CampusScopeFilters
              variant={chairmanCollegeId !== undefined ? "chairman" : "default"}
              chairmanCollegeId={chairmanCollegeId ?? null}
              chairmanProgramId={chairmanProgramId}
              chairmanProgramCode={chairmanProgramCode}
              chairmanProgramName={chairmanProgramName}
            />
          </div>
        ) : null}
        <div className="max-w-[1200px] mx-auto space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-800 mb-0">INS Form</h2>
            <ProgramModeToggle size="sm" />
          </div>

          {doiFormalApprovalPanel ? (
            <DoiInsFormalApprovalPanel
              periodId={live.academicPeriodId}
              periods={live.periods}
              onPeriodIdChange={live.setAcademicPeriodId}
              reloadCatalog={live.reload}
            />
          ) : null}

          {(insBasePath.includes("/admin/college") || insBasePath.includes("/doi")) && !lockedInstructorId && useLiveData ? (
            <InsSignerLabelsEditor
              mode={insBasePath.includes("/doi") ? "doi" : "college"}
              collegeId={live.signerEditorCollegeId}
              onUpdated={() => void live.reload()}
            />
          ) : null}

          {!hideInnerInsTabs ? (
            <div className="flex gap-2 border-b border-gray-200 flex-wrap">
              {(
                [
                  { label: "Faculty view", tab: "faculty" as const, href: insTabHref(insBasePath, "faculty"), active: facultyInnerActive },
                  { label: "Section view", tab: "section" as const, href: insTabHref(insBasePath, "section"), active: sectionInnerActive },
                  { label: "Room view", tab: "room" as const, href: insTabHref(insBasePath, "room"), active: roomInnerActive },
                ] as const
              ).map((t) => (
                <Link
                  key={t.tab}
                  href={t.href}
                  className={`px-3 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors rounded-t-lg ${
                    t.active ? "bg-[#FF990A] text-white" : "text-gray-600 hover:text-gray-800 bg-gray-100"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          ) : null}

          {useLiveData && insBasePath && (!lockedInstructorId || hideInnerInsTabs) ? (
            <InsEntityGroupingStrip
              insBasePath={insBasePath}
              facultyCount={live.instructorOptions.length}
              sectionCount={live.sectionOptions.length}
              roomCount={live.roomOptions.length}
            />
          ) : null}

          {useLiveData && live.error ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 no-print">
              {live.error}
            </p>
          ) : null}
          {useLiveData && !instructorReadOnlyPortal && live.insConflictLinesForFaculty.length > 0 ? (
            <div
              className="rounded-lg border border-amber-300 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 space-y-1.5 no-print"
              role="status"
            >
              <p className="font-semibold">Schedule conflicts involving this instructor</p>
              <p className="text-xs text-amber-950/85">The form below stays printable. Resolve overlaps in your scheduling tool.</p>
              <ul className="list-disc pl-5 text-xs space-y-1">
                {live.insConflictLinesForFaculty.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              {enableInsAltApply ? (
                <div className="pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-red-400/80 bg-white text-red-950 hover:bg-red-50"
                    disabled={insAltBusy || !live.selectedInstructorId}
                    onClick={() => void applyFirstInsAlternative()}
                  >
                    {insAltBusy ? "Applying…" : "Apply alternative solution (first conflict)"}
                  </Button>
                  <p className="mt-1 text-[10px] text-amber-950/80">Adjusts one overlapping class using the suggested fix.</p>
                </div>
              ) : null}
            </div>
          ) : null}
          {useLiveData && live.periodLabel ? (
            <p className={`text-xs text-gray-600 ${instructorReadOnlyPortal ? "no-print" : ""}`}>
              Term: <strong>{live.periodLabel}</strong>
              {live.loading ? " · Loading…" : null}
            </p>
          ) : null}

          {useLiveData && live.termPublishLocked && live.periodLabel ? (
            <InsPublishedBanner periodLabel={live.periodLabel} />
          ) : null}

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="w-full lg:max-w-md space-y-3">
              {useLiveData ? (
                <>
                  {lockedInstructorId ? (
                    <div className="rounded-lg border border-[var(--color-opticore-orange)]/30 bg-[var(--color-opticore-orange)]/10 px-3 py-2">
                      <p className="text-xs font-semibold text-black/60 uppercase tracking-wide">
                        Your teaching load
                      </p>
                      <p className="text-sm font-medium text-black">{displayFacultyName}</p>
                    </div>
                  ) : null}
                  {showInstructorSearch ? (
                    <>
                      <InsScheduleEntitySearch
                        label="Faculty / instructor (search)"
                        placeholder="Type name — schedule updates when one match"
                        options={live.instructorOptions}
                        selectedId={live.selectedInstructorId}
                        onSelectedIdChange={live.setSelectedInstructorId}
                        disabled={live.loading || live.instructorOptions.length === 0}
                        listId="ins-faculty-list"
                      />
                      {!live.loading && live.instructorOptions.length === 0 ? (
                        <p className="text-xs text-amber-800">
                          No faculty with classes this term yet — use Evaluator to plot.
                        </p>
                      ) : null}
                    </>
                  ) : lockedInstructorId && !live.loading && live.instructorOptions.length === 0 ? (
                    <p className="text-xs text-amber-800">No classes assigned to you this term yet.</p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-gray-500">No college scope — preview only.</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-end">
              {instructorReadOnlyPortal ? (
                <Button variant="outline" className="bg-white" type="button" onClick={() => setPdfPreviewOpen(true)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview PDF
                  </Button>
              ) : (
                <>
                  {enableInsAltApply && live.insConflictLinesForFaculty.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-400/80 bg-red-50/90 text-red-950 hover:bg-red-100"
                      disabled={insAltBusy || !live.selectedInstructorId}
                      onClick={() => void applyFirstInsAlternative()}
                    >
                      {insAltBusy ? "Applying…" : "Apply alternative"}
                    </Button>
                  ) : null}
                  <Button className="bg-[#FF990A] hover:bg-[#e88909] text-white" type="button" onClick={runInsConflict}>
                    Run Conflict Check
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-white" aria-label="More actions">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={handleDownload}>
                        <Download className="w-4 h-4 mr-2" />
                        Download / Save as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void onShare()}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share INS Form
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPdfPreviewOpen(true)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href={
                            insBasePath.includes("/college")
                              ? "/admin/college/evaluator"
                              : insBasePath.includes("/cas")
                                ? "/admin/cas/evaluator"
                                : insBasePath.includes("/gec")
                                  ? "/admin/gec/evaluator"
                                  : insBasePath.includes("/doi")
                                    ? "/doi/evaluator"
                                    : insBasePath.startsWith("/faculty/ins")
                                      ? "/faculty"
                                      : "/chairman/evaluator"
                          }
                          className="cursor-pointer"
                        >
                          {insBasePath.startsWith("/faculty/ins") ? "Faculty home" : "Open Evaluator"}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="outline" className="bg-white" type="button" onClick={() => setPdfPreviewOpen(true)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview PDF
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-10 shadow-sm print-paper print:shadow-none">
            <OpticoreInsForm5A
              facultyName={displayFacultyName}
              schedule={displaySchedule}
              courses={displayCourses}
              readOnly={
                Boolean(lockedInstructorId && facultyPortalIns) ||
                Boolean(useLiveData && live.termPublishLocked)
              }
              semesterLabel={useLiveData ? live.periodLabel : undefined}
              scheduleApproved={Boolean(useLiveData && live.termPublishLocked)}
              insSignatureSlots={useLiveData ? live.insSignatureSlots : null}
              facultyCredentials={useLiveData && live.termPublishLocked ? live.facultyCredentials : null}
              facultyFormSummary={useLiveData ? live.facultyFormSummary : null}
              conflictingScheduleEntryIds={useLiveData ? live.insConflictingEntryIds : null}
            />
          </div>
        </div>
      </div>

      {/* Print-only: always render the official paper-style INS form (no page chrome, no editable boxes). */}
      <div className="print-only hidden print:block print-paper ins-print-one-page ins-print-avoid-break">
        <OpticoreInsForm5A
          facultyName={displayFacultyName}
          schedule={displaySchedule}
          courses={displayCourses}
          readOnly
          semesterLabel={useLiveData ? live.periodLabel : undefined}
          scheduleApproved={Boolean(useLiveData && live.termPublishLocked)}
          insSignatureSlots={useLiveData ? live.insSignatureSlots : null}
          facultyCredentials={useLiveData ? live.facultyCredentials : null}
          facultyFormSummary={useLiveData ? live.facultyFormSummary : null}
          conflictingScheduleEntryIds={useLiveData ? live.insConflictingEntryIds : null}
        />
      </div>

      <PDFPreviewModal
        filename={`INS-5A-${displayFacultyName.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`}
        open={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
        document={<INS5ADocument data={pdfData} />}
      />
    </div>
  );
}
