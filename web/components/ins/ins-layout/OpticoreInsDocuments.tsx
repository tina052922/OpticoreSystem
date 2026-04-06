"use client";

import type { InsDay } from "./opticore-ins-constants";
import { OpticoreInsScheduleTableWithSignatures } from "./OpticoreInsScheduleTable";

const formDate = () =>
  new Intl.DateTimeFormat("en-PH", { month: "long", day: "numeric", year: "numeric" }).format(new Date());

function matchSlot<T extends { time: string }>(daySchedule: T[], slot: string): T | undefined {
  const start = slot.split("-")[0];
  return daySchedule.find((c) => c.time.includes(start));
}

type FacultySchedule = Record<
  InsDay,
  Array<{ time: string; course: string; yearSec: string; room: string }>
>;

export type OpticoreInsForm5AProps = {
  facultyName: string;
  schedule: FacultySchedule;
  courses: Array<{ students: number; code: string; title: string; degreeYrSec: string }>;
  /** Portal / print-friendly: static display, no editable inputs (INS chairman pages stay default). */
  readOnly?: boolean;
  /** Shown in the semester line when `readOnly` is true. */
  semesterLabel?: string;
};

/** INS FORM 5A — Program by Teacher (Opticore-CampusIntelligence layout + editable fields). */
export function OpticoreInsForm5A({ facultyName, schedule, courses, readOnly = false, semesterLabel }: OpticoreInsForm5AProps) {
  function renderCell(time: string, day: InsDay) {
    const classAtTime = matchSlot(schedule[day], time);
    const isPlaceholder = day === "Monday" && time === "7:00-8:00" && !classAtTime;
    if (classAtTime) {
      return (
        <div className="leading-tight text-[9px]">
          <div className="font-semibold">{classAtTime.course}</div>
          <div>{classAtTime.yearSec}</div>
          <div>{classAtTime.room}</div>
        </div>
      );
    }
    if (isPlaceholder) {
      return (
        <div className="leading-tight text-[9px] text-gray-500">
          <div>Course code</div>
          <div>Yr. & Sec.</div>
          <div>Room</div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-6 text-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b border-gray-300 pb-4">
        <h3 className="text-center sm:text-left text-lg font-bold order-2 sm:order-1">CEBU TECHNOLOGICAL UNIVERSITY</h3>
        <div className="text-right text-xs order-1 sm:order-2">
          <div>INS FORM 5A</div>
          <div>{formDate()}</div>
          <div>Revision: 2</div>
        </div>
      </div>

      <div className="text-center space-y-1">
        <h4 className="text-lg font-bold">PROGRAM BY TEACHER</h4>
        <div className="text-sm">Day Program</div>
        <div className="text-sm inline-block border-b border-gray-500 min-w-[200px] px-2">
          {readOnly ? (
            <span className="block text-center text-sm text-gray-900 py-0.5">{semesterLabel ?? "—"}</span>
          ) : (
            <input
              type="text"
              placeholder="Semester, AY"
              className="w-full bg-transparent text-center text-sm outline-none placeholder:text-gray-400"
              aria-label="Semester and academic year"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <span className="shrink-0">Name:</span>
          {readOnly ? (
            <span className="flex-1 min-w-[12rem] border-0 border-b border-gray-400 py-0.5 text-gray-900">{facultyName}</span>
          ) : (
            <input
              type="text"
              defaultValue={facultyName}
              className="flex-1 min-w-[12rem] border-0 border-b border-gray-400 bg-transparent outline-none focus:border-[#FF990A]"
              aria-label="Faculty name"
            />
          )}
        </div>
        {!readOnly ? (
          <>
            <div className="md:col-span-2 flex flex-wrap items-center gap-4">
              <span className="shrink-0">Status of Appointment:</span>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" className="rounded border-gray-400" /> Permanent
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" className="rounded border-gray-400" /> Temporary
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" className="rounded border-gray-400" /> Contract of Service
              </label>
            </div>
            <div className="flex gap-2 items-end">
              <span>Bachelor&apos;s Degree:</span>
              <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
            </div>
            <div className="flex gap-2 items-end">
              <span>Major:</span>
              <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
            </div>
            <div className="flex gap-2 items-end">
              <span>Master&apos;s Degree:</span>
              <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
            </div>
            <div className="flex gap-2 items-end">
              <span>Minor:</span>
              <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
            </div>
            <div className="flex gap-2 items-end">
              <span>Doctorate Degree:</span>
              <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
            </div>
            <div />
            <div className="md:col-span-2 flex gap-2 items-end">
              <span>Special Training:</span>
              <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
            </div>
          </>
        ) : (
          <p className="md:col-span-2 text-xs text-gray-600">
            Full faculty credentials are maintained in <strong>Faculty Profile</strong> (Campus Intelligence). This view shows your official teaching schedule for the term.
          </p>
        )}
      </div>

      <OpticoreInsScheduleTableWithSignatures renderCell={renderCell} />

      <div className="border border-gray-400 rounded-sm p-3">
        <div className="text-center font-bold text-sm mb-2">SUMMARY OF COURSES</div>
        <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold border-b border-gray-300 pb-1 mb-2">
          <span>No. of Students</span>
          <span>Course code</span>
          <span>Descriptive Title</span>
          <span>Degree/Yr/Sec</span>
        </div>
        <div className="space-y-1">
          {courses.map((c, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-1 text-[10px]">
              {readOnly ? (
                <>
                  <span className="border border-gray-300 rounded px-1 py-0.5 bg-white">{c.students}</span>
                  <span className="border border-gray-300 rounded px-1 py-0.5 bg-white">{c.code}</span>
                  <span className="border border-gray-300 rounded px-1 py-0.5 bg-white">{c.title}</span>
                  <span className="border border-gray-300 rounded px-1 py-0.5 bg-white">{c.degreeYrSec}</span>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    defaultValue={String(c.students)}
                    className="border border-gray-300 rounded px-1 py-0.5 bg-white"
                  />
                  <input type="text" defaultValue={c.code} className="border border-gray-300 rounded px-1 py-0.5 bg-white" />
                  <input type="text" defaultValue={c.title} className="border border-gray-300 rounded px-1 py-0.5 bg-white" />
                  <input
                    type="text"
                    defaultValue={c.degreeYrSec}
                    className="border border-gray-300 rounded px-1 py-0.5 bg-white"
                  />
                </>
              )}
            </div>
          ))}
          {!readOnly &&
            Array.from({ length: Math.max(0, 4 - courses.length) }).map((_, i) => (
              <div key={`e-${i}`} className="grid grid-cols-4 gap-1 text-[10px]">
                <input type="text" className="border border-gray-300 rounded px-1 py-1 bg-white min-h-[28px]" />
                <input type="text" className="border border-gray-300 rounded px-1 py-1 bg-white min-h-[28px]" />
                <input type="text" className="border border-gray-300 rounded px-1 py-1 bg-white min-h-[28px]" />
                <input type="text" className="border border-gray-300 rounded px-1 py-1 bg-white min-h-[28px]" />
              </div>
            ))}
        </div>
      </div>

      {!readOnly ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="space-y-3">
              <FieldLine label="No. of Preparations" />
              <FieldLine label="No. of Units" />
              <FieldLine label="No. of Hours/Week" />
            </div>
            <div className="space-y-3">
              <FieldLine label="Administrative Designation" />
              <FieldLine label="Production" />
              <FieldLine label="Extension" />
              <FieldLine label="Research" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs pt-4 border-t border-gray-200 md:hidden">
            <SigBlock title="Prepared by:" subtitle="Program Coordinator/Chair" />
            <SigBlock title="Reviewed, Certified True and Correct:" subtitle="Director/Dean" />
            <SigBlock title="Approved:" subtitle="Campus Director" />
          </div>
        </>
      ) : null}
    </div>
  );
}

function FieldLine({ label }: { label: string }) {
  return (
    <div className="flex gap-2 items-end">
      <span className="text-xs shrink-0">{label}:</span>
      <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
    </div>
  );
}

function SigBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <div className="text-[11px] font-semibold mb-6">{title}</div>
      <div className="border-b border-gray-400 mb-1" />
      <div className="text-[10px]">{subtitle}</div>
    </div>
  );
}

type SectionSchedule = Record<InsDay, Array<{ time: string; course: string; instructor: string; room: string }>>;

export type OpticoreInsForm5BProps = {
  degreeAndYear: string;
  adviser: string;
  assignment: string;
  schedule: SectionSchedule;
  courses: Array<{ students: number; code: string; title: string; degreeYrSec: string }>;
  readOnly?: boolean;
  semesterLabel?: string;
};

/** INS FORM 5B — Program by Section */
export function OpticoreInsForm5B({
  degreeAndYear,
  adviser,
  assignment,
  schedule,
  courses,
  readOnly = false,
  semesterLabel,
}: OpticoreInsForm5BProps) {
  function renderCell(time: string, day: InsDay) {
    const row = schedule[day].find((c) => c.time.includes(time.split("-")[0]));
    if (row) {
      return (
        <div className="leading-tight text-[9px]">
          <div className="font-semibold">{row.course}</div>
          <div>{row.instructor}</div>
          <div>{row.room}</div>
        </div>
      );
    }
    if (day === "Monday" && time === "7:00-8:00") {
      return (
        <div className="leading-tight text-[9px] text-gray-500">
          <div>Course code</div>
          <div>Yr. & Sec.</div>
          <div>Room</div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-6 text-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b border-gray-300 pb-4">
        <h3 className="text-center sm:text-left text-lg font-bold">CEBU TECHNOLOGICAL UNIVERSITY</h3>
        <div className="text-right text-xs">
          <div>INS FORM 5B</div>
          <div>{formDate()}</div>
          <div>Revision: 2</div>
        </div>
      </div>

      <div className="text-center space-y-1">
        <h4 className="text-lg font-bold">PROGRAM BY SECTION</h4>
        <div className="text-sm">Day Program</div>
        <div className="text-sm inline-block border-b border-gray-500 min-w-[200px] px-2">
          {readOnly ? (
            <span className="block text-center text-sm text-gray-900 py-0.5">{semesterLabel ?? "—"}</span>
          ) : (
            <input type="text" placeholder="Semester, AY" className="w-full bg-transparent text-center text-sm outline-none" />
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex gap-2 items-end">
          <span>Degree and Year:</span>
          {readOnly ? (
            <span className="flex-1 border-b border-gray-400 py-0.5 text-gray-900">{degreeAndYear}</span>
          ) : (
            <input
              type="text"
              defaultValue={degreeAndYear}
              className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none"
            />
          )}
        </div>
        <div className="flex gap-2 items-end">
          <span>Adviser:</span>
          {readOnly ? (
            <span className="flex-1 border-b border-gray-400 py-0.5 text-gray-900">{adviser || "—"}</span>
          ) : (
            <input type="text" defaultValue={adviser} className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none" />
          )}
        </div>
        <div className="flex gap-2 items-end">
          <span>Assignment:</span>
          {readOnly ? (
            <span className="flex-1 border-b border-gray-400 py-0.5 text-gray-900">{assignment}</span>
          ) : (
            <input
              type="text"
              defaultValue={assignment}
              className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none"
            />
          )}
        </div>
      </div>

      <OpticoreInsScheduleTableWithSignatures renderCell={renderCell} />

      <div className="border border-gray-400 rounded-sm p-3">
        <div className="text-center font-bold text-sm mb-2">SUMMARY OF COURSES</div>
        <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold border-b border-gray-300 pb-1 mb-2">
          <span>No. of Students</span>
          <span>Course code</span>
          <span>Descriptive Title</span>
          <span>Degree/Yr/Sec</span>
        </div>
        <div className="space-y-1">
          {courses.map((c, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-1 text-[10px]">
              {readOnly ? (
                <>
                  <span className="border border-gray-300 rounded px-1 bg-white">{c.students}</span>
                  <span className="border border-gray-300 rounded px-1 bg-white">{c.code}</span>
                  <span className="border border-gray-300 rounded px-1 bg-white">{c.title}</span>
                  <span className="border border-gray-300 rounded px-1 bg-white">{c.degreeYrSec}</span>
                </>
              ) : (
                <>
                  <input type="text" defaultValue={String(c.students)} className="border border-gray-300 rounded px-1 bg-white" />
                  <input type="text" defaultValue={c.code} className="border border-gray-300 rounded px-1 bg-white" />
                  <input type="text" defaultValue={c.title} className="border border-gray-300 rounded px-1 bg-white" />
                  <input type="text" defaultValue={c.degreeYrSec} className="border border-gray-300 rounded px-1 bg-white" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {!readOnly ? (
        <div className="text-center text-xs pt-4 md:hidden">
          <div className="inline-block w-48 border-b border-gray-400 mb-1" />
          <div>Approved: Campus Director</div>
        </div>
      ) : null}
    </div>
  );
}

export type OpticoreInsForm5CProps = {
  roomAssignment: string;
  schedule: FacultySchedule;
};

/** INS FORM 5C — Room utilization */
export function OpticoreInsForm5C({ roomAssignment, schedule }: OpticoreInsForm5CProps) {
  function renderCell(time: string, day: InsDay) {
    const classAtTime = matchSlot(schedule[day], time);
    if (classAtTime) {
      return (
        <div className="leading-tight text-[9px]">
          <div className="font-semibold">{classAtTime.course}</div>
          <div>{classAtTime.yearSec}</div>
          <div>{classAtTime.room}</div>
        </div>
      );
    }
    if (day === "Monday" && time === "7:00-8:00") {
      return (
        <div className="leading-tight text-[9px] text-gray-500">
          <div>Course code</div>
          <div>Yr. & Sec.</div>
          <div>Room</div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-6 text-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b border-gray-300 pb-4">
        <h3 className="text-center sm:text-left text-lg font-bold">CEBU TECHNOLOGICAL UNIVERSITY</h3>
        <div className="text-right text-xs">
          <div>INS FORM 5C</div>
          <div>{formDate()}</div>
          <div>Revision: 2</div>
        </div>
      </div>

      <div className="text-center space-y-1">
        <h4 className="text-lg font-bold">ROOM UTILIZATION</h4>
        <div className="text-sm">Day Program</div>
        <div className="text-sm inline-block border-b border-gray-500 min-w-[200px] px-2">
          <input type="text" placeholder="Semester, AY" className="w-full bg-transparent text-center text-sm outline-none" />
        </div>
      </div>

      <div className="flex gap-2 items-end text-sm">
        <span>Room Assignment:</span>
        <input
          type="text"
          defaultValue={roomAssignment}
          className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none"
        />
      </div>

      <OpticoreInsScheduleTableWithSignatures renderCell={renderCell} />

      <div className="space-y-8 text-xs pt-4">
        <FooterSig label="Prepared by:" role="Program Coordinator/Chair" />
        <FooterSig label="Reviewed, Certified True and Correct:" role="Director/Dean" />
        <FooterSig label="Approved:" role="Campus Director" />
      </div>
    </div>
  );
}

function FooterSig({ label, role }: { label: string; role: string }) {
  return (
    <div>
      <div>{label}</div>
      <div className="mt-6 max-w-xs border-b border-gray-400" />
      <div className="mt-1">{role}</div>
    </div>
  );
}
