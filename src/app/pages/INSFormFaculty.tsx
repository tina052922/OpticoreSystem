import { Link, useLocation } from "react-router";
import { MoreHorizontal } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

type DayKey = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export default function INSFormFaculty() {
  const location = useLocation();

  const timeSlots = [
    "7:00-8:00",
    "8:00-9:00",
    "9:00-10:00",
    "10:00-11:00",
    "11:00-12:00",
    "12:00-1:00",
    "1:00-2:00",
    "2:00-3:00",
    "3:00-4:00",
    "4:00-5:00",
    "5:00-6:00",
    "6:00-7:00",
  ];

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

  return (
    <div className="p-8 bg-[#f8f8f8] min-h-full">
      {/* Top Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            {[
              { label: "INS Faculty", to: "/ins-form/faculty" },
              { label: "INS Section", to: "/ins-form/section" },
              { label: "INS Room", to: "/ins-form/room" },
            ].map((t) => {
              const active = location.pathname === t.to;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`h-9 px-4 rounded-[15px] font-['SF_Pro',sans-serif] font-bold text-[14px] flex items-center ${
                    active ? "bg-[#ff990a] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.15)]" : "bg-white text-black"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>

          {/* Search + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-end">
            <div className="w-full sm:w-[280px]">
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

            <Button
              className="bg-[#ff990a] hover:bg-[#e68909] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.15)]"
              onClick={() => window.alert("Conflict detection simulated (Faculty View).")}
            >
              Run Conflict
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white" aria-label="More actions">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={() => window.alert("Download simulated.")}>
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => window.alert("Share simulated.")}>
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => window.print()}>
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => window.alert("View schedules simulated.")}>
                  View Schedules
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              className="bg-white"
              onClick={() => window.print()}
            >
              Print/Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Paper */}
      <div className="bg-white rounded-lg shadow-[0px_4px_10px_0px_rgba(0,0,0,0.10)] p-6 max-w-[1200px] mx-auto">
        {/* Header block (matches paper) */}
        <div className="relative mb-4">
          <div className="text-center">
            <div className="font-['SF_Pro',sans-serif] font-bold text-[16px] text-black">
              CEBU TECHNOLOGICAL UNIVERSITY
            </div>
            <div className="font-['SF_Pro',sans-serif] font-bold text-[14px] text-black mt-1">
              PROGRAM BY TEACHER
            </div>
            <div className="font-['SF_Pro',sans-serif] text-[12px] text-black mt-0.5">
              Day Program
            </div>
            <div className="font-['SF_Pro',sans-serif] text-[12px] text-black">
              ____ Semester, AY ________
            </div>
          </div>

          <div className="absolute right-0 top-0 text-right leading-tight">
            <div className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
              INS FORM 5A
            </div>
            <div className="font-['SF_Pro',sans-serif] text-[11px] text-black">
              March 22, 2026
            </div>
            <div className="font-['SF_Pro',sans-serif] text-[11px] text-black">
              Revision: 2
            </div>
          </div>
        </div>

        {/* Top fields */}
        <div className="border-t border-b border-black py-3 mb-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-1.5">
            <div className="space-y-1.5">
              <div className="flex items-end gap-2">
                <span className="font-['SF_Pro',sans-serif] text-[11px] text-black">Name:</span>
                <span className="flex-1 border-b border-black text-[11px] font-['SF_Pro',sans-serif]">
                  {selectedFaculty}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-['SF_Pro',sans-serif] text-[11px] text-black">
                  Status of Appointment:
                </span>
                <span className="font-['SF_Pro',sans-serif] text-[11px] text-black">
                  ☐ Permanent&nbsp;&nbsp;☐ Temporary&nbsp;&nbsp;☐ Contact of Service
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                <div className="flex items-end gap-2">
                  <span className="font-['SF_Pro',sans-serif] text-[11px] text-black">Bachelor’s Degree:</span>
                  <span className="flex-1 border-b border-black" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-['SF_Pro',sans-serif] text-[11px] text-black">Master’s Degree:</span>
                  <span className="flex-1 border-b border-black" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-['SF_Pro',sans-serif] text-[11px] text-black">Doctorate Degree:</span>
                  <span className="flex-1 border-b border-black" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-['SF_Pro',sans-serif] text-[11px] text-black">Special Training:</span>
                  <span className="flex-1 border-b border-black" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-end gap-2">
                <span className="font-['SF_Pro',sans-serif] text-[11px] text-black">Major:</span>
                <span className="flex-1 border-b border-black" />
                <span className="font-['SF_Pro',sans-serif] text-[11px] text-black ml-3">Minor:</span>
                <span className="flex-1 border-b border-black" />
              </div>
            </div>
          </div>
        </div>

        {/* Body: grid + right signature column (paper-like) */}
        <div className="flex gap-0">
          {/* Timetable */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-collapse border border-black">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 bg-white text-black font-['SF_Pro',sans-serif] text-[11px] font-bold w-[90px]">
                    TIME
                  </th>
                  {(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as DayKey[]).map(
                    (day) => (
                      <th
                        key={day}
                        className="border border-black px-2 py-1 bg-white text-black font-['SF_Pro',sans-serif] text-[11px] font-bold"
                      >
                        {day}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot}>
                    <td className="border border-black px-2 py-2 font-['SF_Pro',sans-serif] text-[10px] text-black text-center whitespace-nowrap">
                      {slot}
                    </td>
                    {(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as DayKey[]).map(
                      (day) => {
                        const daySchedule = schedule[day];
                        const classAtTime = daySchedule.find((c) => c.time.includes(slot.split("-")[0]));
                        const isSampleCell = day === "Monday" && slot === "7:00-8:00" && !classAtTime;
                        return (
                          <td
                            key={day}
                            className="border border-black px-2 py-1 font-['SF_Pro',sans-serif] text-[9px] text-black text-center align-middle min-w-[120px]"
                          >
                            {classAtTime ? (
                              <div className="leading-tight">
                                <div className="font-semibold">{classAtTime.course}</div>
                                <div>{classAtTime.yearSec}</div>
                                <div>{classAtTime.room}</div>
                              </div>
                            ) : isSampleCell ? (
                              <div className="leading-tight text-[9px]">
                                <div>Course code</div>
                                <div>Yr. &amp; Sec.</div>
                                <div>Room</div>
                              </div>
                            ) : null}
                          </td>
                        );
                      },
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right-side signature column (paper) */}
          <div className="hidden lg:block w-[200px] border border-l-0 border-black">
            <div className="h-full flex flex-col">
              <div className="flex-1 border-b border-black flex items-center justify-center">
                <div className="text-center px-3">
                  <div className="font-['SF_Pro',sans-serif] text-[11px] text-black font-semibold mb-10">
                    Approved:
                  </div>
                  <div className="border-b border-black mb-2" />
                  <div className="font-['SF_Pro',sans-serif] text-[10px] text-black">Campus Director</div>
                </div>
              </div>
              <div className="flex-1 border-b border-black flex items-center justify-center">
                <div className="text-center px-3">
                  <div className="font-['SF_Pro',sans-serif] text-[11px] text-black font-semibold mb-10">
                    Reviewed, Certified True and Correct:
                  </div>
                  <div className="border-b border-black mb-2" />
                  <div className="font-['SF_Pro',sans-serif] text-[10px] text-black">Director/Dean</div>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-3">
                  <div className="font-['SF_Pro',sans-serif] text-[11px] text-black font-semibold mb-10">
                    Prepared by:
                  </div>
                  <div className="border-b border-black mb-2" />
                  <div className="font-['SF_Pro',sans-serif] text-[10px] text-black">
                    Program Coordinator/Chair
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary of courses */}
        <div className="mt-3">
          <div className="text-center font-['SF_Pro',sans-serif] font-bold text-[12px] text-black mb-1">
            SUMMARY OF COURSES
          </div>
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr className="bg-[#ff990a]">
                <th className="border border-black px-2 py-1 text-left font-['SF_Pro',sans-serif] text-[11px] text-white font-bold">
                  No. of Students
                </th>
                <th className="border border-black px-2 py-1 text-left font-['SF_Pro',sans-serif] text-[11px] text-white font-bold">
                  Course code
                </th>
                <th className="border border-black px-2 py-1 text-left font-['SF_Pro',sans-serif] text-[11px] text-white font-bold">
                  Descriptive Title
                </th>
                <th className="border border-black px-2 py-1 text-left font-['SF_Pro',sans-serif] text-[11px] text-white font-bold">
                  Degree/Yr/Sec
                </th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c, idx) => (
                <tr key={idx}>
                  <td className="border border-black px-2 py-1 font-['SF_Pro',sans-serif] text-[10px] text-black">
                    {c.students}
                  </td>
                  <td className="border border-black px-2 py-1 font-['SF_Pro',sans-serif] text-[10px] text-black">
                    {c.code}
                  </td>
                  <td className="border border-black px-2 py-1 font-['SF_Pro',sans-serif] text-[10px] text-black">
                    {c.title}
                  </td>
                  <td className="border border-black px-2 py-1 font-['SF_Pro',sans-serif] text-[10px] text-black">
                    {c.degreeYrSec}
                  </td>
                </tr>
              ))}
              {/* empty rows (paper-like) */}
              {Array.from({ length: Math.max(0, 6 - courses.length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-black px-2 py-3" />
                  <td className="border border-black px-2 py-3" />
                  <td className="border border-black px-2 py-3" />
                  <td className="border border-black px-2 py-3" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer stats (paper) */}
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-2">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              "No. of Preparations:",
              "No. of Units:",
              "No. of Hours/Week:",
              "Administrative Designation:",
              "Production:",
              "Extension:",
              "Research:",
            ].map((label) => (
              <div key={label} className="flex items-end gap-2 col-span-1">
                <span className="font-['SF_Pro',sans-serif] text-[11px] text-black whitespace-nowrap">
                  {label}
                </span>
                <span className="flex-1 border-b border-black" />
              </div>
            ))}
          </div>

          {/* Mobile signature block (since right column is hidden) */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {[
              { top: "Prepared by:", bottom: "Program Coordinator/Chair" },
              { top: "Reviewed, Certified True and Correct:", bottom: "Director/Dean" },
              { top: "Approved:", bottom: "Campus Director" },
            ].map((s) => (
              <div key={s.top} className="text-center">
                <div className="font-['SF_Pro',sans-serif] text-[11px] text-black font-semibold mb-8">
                  {s.top}
                </div>
                <div className="border-b border-black mb-2" />
                <div className="font-['SF_Pro',sans-serif] text-[10px] text-black">{s.bottom}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
