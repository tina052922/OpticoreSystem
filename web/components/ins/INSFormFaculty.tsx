"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { OpticoreInsForm5A } from "@/components/ins/ins-layout/OpticoreInsDocuments";
import { InsScheduleEntitySearch } from "@/components/ins/InsScheduleEntitySearch";
import { useInsLiveSchedule } from "@/hooks/use-ins-live-schedule";

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

export type INSFormFacultyProps = {
  insBasePath?: string;
  chairmanCollegeId?: string | null;
  chairmanProgramId?: string | null;
  chairmanProgramCode?: string | null;
  chairmanProgramName?: string | null;
  /** When set (e.g. College Admin), live schedule uses this college even without chairman session props. */
  viewerCollegeId?: string | null;
};

export function INSFormFaculty({
  insBasePath = "/chairman/ins",
  chairmanCollegeId,
  chairmanProgramId = null,
  chairmanProgramCode = null,
  chairmanProgramName = null,
  viewerCollegeId = null,
}: INSFormFacultyProps) {
  const pathname = usePathname();

  const effectiveCollegeId = chairmanCollegeId ?? viewerCollegeId ?? null;
  const useLiveData = Boolean(effectiveCollegeId);

  const live = useInsLiveSchedule({
    collegeId: effectiveCollegeId,
    programId: chairmanProgramId,
  });

  const selectedFacultyName =
    live.instructorOptions.find((x) => x.id === live.selectedInstructorId)?.name ?? "Search faculty";

  const displaySchedule = useLiveData ? live.schedule : DEMO_SCHEDULE;
  const displayCourses = useLiveData ? live.courses : DEMO_COURSES;
  const displayFacultyName = useLiveData ? selectedFacultyName : "Dr. Maria Santos (demo)";

  async function onShare() {
    try {
      await shareInsView("faculty");
      alert("Shared to College Admin inbox.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Share failed");
    }
  }

  function handleDownload() {
    const content = `INS Form 5A — PROGRAM BY TEACHER\nCEBU TECHNOLOGICAL UNIVERSITY\nFaculty: ${displayFacultyName}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `INS_Form_5A_${new Date().toISOString().split("T")[0]}.txt`;
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
    const lines = live.getInsConflictSummaries();
    if (lines.length === 0) {
      alert("No instructor / room / section time conflicts detected for this college and term.");
    } else {
      alert(`Conflicts:\n\n${lines.join("\n")}`);
    }
  }

  return (
    <div className="p-4 sm:p-6 bg-[#F8F8F8] min-h-full">
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
            Official INS forms — Program by Teacher (5A), Section (5B), Room (5C). Faculty view reflects{" "}
            <strong>Evaluator / ScheduleEntry</strong> data when a college is in scope (updates via Supabase
            Realtime).
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
                className={`px-3 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors rounded-t-lg ${
                  active ? "bg-[#FF990A] text-white" : "text-gray-600 hover:text-gray-800 bg-gray-100"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {useLiveData && live.error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{live.error}</p>
        ) : null}
        {useLiveData && live.periodLabel ? (
          <p className="text-xs text-gray-600">
            Live term: <strong>{live.periodLabel}</strong>
            {live.loading ? " · Loading…" : null}
          </p>
        ) : null}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="w-full lg:max-w-md space-y-1">
            {useLiveData ? (
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
                  <p className="text-xs text-amber-800">No faculty with classes this term yet — use Evaluator to plot.</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-gray-500">Demo mode: set a college scope (Chairman or College Admin) for live data.</p>
            )}
          </div>

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
          <OpticoreInsForm5A facultyName={displayFacultyName} schedule={displaySchedule} courses={displayCourses} />
        </div>
      </div>
    </div>
  );
}
