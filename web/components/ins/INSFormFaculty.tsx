"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, MoreHorizontal, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shareInsView } from "@/lib/share-ins";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { OpticoreInsForm5A } from "@/components/ins/ins-layout/OpticoreInsDocuments";

type DayKey = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export type INSFormFacultyProps = {
  insBasePath?: string;
  chairmanCollegeId?: string | null;
  chairmanProgramId?: string | null;
  chairmanProgramCode?: string | null;
  chairmanProgramName?: string | null;
};

export function INSFormFaculty({
  insBasePath = "/chairman/ins",
  chairmanCollegeId,
  chairmanProgramId = null,
  chairmanProgramCode = null,
  chairmanProgramName = null,
}: INSFormFacultyProps) {
  const pathname = usePathname();

  const facultyOptions = ["Dr. Maria Santos", "Juan Dela Cruz", "Ana Reyes"];
  const selectedFaculty = "Dr. Maria Santos";

  const schedule: Record<DayKey, Array<{ time: string; course: string; yearSec: string; room: string }>> = {
    Monday: [{ time: "7:00-9:00", course: "IT 203", yearSec: "BSIT 2A", room: "Lab 301" }],
    Tuesday: [{ time: "9:00-11:00", course: "IT 101", yearSec: "BSIT 2B", room: "Room 201" }],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };

  const courses = [
    { students: 42, code: "IT 101", title: "Introduction to Computing", degreeYrSec: "BSIT 2B" },
    { students: 40, code: "IT 203", title: "Data Structures", degreeYrSec: "BSIT 2A" },
  ];

  async function onShare() {
    try {
      await shareInsView("faculty");
      alert("Shared to College Admin inbox (simulated).");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Share failed");
    }
  }

  function handleDownload() {
    const content = `INS Form 5A — PROGRAM BY TEACHER\nCEBU TECHNOLOGICAL UNIVERSITY\nFaculty: ${selectedFaculty}\n`;
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
          <p className="text-gray-600 text-sm">Official INS forms — Program by Teacher (5A), Section (5B), Room (5C).</p>
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

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="w-full lg:max-w-xs">
            <Input
              list="faculty-list"
              placeholder="Search Faculty (by name)"
              className="bg-white"
              aria-label="Search Faculty"
            />
            <datalist id="faculty-list">
              {facultyOptions.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-end">
            <Button
              className="bg-[#FF990A] hover:bg-[#e88909] text-white"
              onClick={() => alert("Conflict detection (Faculty view) — connect to schedule rules when data is live.")}
            >
              Run Conflict
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
                <DropdownMenuItem onClick={() => alert("View schedules — wire to evaluator when integrated.")}>
                  View Schedules
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" className="bg-white" onClick={() => window.print()}>
              Print / PDF
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8 print-paper print:shadow-none">
          <OpticoreInsForm5A facultyName={selectedFaculty} schedule={schedule} courses={courses} />
        </div>
      </div>
    </div>
  );
}
