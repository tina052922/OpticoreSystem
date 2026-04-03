import { useState } from "react";
import { Link, useLocation } from "react-router";

const scheduleData = [
  {
    id: 1,
    major: "BSIT",
    section: "3A",
    students: 42,
    subjectCode: "ITE 311",
    instructor: "Enoc, AB",
    room: "PC-3211",
    time: "7:00-9:00",
    day: "M",
    facultyConflict: false,
    sectionConflict: false,
  },
  {
    id: 2,
    major: "BSIT",
    section: "3A",
    students: 42,
    subjectCode: "ITE 312",
    instructor: "Enoc, AB",
    room: "PC-3211L",
    time: "9:00-11:00",
    day: "M",
    facultyConflict: false,
    sectionConflict: false,
  },
  {
    id: 3,
    major: "BSIT",
    section: "3A",
    students: 42,
    subjectCode: "ITE 313",
    instructor: "Enoc, AB",
    room: "CL3",
    time: "7:00-11:00",
    day: "W",
    facultyConflict: false,
    sectionConflict: false,
  },
  {
    id: 4,
    major: "BSIT",
    section: "3A",
    students: 42,
    subjectCode: "ITE 314",
    instructor: "Enoc, AB",
    room: "CL3",
    time: "7:00-10:00",
    day: "Th",
    facultyConflict: false,
    sectionConflict: false,
  },
  {
    id: 5,
    major: "BSIT",
    section: "3A",
    students: 42,
    subjectCode: "GE 101",
    instructor: "Tomol, CJ",
    room: "CL4",
    time: "8:00-10:00",
    day: "T",
    facultyConflict: false,
    sectionConflict: false,
  },
  {
    id: 6,
    major: "BSCS",
    section: "2A",
    students: 38,
    subjectCode: "CS 201",
    instructor: "Narte, K",
    room: "PC-3210",
    time: "10:00-11:00",
    day: "Th",
    facultyConflict: true,
    sectionConflict: false,
  },
];

const weeklySchedule = {
  Monday: [
    { time: "7:00-9:00", subject: "ITE 311", room: "PC-3211", section: "BSIT 3A" },
    { time: "9:00-11:00", subject: "ITE 312", room: "PC-3211L", section: "BSIT 3A" },
  ],
  Tuesday: [
    { time: "8:00-10:00", subject: "GE 101", room: "CL4", section: "BSIT 3A" },
  ],
  Wednesday: [
    { time: "7:00-11:00", subject: "ITE 313", room: "CL3", section: "BSIT 3A" },
  ],
  Thursday: [
    { time: "7:00-10:00", subject: "ITE 314", room: "CL3", section: "BSIT 3A" },
  ],
  Friday: [],
  Saturday: [],
  Sunday: [],
};

export default function EvaluatorTimetabling() {
  const location = useLocation();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="font-['SF_Pro',sans-serif] font-semibold text-[40px] text-black mb-2">
          Evaluator - Timetabling & Optimization
        </h2>
        <p className="font-['SF_Pro',sans-serif] font-normal text-[16px] text-black">
          Optimize schedules and resolve conflicts.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <Link
          to="/evaluator"
          className={`px-6 py-3 font-['SF_Pro',sans-serif] font-semibold text-[16px] rounded-lg ${
            location.pathname === "/evaluator"
              ? "bg-[#ff990a] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
              : "bg-white text-black"
          }`}
        >
          Timetabling & Optimization
        </Link>
        <Link
          to="/evaluator/hrs-units"
          className={`px-6 py-3 font-['SF_Pro',sans-serif] font-semibold text-[16px] rounded-lg ${
            location.pathname === "/evaluator/hrs-units"
              ? "bg-[#ff990a] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
              : "bg-white text-black"
          }`}
        >
          Hrs-Units-Preps-Remarks
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Schedule Table - 2/3 width */}
        <div className="col-span-2">
          <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#ff990a]">
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Major
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Section
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Students
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Subject Code
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Instructor
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Room
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Time
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Day
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Faculty Conflict
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Section Conflict
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleData.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {item.major}
                      </td>
                      <td className="px-3 py-2 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {item.section}
                      </td>
                      <td className="px-3 py-2 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {item.students}
                      </td>
                      <td className="px-3 py-2 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {item.subjectCode}
                      </td>
                      <td className="px-3 py-2 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {item.instructor}
                      </td>
                      <td className="px-3 py-2 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {item.room}
                      </td>
                      <td className="px-3 py-2 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {item.time}
                      </td>
                      <td className="px-3 py-2 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {item.day}
                      </td>
                      <td className="px-3 py-2">
                        {item.facultyConflict ? (
                          <span className="px-2 py-1 bg-red-500 text-white text-[10px] rounded">
                            Conflict
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-500 text-white text-[10px] rounded">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {item.sectionConflict ? (
                          <span className="px-2 py-1 bg-red-500 text-white text-[10px] rounded">
                            Conflict
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-500 text-white text-[10px] rounded">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button className="bg-[#ff990a] text-white px-6 py-3 rounded-lg font-['SF_Pro',sans-serif] font-semibold text-[16px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] hover:bg-[#e68909] transition-colors">
            Alternative Suggestion
          </button>
        </div>

        {/* Schedule Preview Panel - 1/3 width */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-4 sticky top-4">
            <h3 className="font-['SF_Pro',sans-serif] font-semibold text-[18px] text-black mb-4 border-b pb-2">
              Schedule Preview (INS Form View)
            </h3>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {Object.entries(weeklySchedule).map(([day, classes]) => (
                <div key={day}>
                  <h4 className="font-['SF_Pro',sans-serif] font-semibold text-[14px] text-[#ff990a] mb-2">
                    {day}
                  </h4>
                  {classes.length > 0 ? (
                    <div className="space-y-2">
                      {classes.map((cls, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 p-3 rounded border-l-4 border-[#ff990a]"
                        >
                          <p className="font-['SF_Pro',sans-serif] font-semibold text-[12px] text-black">
                            {cls.subject}
                          </p>
                          <p className="font-['SF_Pro',sans-serif] text-[11px] text-gray-600">
                            {cls.time}
                          </p>
                          <p className="font-['SF_Pro',sans-serif] text-[11px] text-gray-600">
                            Room: {cls.room}
                          </p>
                          <p className="font-['SF_Pro',sans-serif] text-[11px] text-gray-600">
                            Section: {cls.section}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-['SF_Pro',sans-serif] text-[12px] text-gray-400 italic">
                      No classes scheduled
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
