"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Download, MoreHorizontal, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shareInsView } from "@/lib/share-ins";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { OpticoreInsForm5B } from "@/components/ins/ins-layout/OpticoreInsDocuments";
import { useInsCatalog } from "@/hooks/use-ins-catalog";
import { buildInsSectionView, emptyInsSectionSchedule } from "@/lib/ins/build-ins-section-view";
import { InsScheduleEntitySearch } from "@/components/ins/InsScheduleEntitySearch";

type DayKey = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export type INSFormSectionProps = {
  insBasePath?: string;
  chairmanCollegeId?: string | null;
  chairmanProgramId?: string | null;
  chairmanProgramCode?: string | null;
  chairmanProgramName?: string | null;
  viewerCollegeId?: string | null;
};

const DEMO_SCHEDULE: Record<
  DayKey,
  Array<{ time: string; course: string; instructor: string; room: string }>
> = {
  Monday: [{ time: "7:00-9:00", course: "IT 203", instructor: "Dr. Maria Santos", room: "Lab 301" }],
  Tuesday: [{ time: "9:00-11:00", course: "IT 101", instructor: "Juan Dela Cruz", room: "Room 201" }],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
};

const DEMO_COURSES = [
  { students: 40, code: "IT 203", title: "Data Structures", degreeYrSec: "BSIT 2A" },
  { students: 42, code: "IT 101", title: "Introduction to Computing", degreeYrSec: "BSIT 2B" },
];

export function INSFormSection({
  insBasePath = "/chairman/ins",
  chairmanCollegeId,
  chairmanProgramId = null,
  chairmanProgramCode = null,
  chairmanProgramName = null,
  viewerCollegeId = null,
}: INSFormSectionProps) {
  const pathname = usePathname();
  const effectiveCollegeId = chairmanCollegeId ?? viewerCollegeId ?? null;
  const useLiveData = Boolean(effectiveCollegeId);

  const catalog = useInsCatalog({
    collegeId: effectiveCollegeId,
    programId: chairmanProgramId,
  });

  const [selectedSectionId, setSelectedSectionId] = useState("");

  const selectedSectionName =
    catalog.sectionOptions.find((x) => x.id === selectedSectionId)?.name ?? "Section";

  const { schedule, courses } = useMemo(() => {
    if (!useLiveData) {
      return { schedule: DEMO_SCHEDULE, courses: DEMO_COURSES };
    }
    if (!catalog.academicPeriodId || !selectedSectionId || catalog.loading) {
      return { schedule: emptyInsSectionSchedule(), courses: [] };
    }
    return buildInsSectionView({
      entries: catalog.scopedEntries,
      academicPeriodId: catalog.academicPeriodId,
      sectionId: selectedSectionId,
      sectionById: catalog.sectionById,
      subjectById: catalog.subjectById,
      roomById: catalog.roomById,
      userById: catalog.userById,
    });
  }, [
    useLiveData,
    catalog.scopedEntries,
    catalog.academicPeriodId,
    selectedSectionId,
    catalog.loading,
    catalog.sectionById,
    catalog.subjectById,
    catalog.roomById,
    catalog.userById,
  ]);

  const displaySchedule = schedule;
  const displayCourses = courses;
  const displayAssignment = useLiveData ? selectedSectionName : "BSIT 2A (demo)";

  async function onShare() {
    try {
      await shareInsView("section");
      alert("Shared to College Admin inbox (simulated).");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Share failed");
    }
  }

  function handleDownload() {
    const content = `INS Form 5B — PROGRAM BY SECTION\nCEBU TECHNOLOGICAL UNIVERSITY\nSection: ${displayAssignment}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `INS_Form_5B_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function runInsConflict() {
    if (!useLiveData) {
      alert("Connect to Supabase with a college scope to run conflict checks on live data.");
      return;
    }
    const lines = catalog.getInsConflictSummaries();
    if (lines.length === 0) {
      alert("No instructor / room / section time conflicts detected for this college and term.");
    } else {
      alert(`Conflicts:\n\n${lines.join("\n")}`);
    }
  }

  return (
    <div className="p-6 bg-[#F8F8F8] min-h-full">
      <div className="mb-6 max-w-[1200px] mx-auto">
        <CampusScopeFilters
          variant={chairmanCollegeId !== undefined ? "chairman" : "default"}
          chairmanCollegeId={chairmanCollegeId ?? null}
          chairmanProgramId={chairmanProgramId}
          chairmanProgramCode={chairmanProgramCode}
          chairmanProgramName={chairmanProgramName}
        />
      </div>

      <div className="max-w-[1200px] mx-auto space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">INS Form</h2>
          <p className="text-gray-600 text-sm">
            Program by section (5B). Search narrows sections with classes in the current term; when only one matches,
            that section&apos;s schedule appears automatically.
          </p>
        </div>

        <div className="flex gap-2 border-b border-gray-200 flex-wrap">
          {[
            { label: "INS Faculty", href: `${insBasePath}/faculty` },
            { label: "INS Section", href: `${insBasePath}/section` },
            { label: "INS Room", href: `${insBasePath}/room` },
          ].map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`px-6 py-3 font-medium transition-colors rounded-t-lg ${
                  active ? "bg-[#FF990A] text-white" : "text-gray-600 hover:text-gray-800 bg-gray-100"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {useLiveData && catalog.error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{catalog.error}</p>
        ) : null}
        {useLiveData && catalog.periodLabel ? (
          <p className="text-xs text-gray-600">
            Live term: <strong>{catalog.periodLabel}</strong>
            {catalog.loading ? " · Loading…" : null}
          </p>
        ) : null}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {useLiveData ? (
            <InsScheduleEntitySearch
              label="Section (search)"
              placeholder="Type section name (e.g. BSIT-1A)"
              options={catalog.sectionOptions}
              selectedId={selectedSectionId}
              onSelectedIdChange={setSelectedSectionId}
              disabled={catalog.loading || catalog.sectionOptions.length === 0}
              listId="ins-section-list"
            />
          ) : (
            <p className="text-sm text-gray-500">Demo mode: set a college scope for live section data.</p>
          )}

          <div className="flex flex-wrap items-center gap-3 justify-end">
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
                  Download INS Form
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void onShare()}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share INS Form
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print INS Form
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href={
                      insBasePath.includes("/college")
                        ? "/admin/college/evaluator"
                        : insBasePath.includes("/cas")
                          ? "/admin/cas/evaluator"
                          : "/chairman/evaluator"
                    }
                    className="cursor-pointer"
                  >
                    Open Evaluator
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" className="bg-white" type="button" onClick={() => window.print()}>
              Print / PDF
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8 print-paper print:shadow-none">
          <OpticoreInsForm5B
            degreeAndYear={displayAssignment}
            adviser=""
            assignment=""
            schedule={displaySchedule}
            courses={displayCourses}
          />
        </div>
      </div>
    </div>
  );
}
