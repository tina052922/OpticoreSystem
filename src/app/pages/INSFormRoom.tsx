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

export default function INSFormRoom() {
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

  const roomOptions = ["Room 201 (Building A)", "Lab 301 (Building B)", "PC-3211 (Computer Laboratory)"];
  const selectedRoom = "Room 201 (Building A)";

  const schedule: Record<DayKey, Array<{ time: string; course: string; yearSec: string; room: string }>> = {
    Monday: [{ time: "7:00-9:00", course: "IT 203", yearSec: "BSIT 2A", room: "Lab 301" }],
    Tuesday: [{ time: "9:00-11:00", course: "IT 101", yearSec: "BSIT 2B", room: "Room 201" }],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };

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
              <Input list="room-list" placeholder="Search Room" className="bg-white" aria-label="Search Room" />
              <datalist id="room-list">
                {roomOptions.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>

            <Button
              className="bg-[#ff990a] hover:bg-[#e68909] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.15)]"
              onClick={() => window.alert("Conflict detection simulated (Room View).")}
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

            <Button variant="outline" className="bg-white" onClick={() => window.print()}>
              Print/Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Paper */}
      <div className="bg-white rounded-lg shadow-[0px_4px_10px_0px_rgba(0,0,0,0.10)] p-6 max-w-[1200px] mx-auto">
        <div className="relative mb-4">
          <div className="text-center">
            <div className="font-['SF_Pro',sans-serif] font-bold text-[16px] text-black">
              CEBU TECHNOLOGICAL UNIVERSITY
            </div>
            <div className="font-['SF_Pro',sans-serif] font-bold text-[14px] text-black mt-1">
              ROOM UTILIZATION
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
              INS FORM 5C
            </div>
            <div className="font-['SF_Pro',sans-serif] text-[11px] text-black">
              March 22, 2026
            </div>
            <div className="font-['SF_Pro',sans-serif] text-[11px] text-black">
              Revision: 2
            </div>
          </div>
        </div>

        {/* Room assignment field */}
        <div className="border-t border-b border-black py-3 mb-3">
          <div className="flex items-end gap-2">
            <span className="font-['SF_Pro',sans-serif] text-[11px] text-black">Room Assignment:</span>
            <span className="flex-1 border-b border-black text-[11px] font-['SF_Pro',sans-serif]">
              {selectedRoom}
            </span>
          </div>
        </div>

        {/* Timetable */}
        <div className="overflow-x-auto">
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

        {/* Footer signatures (paper) */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
          <div className="text-center">
            <div className="font-['SF_Pro',sans-serif] text-[11px] text-black font-semibold mb-8">
              Prepared by:
            </div>
            <div className="border-b border-black mb-2" />
            <div className="font-['SF_Pro',sans-serif] text-[10px] text-black">
              Program Coordinator/Chair
            </div>
          </div>

          <div className="text-center">
            <div className="font-['SF_Pro',sans-serif] text-[11px] text-black font-semibold mb-8">
              Reviewed, Certified True and Correct:
            </div>
            <div className="border-b border-black mb-2" />
            <div className="font-['SF_Pro',sans-serif] text-[10px] text-black">Director/Dean</div>
          </div>

          <div className="text-center">
            <div className="font-['SF_Pro',sans-serif] text-[11px] text-black font-semibold mb-8">
              Approved:
            </div>
            <div className="border-b border-black mb-2" />
            <div className="font-['SF_Pro',sans-serif] text-[10px] text-black">Campus Director</div>
          </div>
        </div>
      </div>
    </div>
  );
}
