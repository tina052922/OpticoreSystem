"use client";

import type { ReactNode } from "react";
import type { InsFacultyCell, InsFacultyFormSummary } from "@/lib/ins/build-ins-faculty-view";
import type { InsSignatureSlot } from "@/lib/ins/ins-signature-slots";
import type { InsDay } from "./opticore-ins-constants";
import { OpticoreInsScheduleTableWithSignatures } from "./OpticoreInsScheduleTable";

/** GEC Chairman / campus-wide INS: make unfilled GEC/GEE placeholder slots obvious at a glance. */
function VacantGecSlotHighlight(props: { title: string; children: ReactNode }) {
  return (
    <div
      className="w-full rounded-md border-[3px] border-[#FF990A] bg-amber-50/95 p-1 shadow-[inset_0_0_0_1px_rgba(180,83,9,0.22)]"
      title={props.title}
    >
      <div className="mb-0.5 text-center text-[7px] font-black uppercase tracking-widest leading-none text-[#a35600]">
        Vacant GEC
      </div>
      {props.children}
    </div>
  );
}

const formDate = () =>
  new Intl.DateTimeFormat("en-PH", { month: "long", day: "numeric", year: "numeric" }).format(new Date());

function CredLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-end gap-3 text-sm">
      <span className="shrink-0 text-neutral-800">{label}:</span>
      <span className="min-h-[1.5rem] flex-1 break-words border-b border-neutral-900 text-neutral-900">
        {value?.trim() ? value : "—"}
      </span>
    </div>
  );
}

function matchSlot(daySchedule: InsFacultyCell[], slot: string): InsFacultyCell | undefined {
  const start = slot.split("-")[0];
  return daySchedule.find((c) => c.time.includes(start));
}

type FacultySchedule = Record<InsDay, InsFacultyCell[]>;

export type OpticoreInsForm5AProps = {
  facultyName: string;
  schedule: FacultySchedule;
  courses: Array<{ students: number; code: string; title: string; degreeYrSec: string }>;
  /** Portal / print-friendly: static display, no editable inputs (INS chairman pages stay default). */
  readOnly?: boolean;
  /** Shown in the semester line when `readOnly` is true. */
  semesterLabel?: string;
  /** VPAA-published term: show signature column images + resolved signers. */
  scheduleApproved?: boolean;
  insSignatureSlots?: InsSignatureSlot[] | null;
  /** When read-only, fill degree lines from Faculty Profile when available. */
  facultyCredentials?: {
    bachelors?: string | null;
    master?: string | null;
    doctorate?: string | null;
    major?: string | null;
    minor?: string | null;
    specialTraining?: string | null;
  } | null;
  /** Populated from schedule totals + Faculty Profile when live data is available. */
  facultyFormSummary?: InsFacultyFormSummary | null;
  /** My Schedule (faculty portal): cells with `scheduleEntryId` become buttons to request a change. */
  clickableScheduleEntryCells?: boolean;
  onScheduleEntryClick?: (scheduleEntryId: string) => void;
};

/** INS FORM 5A — Program by Teacher (Opticore-CampusIntelligence layout + editable fields). */
export function OpticoreInsForm5A({
  facultyName,
  schedule,
  courses,
  readOnly = false,
  semesterLabel,
  scheduleApproved = false,
  insSignatureSlots = null,
  facultyCredentials = null,
  facultyFormSummary = null,
  clickableScheduleEntryCells = false,
  onScheduleEntryClick,
}: OpticoreInsForm5AProps) {
  function renderCell(time: string, day: InsDay) {
    const classAtTime = matchSlot(schedule[day], time);
    const isPlaceholder = day === "Monday" && time === "7:00-8:00" && !classAtTime;
    if (classAtTime) {
      const inner = (
        <div className="w-full space-y-0.5 text-xs leading-snug">
          <div className="font-semibold">{classAtTime.course}</div>
          <div>{classAtTime.yearSec}</div>
          <div>{classAtTime.room}</div>
        </div>
      );
      const entryId = classAtTime.scheduleEntryId;
      const canRequest =
        readOnly &&
        clickableScheduleEntryCells &&
        typeof onScheduleEntryClick === "function" &&
        Boolean(entryId) &&
        !classAtTime.vacantGec;
      const body = canRequest ? (
        <button
          type="button"
          className="w-full text-left rounded-md p-0.5 -m-0.5 transition-[box-shadow,background] hover:bg-[#ff990a]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/50 cursor-pointer"
          title="Request schedule change for this class"
          onClick={() => entryId && onScheduleEntryClick(entryId)}
        >
          {inner}
        </button>
      ) : (
        inner
      );
      if (classAtTime.vacantGec) {
        return (
          <VacantGecSlotHighlight title="Vacant GEC slot (placeholder instructor — assign in Central Hub Evaluator)">
            {inner}
          </VacantGecSlotHighlight>
        );
      }
      return body;
    }
    if (isPlaceholder) {
      return (
        <div className="text-xs leading-relaxed text-neutral-500">
          <div>Course code</div>
          <div>Yr. & Sec.</div>
          <div>Room</div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-8 text-neutral-900">
      <div className="flex flex-col gap-4 border-b border-neutral-300 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="order-2 text-center text-base font-bold uppercase tracking-wide sm:order-1 sm:text-left sm:text-lg">
          Cebu Technological University
        </h3>
        <div className="order-1 text-right text-sm sm:order-2">
          <div className="font-semibold">INS FORM 5A</div>
          <div>{formDate()}</div>
          <div>Revision: 2</div>
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h4 className="text-xl font-bold uppercase tracking-wide">Program by Teacher</h4>
        <div className="text-sm">Day Program</div>
        <div className="inline-block min-w-[min(100%,20rem)] border-b border-neutral-900 px-4 pb-1">
          {readOnly ? (
            <span className="block py-1 text-center text-sm text-neutral-900">{semesterLabel ?? "____ Semester, AY ____"}</span>
          ) : (
            <input
              type="text"
              placeholder="____ Semester, AY ____"
              className="w-full min-w-[16rem] bg-transparent text-center text-sm outline-none placeholder:text-neutral-400"
              aria-label="Semester and academic year"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-10 gap-y-4 text-sm md:grid-cols-2">
        <div className="flex flex-wrap items-end gap-3 md:col-span-2">
          <span className="shrink-0">Name:</span>
          {readOnly ? (
            <span className="min-h-[1.5rem] flex-1 min-w-[12rem] border-b border-neutral-900 py-0.5 text-neutral-900">
              {facultyName}
            </span>
          ) : (
            <input
              type="text"
              defaultValue={facultyName}
              className="min-h-[1.5rem] flex-1 min-w-[12rem] border-0 border-b border-neutral-900 bg-transparent outline-none focus:border-[#FF990A]"
              aria-label="Faculty name"
            />
          )}
        </div>
        {!readOnly ? (
          <>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 md:col-span-2">
              <span className="shrink-0">Status of Appointment:</span>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border-neutral-500" /> Permanent
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border-neutral-500" /> Temporary
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border-neutral-500" /> Contract of Service
              </label>
            </div>
            <div className="flex items-end gap-3">
              <span>Bachelor&apos;s Degree:</span>
              <input
                type="text"
                className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
              />
            </div>
            <div className="flex items-end gap-3">
              <span>Major:</span>
              <input
                type="text"
                className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
              />
            </div>
            <div className="flex items-end gap-3">
              <span>Master&apos;s Degree:</span>
              <input
                type="text"
                className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
              />
            </div>
            <div className="flex items-end gap-3">
              <span>Minor:</span>
              <input
                type="text"
                className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
              />
            </div>
            <div className="flex items-end gap-3">
              <span>Doctorate Degree:</span>
              <input
                type="text"
                className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
              />
            </div>
            <div />
            <div className="flex items-end gap-3 md:col-span-2">
              <span>Special Training:</span>
              <input
                type="text"
                className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
              />
            </div>
          </>
        ) : facultyCredentials ? (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <CredLine label={"Bachelor's Degree"} value={facultyCredentials.bachelors} />
            <CredLine label="Major" value={facultyCredentials.major} />
            <CredLine label="Master&apos;s Degree" value={facultyCredentials.master} />
            <CredLine label="Minor" value={facultyCredentials.minor} />
            <CredLine label="Doctorate Degree" value={facultyCredentials.doctorate} />
            <CredLine label="Special Training" value={facultyCredentials.specialTraining} />
          </div>
        ) : (
          <p className="md:col-span-2 text-xs text-gray-600">
            Full faculty credentials are maintained in <strong>Faculty Profile</strong> (Campus Intelligence). This view shows your official teaching schedule for the term.
          </p>
        )}
      </div>

      <OpticoreInsScheduleTableWithSignatures
        renderCell={renderCell}
        signatureSlots={insSignatureSlots}
        scheduleApproved={scheduleApproved}
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
          {courses.length === 0 && readOnly ? (
            <div className="grid grid-cols-4 gap-2 text-xs text-neutral-800">
              <span className="min-h-[2.25rem] border border-neutral-400 bg-neutral-50 px-2 py-2">—</span>
              <span className="min-h-[2.25rem] border border-neutral-400 bg-neutral-50 px-2 py-2">—</span>
              <span className="min-h-[2.25rem] border border-neutral-400 bg-neutral-50 px-2 py-2 col-span-2 text-left leading-snug">
                No courses plotted for this faculty in the selected term. Use Evaluator to add schedule rows.
              </span>
            </div>
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
                      type="text"
                      defaultValue={String(c.students)}
                      className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2"
                    />
                    <input
                      type="text"
                      defaultValue={c.code}
                      className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2"
                    />
                    <input
                      type="text"
                      defaultValue={c.title}
                      className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2"
                    />
                    <input
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
                <input type="text" className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2" />
                <input type="text" className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2" />
                <input type="text" className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2" />
                <input type="text" className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2" />
              </div>
            ))}
        </div>

        <div className="mt-8 border-t border-neutral-900 pt-6">
          <div className="grid grid-cols-1 gap-x-10 gap-y-4 text-sm md:grid-cols-2">
            <div className="space-y-4">
              {readOnly ? (
                <>
                  <CredLine
                    label="No. of Preparations"
                    value={facultyFormSummary != null ? String(facultyFormSummary.preparations) : null}
                  />
                  <CredLine
                    label="No. of Units"
                    value={facultyFormSummary != null ? String(facultyFormSummary.totalUnits) : null}
                  />
                  <CredLine
                    label="No. of Hours/Week"
                    value={facultyFormSummary != null ? String(facultyFormSummary.hoursPerWeek) : null}
                  />
                </>
              ) : (
                <>
                  <FieldLine
                    label="No. of Preparations"
                    defaultValue={facultyFormSummary != null ? String(facultyFormSummary.preparations) : ""}
                  />
                  <FieldLine
                    label="No. of Units"
                    defaultValue={facultyFormSummary != null ? String(facultyFormSummary.totalUnits) : ""}
                  />
                  <FieldLine
                    label="No. of Hours/Week"
                    defaultValue={facultyFormSummary != null ? String(facultyFormSummary.hoursPerWeek) : ""}
                  />
                </>
              )}
            </div>
            <div className="space-y-4">
              {readOnly ? (
                <>
                  <CredLine label="Administrative Designation" value={facultyFormSummary?.administrativeDesignation} />
                  <CredLine label="Production" value={facultyFormSummary?.production} />
                  <CredLine label="Extension" value={facultyFormSummary?.extension} />
                  <CredLine label="Research" value={facultyFormSummary?.research} />
                </>
              ) : (
                <>
                  <FieldLine
                    label="Administrative Designation"
                    defaultValue={facultyFormSummary?.administrativeDesignation ?? ""}
                  />
                  <FieldLine label="Production" defaultValue={facultyFormSummary?.production ?? ""} />
                  <FieldLine label="Extension" defaultValue={facultyFormSummary?.extension ?? ""} />
                  <FieldLine label="Research" defaultValue={facultyFormSummary?.research ?? ""} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {!readOnly ? (
        <div className="grid grid-cols-1 gap-8 border-t border-neutral-200 pt-8 text-xs sm:grid-cols-3 md:hidden">
          <SigBlock title="Prepared by:" subtitle="Program Coordinator/Chair" />
          <SigBlock title="Reviewed, Certified True and Correct:" subtitle="Director/Dean" />
          <SigBlock title="Approved:" subtitle="Campus Director" />
        </div>
      ) : null}
    </div>
  );
}

function FieldLine({ label, defaultValue = "" }: { label: string; defaultValue?: string }) {
  return (
    <div className="flex items-end gap-3">
      <span className="shrink-0 text-sm">{label}:</span>
      <input
        type="text"
        defaultValue={defaultValue}
        className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

function SigBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <div className="mb-8 text-[11px] font-semibold leading-snug">{title}</div>
      <div className="mb-2 border-b border-neutral-900" />
      <div className="text-[10px] text-neutral-800">{subtitle}</div>
    </div>
  );
}

function pickSlot(slots: InsSignatureSlot[] | null | undefined, key: string) {
  return slots?.find((s) => s.key === key);
}

/** Paper-style footer for Form 5C: two columns; digital signatures when published. */
function RoomForm5CFooterBlock({
  title,
  roleLabel,
  slot,
  scheduleApproved,
}: {
  title: string;
  roleLabel: string;
  slot: InsSignatureSlot | undefined;
  scheduleApproved: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold leading-snug">{title}</div>
      <div className="flex min-h-[4rem] items-end justify-center border-b-2 border-neutral-900 pb-2">
        {scheduleApproved && slot?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded public URLs
          <img src={slot.imageUrl} alt="" className="max-h-16 max-w-full object-contain" />
        ) : null}
      </div>
      <div className="text-sm text-neutral-900">{roleLabel}</div>
      {scheduleApproved && slot ? (
        <div className="text-center text-xs text-neutral-600">{slot.signerName}</div>
      ) : scheduleApproved ? (
        <div className="text-center text-[11px] text-amber-900">No signature on file — upload in Profile</div>
      ) : (
        <div className="text-center text-[11px] text-neutral-500">Pending publication</div>
      )}
    </div>
  );
}

type SectionScheduleCell = {
  time: string;
  course: string;
  instructor: string;
  room: string;
  vacantGec?: boolean;
};
type SectionSchedule = Record<InsDay, SectionScheduleCell[]>;

export type OpticoreInsForm5BProps = {
  degreeAndYear: string;
  adviser: string;
  assignment: string;
  schedule: SectionSchedule;
  courses: Array<{ students: number; code: string; title: string; degreeYrSec: string }>;
  readOnly?: boolean;
  semesterLabel?: string;
  scheduleApproved?: boolean;
  insSignatureSlots?: InsSignatureSlot[] | null;
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
  scheduleApproved = false,
  insSignatureSlots = null,
}: OpticoreInsForm5BProps) {
  function renderCell(time: string, day: InsDay) {
    const row = schedule[day].find((c) => c.time.includes(time.split("-")[0]));
    if (row) {
      const inner = (
        <div className="w-full space-y-0.5 text-xs leading-snug">
          <div className="font-semibold">{row.course}</div>
          <div>{row.instructor}</div>
          <div>{row.room}</div>
        </div>
      );
      if (row.vacantGec) {
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
                    type="text"
                    defaultValue={String(c.students)}
                    className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2"
                  />
                  <input type="text" defaultValue={c.code} className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2" />
                  <input type="text" defaultValue={c.title} className="min-h-[2.25rem] border border-neutral-400 bg-white px-2 py-2" />
                  <input
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
          <div>Course code</div>
          <div>Yr. & Sec.</div>
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
          <div className="font-semibold">INS FORM 5C</div>
          <div>{formDate()}</div>
          <div>Revision: 2</div>
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h4 className="text-xl font-bold uppercase tracking-wide">Room Utilization</h4>
        <div className="text-sm">Day Program</div>
        <div className="inline-block min-w-[min(100%,20rem)] border-b border-neutral-900 px-4 pb-1">
          {readOnly ? (
            <span className="block py-1 text-center text-sm text-neutral-900">{semesterLabel ?? "____ Semester, AY ____"}</span>
          ) : (
            <input
              type="text"
              placeholder="____ Semester, AY ____"
              className="w-full min-w-[16rem] bg-transparent text-center text-sm outline-none placeholder:text-neutral-400"
              aria-label="Semester and academic year"
            />
          )}
        </div>
      </div>

      <div className="flex items-end gap-3 text-sm">
        <span className="shrink-0">Room Assignment:</span>
        {readOnly ? (
          <span className="min-h-[1.5rem] flex-1 border-b border-neutral-900 py-0.5 text-neutral-900">{roomAssignment}</span>
        ) : (
          <input
            type="text"
            defaultValue={roomAssignment}
            className="min-h-[1.5rem] flex-1 border-0 border-b border-neutral-900 bg-transparent outline-none"
          />
        )}
      </div>

      <OpticoreInsScheduleTableWithSignatures
        renderCell={renderCell}
        signatureSlots={insSignatureSlots}
        scheduleApproved={scheduleApproved}
        signatureStrip="none"
      />

      <div className="mt-12 grid grid-cols-1 gap-x-16 gap-y-12 border-t border-neutral-200 pt-12 md:grid-cols-2">
        <div className="space-y-12">
          <RoomForm5CFooterBlock
            title="Prepared by:"
            roleLabel="Program Coordinator/Chair"
            slot={prepared}
            scheduleApproved={scheduleApproved}
          />
          <RoomForm5CFooterBlock
            title="Reviewed, Certified True and Correct:"
            roleLabel="Director/Dean"
            slot={review}
            scheduleApproved={scheduleApproved}
          />
        </div>
        <div>
          <RoomForm5CFooterBlock
            title="Approved:"
            roleLabel="Campus Director"
            slot={campus}
            scheduleApproved={scheduleApproved}
          />
        </div>
      </div>
    </div>
  );
}
