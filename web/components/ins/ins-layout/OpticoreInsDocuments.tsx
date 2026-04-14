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
              suppressHydrationWarning
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
              suppressHydrationWarning
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
<<<<<<< Updated upstream
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" className="rounded border-gray-400" /> Permanent
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" className="rounded border-gray-400" /> Temporary
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" className="rounded border-gray-400" /> Contract of Service
=======
              <label className="flex items-center gap-2 text-sm">
                <input suppressHydrationWarning type="checkbox" className="rounded border-neutral-500" /> Permanent
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input suppressHydrationWarning type="checkbox" className="rounded border-neutral-500" /> Temporary
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input suppressHydrationWarning type="checkbox" className="rounded border-neutral-500" /> Contract of Service
>>>>>>> Stashed changes
              </label>
            </div>
            <div className="flex gap-2 items-end">
              <span>Bachelor&apos;s Degree:</span>
<<<<<<< Updated upstream
              <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
=======
              <input
                suppressHydrationWarning
                type="text"
                className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
              />
>>>>>>> Stashed changes
            </div>
            <div className="flex gap-2 items-end">
              <span>Major:</span>
<<<<<<< Updated upstream
              <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
=======
              <input
                suppressHydrationWarning
                type="text"
                className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
              />
>>>>>>> Stashed changes
            </div>
            <div className="flex gap-2 items-end">
              <span>Master&apos;s Degree:</span>
<<<<<<< Updated upstream
              <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
=======
              <input
                suppressHydrationWarning
                type="text"
                className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
              />
>>>>>>> Stashed changes
            </div>
            <div className="flex gap-2 items-end">
              <span>Minor:</span>
<<<<<<< Updated upstream
              <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
=======
              <input
                suppressHydrationWarning
                type="text"
                className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
              />
>>>>>>> Stashed changes
            </div>
            <div className="flex gap-2 items-end">
              <span>Doctorate Degree:</span>
<<<<<<< Updated upstream
              <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
=======
              <input
                suppressHydrationWarning
                type="text"
                className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
              />
>>>>>>> Stashed changes
            </div>
            <div />
            <div className="md:col-span-2 flex gap-2 items-end">
              <span>Special Training:</span>
<<<<<<< Updated upstream
              <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
=======
              <input
                suppressHydrationWarning
                type="text"
                className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
              />
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
          ))}
          {!readOnly &&
            Array.from({ length: Math.max(0, 4 - courses.length) }).map((_, i) => (
              <div key={`e-${i}`} className="grid grid-cols-4 gap-1 text-[10px]">
                <input type="text" className="border border-gray-300 rounded px-1 py-1 bg-white min-h-[28px]" />
                <input type="text" className="border border-gray-300 rounded px-1 py-1 bg-white min-h-[28px]" />
                <input type="text" className="border border-gray-300 rounded px-1 py-1 bg-white min-h-[28px]" />
                <input type="text" className="border border-gray-300 rounded px-1 py-1 bg-white min-h-[28px]" />
=======
          ) : (
            courses.map((c, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 text-xs">
                {readOnly ? (
                  <>
                    <span className="flex min-h-[2.25rem] items-center border border-neutral-400 bg-white px-2 py-2">
                      {c.students}
                    </span>
                    <span className="flex min-h-[2.25rem] items-center border border-neutral-400 bg-white px-2 py-2">
                      {c.code}
                    </span>
                    <span className="flex min-h-[2.25rem] items-center border border-neutral-400 bg-white px-2 py-2">
                      {c.title}
                    </span>
                    <span className="flex min-h-[2.25rem] items-center border border-neutral-400 bg-white px-2 py-2">
                      {c.degreeYrSec}
                    </span>
                  </>
                ) : (
                  <>
                    <input
                      suppressHydrationWarning
                      type="text"
                      defaultValue={String(c.students)}
                      className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2"
                    />
                    <input
                      suppressHydrationWarning
                      type="text"
                      defaultValue={c.code}
                      className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2"
                    />
                    <input
                      suppressHydrationWarning
                      type="text"
                      defaultValue={c.title}
                      className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2"
                    />
                    <input
                      suppressHydrationWarning
                      type="text"
                      defaultValue={c.degreeYrSec}
                      className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2"
                    />
                  </>
                )}
              </div>
            ))
          )}
          {!readOnly &&
            Array.from({ length: Math.max(0, 4 - courses.length) }).map((_, i) => (
              <div key={`e-${i}`} className="grid grid-cols-4 gap-2 text-xs">
                <input suppressHydrationWarning type="text" className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2" />
                <input suppressHydrationWarning type="text" className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2" />
                <input suppressHydrationWarning type="text" className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2" />
                <input suppressHydrationWarning type="text" className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2" />
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    <div className="flex gap-2 items-end">
      <span className="text-xs shrink-0">{label}:</span>
      <input type="text" className="flex-1 border-0 border-b border-gray-400 bg-transparent outline-none text-sm" />
=======
    <div className="flex items-end gap-3">
      <span className="shrink-0 text-sm">{label}:</span>
      <input
        suppressHydrationWarning
        type="text"
        defaultValue={defaultValue}
        className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
      />
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
        <div className="leading-tight text-[9px] text-gray-500">
=======
        <div className="text-xs leading-relaxed text-neutral-500">
          <div>Course code</div>
          <div>Instructor</div>
          <div>Room</div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-8 text-neutral-900">
      <div className="flex flex-col gap-4 border-b border-neutral-300 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-center text-base font-bold uppercase tracking-wide sm:text-left sm:text-lg">
          Cebu Technological University
        </h3>
        <div className="text-right text-sm">
          <div className="font-semibold">INS FORM 5B</div>
          <div>{formDate()}</div>
          <div>Revision: 2</div>
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h4 className="text-xl font-bold uppercase tracking-wide">Program by Section</h4>
        <div className="text-sm">Day Program</div>
        <div className="inline-block min-w-[min(100%,20rem)] border-b border-neutral-900 px-4 pb-1">
          {readOnly ? (
            <span className="block py-1 text-center text-sm text-neutral-900">{semesterLabel ?? "____ Semester, AY ____"}</span>
          ) : (
            <input
              suppressHydrationWarning
              type="text"
              placeholder="____ Semester, AY ____"
              className="w-full min-w-[16rem] bg-transparent text-center text-sm outline-none placeholder:text-neutral-400"
            />
          )}
        </div>
      </div>

      <div className="space-y-4 text-sm">
        <div className="flex items-end gap-3">
          <span className="shrink-0">Degree and Year:</span>
          {readOnly ? (
            <span className="min-h-[1.5rem] flex-1 border-b border-neutral-900 py-0.5 text-neutral-900">{degreeAndYear}</span>
          ) : (
            <input
              suppressHydrationWarning
              type="text"
              defaultValue={degreeAndYear}
              className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent outline-none"
            />
          )}
        </div>
        <div className="flex items-end gap-3">
          <span className="shrink-0">Adviser:</span>
          {readOnly ? (
            <span className="min-h-[1.5rem] flex-1 border-b border-neutral-900 py-0.5 text-neutral-900">{adviser || "—"}</span>
          ) : (
            <input
              suppressHydrationWarning
              type="text"
              defaultValue={adviser}
              className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent outline-none"
            />
          )}
        </div>
        <div className="flex items-end gap-3">
          <span className="shrink-0">Assignment:</span>
          {readOnly ? (
            <span className="min-h-[1.5rem] flex-1 border-b border-neutral-900 py-0.5 text-neutral-900">{assignment}</span>
          ) : (
            <input
              suppressHydrationWarning
              type="text"
              defaultValue={assignment}
              className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent outline-none"
            />
          )}
        </div>
      </div>

      <OpticoreInsScheduleTableWithSignatures
        renderCell={renderCell}
        signatureSlots={insSignatureSlots}
        scheduleApproved={scheduleApproved}
        signatureStrip="campusOnly"
      />

      <div className="min-h-[14rem] border border-neutral-900 p-4 md:p-6">
        <div className="mb-4 text-center text-sm font-bold uppercase tracking-wide">Summary of Courses</div>
        <div className="mb-3 grid grid-cols-4 gap-2 border-b border-neutral-900 pb-3 text-xs font-semibold">
          <span>No. of Students</span>
          <span>Course code</span>
          <span>Descriptive Title</span>
          <span>Degree/Yr/Sec</span>
        </div>
        <div className="space-y-2">
          {courses.map((c, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-2 text-xs">
              {readOnly ? (
                <>
                  <span className="flex min-h-[2.25rem] items-center border border-neutral-400 bg-white px-2 py-2">
                    {c.students}
                  </span>
                  <span className="flex min-h-[2.25rem] items-center border border-neutral-400 bg-white px-2 py-2">
                    {c.code}
                  </span>
                  <span className="flex min-h-[2.25rem] items-center border border-neutral-400 bg-white px-2 py-2">
                    {c.title}
                  </span>
                  <span className="flex min-h-[2.25rem] items-center border border-neutral-400 bg-white px-2 py-2">
                    {c.degreeYrSec}
                  </span>
                </>
              ) : (
                <>
                  <input
                    suppressHydrationWarning
                    type="text"
                    defaultValue={String(c.students)}
                    className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2"
                  />
                  <input suppressHydrationWarning type="text" defaultValue={c.code} className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2" />
                  <input suppressHydrationWarning type="text" defaultValue={c.title} className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2" />
                  <input
                    suppressHydrationWarning
                    type="text"
                    defaultValue={c.degreeYrSec}
                    className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-200 pt-8 text-center text-xs md:hidden">
        <div className="text-sm font-semibold text-neutral-900">Approved</div>
        <div className="mx-auto mt-3 flex min-h-[4rem] max-w-xs items-end justify-center border-b-2 border-neutral-900 pb-2">
          {scheduleApproved && insSignatureSlots?.[0]?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase public URL
            <img
              src={insSignatureSlots[0].imageUrl}
              alt=""
              className="max-h-16 max-w-full object-contain"
            />
          ) : null}
        </div>
        <div className="mt-2 text-sm text-neutral-800">Campus Director</div>
        {scheduleApproved && insSignatureSlots?.[0]?.signerName ? (
          <div className="mt-1 text-xs font-medium text-neutral-900">{insSignatureSlots[0].signerName}</div>
        ) : !scheduleApproved ? (
          <div className="mt-1 text-[11px] text-neutral-500">Pending publication</div>
        ) : (
          <div className="mt-1 text-[11px] text-amber-900">No signature on file — DOI admin uploads under DOI Profile</div>
        )}
      </div>
    </div>
  );
}

export type OpticoreInsForm5CProps = {
  roomAssignment: string;
  schedule: FacultySchedule;
  scheduleApproved?: boolean;
  insSignatureSlots?: InsSignatureSlot[] | null;
  readOnly?: boolean;
  semesterLabel?: string;
};

/** INS FORM 5C — Room utilization */
export function OpticoreInsForm5C({
  roomAssignment,
  schedule,
  scheduleApproved = false,
  insSignatureSlots = null,
  readOnly = false,
  semesterLabel,
}: OpticoreInsForm5CProps) {
  const prepared = pickSlot(insSignatureSlots, "prepared");
  const review = pickSlot(insSignatureSlots, "review");
  const campus = pickSlot(insSignatureSlots, "campus");

  function renderCell(time: string, day: InsDay) {
    const classAtTime = matchSlot(schedule[day], time);
    if (classAtTime) {
      const inner = (
        <div className="w-full space-y-0.5 text-xs leading-snug">
          <div className="font-semibold">{classAtTime.course}</div>
          <div>{classAtTime.yearSec}</div>
          <div>{classAtTime.room}</div>
        </div>
      );
      if (classAtTime.vacantGec) {
        return (
          <VacantGecSlotHighlight title="Vacant GEC slot (placeholder instructor — assign in Central Hub Evaluator)">
            {inner}
          </VacantGecSlotHighlight>
        );
      }
      return inner;
    }
    if (day === "Monday" && time === "7:00-8:00") {
      return (
        <div className="text-xs leading-relaxed text-neutral-500">
>>>>>>> Stashed changes
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
              suppressHydrationWarning
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

<<<<<<< Updated upstream
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
=======
      <div className="flex items-end gap-3 text-sm">
        <span className="shrink-0">Room Assignment:</span>
        {readOnly ? (
          <span className="min-h-[1.5rem] flex-1 border-b border-neutral-900 py-0.5 text-neutral-900">{roomAssignment}</span>
        ) : (
          <input
            suppressHydrationWarning
            type="text"
            defaultValue={roomAssignment}
            className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent outline-none"
          />
        )}
>>>>>>> Stashed changes
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
