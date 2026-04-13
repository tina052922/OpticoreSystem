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
import { shareInsView, shareInsWorkflowBundle } from "@/lib/share-ins";
import { buildWorkflowScheduleBundle } from "@/lib/workflow-schedule-bundle";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { OpticoreInsForm5C } from "@/components/ins/ins-layout/OpticoreInsDocuments";
import { useInsCatalog } from "@/hooks/use-ins-catalog";
import { buildInsRoomView, emptyInsRoomSchedule } from "@/lib/ins/build-ins-room-view";
import { InsScheduleEntitySearch } from "@/components/ins/InsScheduleEntitySearch";
import { InsPublishedBanner } from "@/components/ins/InsPublishedBanner";

type DayKey = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export type INSFormRoomProps = {
  insBasePath?: string;
  chairmanCollegeId?: string | null;
  chairmanProgramId?: string | null;
  chairmanProgramCode?: string | null;
  chairmanProgramName?: string | null;
  viewerCollegeId?: string | null;
  campusWide?: boolean;
};

const DEMO_SCHEDULE: Record<DayKey, Array<{ time: string; course: string; yearSec: string; room: string }>> = {
  Monday: [{ time: "7:00-9:00", course: "IT 203", yearSec: "BSIT 2A", room: "Lab 301" }],
  Tuesday: [{ time: "9:00-11:00", course: "IT 101", yearSec: "BSIT 2B", room: "Room 201" }],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
};

export function INSFormRoom({
  insBasePath = "/chairman/ins",
  chairmanCollegeId,
  chairmanProgramId = null,
  chairmanProgramCode = null,
  chairmanProgramName = null,
  viewerCollegeId = null,
  campusWide = false,
}: INSFormRoomProps) {
  const pathname = usePathname();
  const effectiveCollegeId = chairmanCollegeId ?? viewerCollegeId ?? null;
  const useLiveData = Boolean(effectiveCollegeId || campusWide);

  const catalog = useInsCatalog({
    collegeId: effectiveCollegeId,
    programId: chairmanProgramId,
    campusWide,
  });

  const [selectedRoomId, setSelectedRoomId] = useState("");

  const { schedule, roomLabel } = useMemo(() => {
    if (!useLiveData) {
      return { schedule: DEMO_SCHEDULE, roomLabel: "Room 201 (demo)" };
    }
    if (!catalog.academicPeriodId || !selectedRoomId || catalog.loading) {
      return { schedule: emptyInsRoomSchedule(), roomLabel: "—" };
    }
    return buildInsRoomView({
      entries: catalog.scopedEntries,
      academicPeriodId: catalog.academicPeriodId,
      roomId: selectedRoomId,
      sectionById: catalog.sectionById,
      subjectById: catalog.subjectById,
      roomById: catalog.roomById,
    });
  }, [
    useLiveData,
    catalog.scopedEntries,
    catalog.academicPeriodId,
    selectedRoomId,
    catalog.loading,
    catalog.sectionById,
    catalog.subjectById,
    catalog.roomById,
  ]);

  const displaySchedule = schedule;
  const displayRoom = !useLiveData ? "Room 201 (Building A)" : selectedRoomId ? roomLabel : "—";

  async function onShare() {
    try {
      if (campusWide || !effectiveCollegeId || !catalog.academicPeriodId) {
        await shareInsView("room");
        alert(
          campusWide
            ? "Shared notice (campus-wide: no single-college bundle attached)."
            : "Shared notice. Set a college scope to attach the full INS + Evaluator schedule bundle.",
        );
        return;
      }
      const termScoped = catalog.scopedEntries.filter((e) => e.academicPeriodId === catalog.academicPeriodId);
      const bundle = buildWorkflowScheduleBundle({
        academicPeriodId: catalog.academicPeriodId,
        collegeId: effectiveCollegeId,
        programId: chairmanProgramId,
        programCode: chairmanProgramCode,
        insShareView: "room",
        termScopedEntries: termScoped,
        insContext: { selectedRoomId: selectedRoomId || undefined },
        subjectIdByCode: catalog.subjectIdByCode,
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
    const content = `INS Form 5C — ROOM UTILIZATION\nCEBU TECHNOLOGICAL UNIVERSITY\nRoom: ${displayRoom}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `INS_Form_5C_${new Date().toISOString().split("T")[0]}.txt`;
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
    <div className="p-4 sm:p-6 bg-[#F8F8F8] min-h-full">
      {campusWide ? (
        <div className="mb-4 max-w-[1200px] mx-auto space-y-2">
          <span className="inline-block text-xs font-semibold uppercase tracking-wide text-gray-600 bg-gray-100 border border-gray-200 rounded px-2 py-1">
            Campus-wide · all colleges
          </span>
          {insBasePath.includes("/gec") ? (
            <p className="text-xs text-amber-950 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 max-w-3xl">
              <strong>Vacant GEC slots</strong> in this room schedule use an{" "}
              <span className="text-[#c26100] font-semibold">orange outline</span>.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mb-6 max-w-[1200px] mx-auto">
          <CampusScopeFilters
            variant={chairmanCollegeId !== undefined ? "chairman" : "default"}
            chairmanCollegeId={chairmanCollegeId ?? null}
            chairmanProgramId={chairmanProgramId}
            chairmanProgramCode={chairmanProgramCode}
            chairmanProgramName={chairmanProgramName}
          />
        </div>
      )}

      <div className="max-w-[1200px] mx-auto space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">INS Form</h2>
          <p className="text-gray-600 text-sm">
            Room utilization (5C). Search rooms that have classes this term; a unique match loads that room&apos;s
            schedule automatically.
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

        {useLiveData && catalog.error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{catalog.error}</p>
        ) : null}
        {useLiveData && catalog.periodLabel ? (
          <p className="text-xs text-gray-600">
            Live term: <strong>{catalog.periodLabel}</strong>
            {catalog.loading ? " · Loading…" : null}
          </p>
        ) : null}

        {useLiveData && catalog.termPublishLocked && catalog.periodLabel ? (
          <InsPublishedBanner periodLabel={catalog.periodLabel} />
        ) : null}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {useLiveData ? (
            <InsScheduleEntitySearch
              label="Room (search)"
              placeholder="Type room code (e.g. IT LAB 1)"
              options={catalog.roomOptions}
              selectedId={selectedRoomId}
              onSelectedIdChange={setSelectedRoomId}
              disabled={catalog.loading || catalog.roomOptions.length === 0}
              listId="ins-room-list"
            />
          ) : (
            <p className="text-sm text-gray-500">
              Demo mode: set a college scope or open the DOI campus-wide INS for live room data.
            </p>
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
                          : insBasePath.includes("/gec")
                            ? "/admin/gec/evaluator"
                            : insBasePath.includes("/doi")
                              ? "/doi/evaluator"
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
          <OpticoreInsForm5C roomAssignment={displayRoom} schedule={displaySchedule} />
        </div>
      </div>
    </div>
  );
}
