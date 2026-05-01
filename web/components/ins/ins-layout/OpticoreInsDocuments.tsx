"use client";

import type { InsFacultyCell, InsFacultyFormSummary } from "@/lib/ins/build-ins-faculty-view";
import type { InsRoomCell, InsRoomSchedule } from "@/lib/ins/build-ins-room-view";
import type { InsTimedCell } from "@/lib/ins/ins-weekly-grid-span";
import type { InsSignatureSlot } from "@/lib/ins/ins-signature-slots";
import type { InsDay } from "./opticore-ins-constants";
import { OpticoreInsScheduleTableWithSignatures } from "./OpticoreInsScheduleTable";

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
  return (
    <div className="space-y-8 print:space-y-1.5 text-neutral-900 print:text-[7.5pt] print:leading-tight">
      <div className="flex flex-col gap-4 print:gap-1 border-b border-neutral-300 pb-6 print:pb-1.5 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="order-2 text-center text-base font-bold uppercase tracking-wide sm:order-1 sm:text-left sm:text-lg print:text-[9pt] print:leading-none">
          Cebu Technological University
        </h3>
        <div className="order-1 text-right text-sm sm:order-2 print:text-[7.5pt]">
          <div className="font-semibold">INS FORM 5A</div>
          <div>{formDate()}</div>
          <div>Revision: 2</div>
        </div>
      </div>

      <div className="space-y-2 print:space-y-0 text-center">
        <h4 className="text-xl font-bold uppercase tracking-wide print:text-[10pt] print:leading-none">Program by Teacher</h4>
        <div className="text-sm print:text-[7.5pt]">Day Program</div>
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

      <div className="grid grid-cols-1 gap-x-10 gap-y-4 print:gap-y-0.5 print:gap-x-4 text-sm md:grid-cols-2 print:text-[7.5pt]">
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
        cellMode="spanned"
        cellsByDay={schedule as Record<InsDay, InsTimedCell[]>}
        showMondayPlaceholder={!readOnly}
        renderSpanned={({ items, paperFormRow }) => {
          if (paperFormRow) {
            return (
              <div className="text-xs leading-relaxed text-neutral-500">
                <div>Course code</div>
                <div>Yr. & Sec.</div>
                <div>Room</div>
              </div>
            );
          }
          return (
            <div className="w-full space-y-1 pr-1 print:space-y-0 print:flex print:flex-row print:flex-wrap print:gap-x-2 print:gap-y-0.5 print:items-start print:justify-start">
              {(items as InsFacultyCell[]).slice(0, 3).map((classAtTime, idx) => {
                const inner = (
                  <div className="w-full space-y-0.5 text-xs leading-snug break-words print:inline-flex print:max-w-full print:flex-wrap print:items-baseline print:gap-x-1 print:gap-y-0 print:text-[6.5pt] print:leading-tight">
                    <span className="font-semibold break-words">{classAtTime.course}</span>
                    <span className="text-[10px] text-neutral-600 print:text-[6pt] print:text-neutral-800">
                      {classAtTime.time}
                    </span>
                    <span className="break-words">{classAtTime.yearSec}</span>
                    <span className="break-words">{classAtTime.room}</span>
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
                return <div key={classAtTime.scheduleEntryId ?? `${classAtTime.time}-${idx}`}>{body}</div>;
              })}
              {(items as InsFacultyCell[]).length > 3 ? (
                <div className="text-[10px] text-neutral-600 print:hidden">
                  +{(items as InsFacultyCell[]).length - 3} more…
                </div>
              ) : null}
            </div>
          );
        }}
        signatureSlots={insSignatureSlots}
        scheduleApproved={scheduleApproved}
      />

      <div className="min-h-[14rem] print:min-h-0 border border-neutral-900 p-4 md:p-6 print:p-1.5 ins-print-avoid-break">
        <div className="mb-4 print:mb-1 text-center text-sm font-bold uppercase tracking-wide print:text-[8pt]">
          Summary of Courses
        </div>
        <div className="mb-2 print:mb-0.5 border-b border-neutral-900 pb-2 print:pb-0.5 text-xs font-semibold print:text-[7.5pt]">
          <div className="grid grid-cols-4 gap-2 print:gap-0.5">
            <span>No. of Students</span>
            <span>Course code</span>
            <span>Descriptive Title</span>
            <span>Degree/Yr/Sec</span>
          </div>
        </div>
        <div className="space-y-1 print:space-y-0 print:leading-tight">
          {courses.length === 0 && readOnly ? (
            <div className="grid grid-cols-4 gap-2 text-xs text-neutral-800">
              <span className="min-h-[1.4rem] px-1 py-1">—</span>
              <span className="min-h-[1.4rem] px-1 py-1">—</span>
              <span className="min-h-[1.4rem] px-1 py-1 col-span-2 text-left leading-snug">
                No courses plotted for this faculty in the selected term. Use Evaluator to add schedule rows.
              </span>
            </div>
          ) : (
            courses.map((c, idx) => (
              <div
                key={idx}
                className="grid grid-cols-4 gap-2 print:gap-0.5 text-xs border-b border-black/10 last:border-b-0 print:text-[7pt]"
              >
                {readOnly ? (
                  <>
                    <span className="flex min-h-[1.4rem] print:min-h-0 items-center bg-white px-1 py-1 print:py-0">
                      {c.students}
                    </span>
                    <span className="flex min-h-[1.4rem] print:min-h-0 items-center bg-white px-1 py-1 print:py-0">
                      {c.code}
                    </span>
                    <span className="flex min-h-[1.4rem] print:min-h-0 items-center bg-white px-1 py-1 print:py-0 leading-snug">
                      {c.title}
                    </span>
                    <span className="flex min-h-[1.4rem] print:min-h-0 items-center bg-white px-1 py-1 print:py-0">
                      {c.degreeYrSec}
                    </span>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      defaultValue={String(c.students)}
                      className="min-h-[1.6rem] border-0 border-b border-neutral-900 bg-transparent px-1 py-1 outline-none"
                    />
                    <input
                      type="text"
                      defaultValue={c.code}
                      className="min-h-[1.6rem] border-0 border-b border-neutral-900 bg-transparent px-1 py-1 outline-none"
                    />
                    <input
                      type="text"
                      defaultValue={c.title}
                      className="min-h-[1.6rem] border-0 border-b border-neutral-900 bg-transparent px-1 py-1 outline-none"
                    />
                    <input
                      type="text"
                      defaultValue={c.degreeYrSec}
                      className="min-h-[1.6rem] border-0 border-b border-neutral-900 bg-transparent px-1 py-1 outline-none"
                    />
                  </>
                )}
              </div>
            ))
          )}
          {!readOnly &&
            Array.from({ length: Math.max(0, 4 - courses.length) }).map((_, i) => (
              <div key={`e-${i}`} className="grid grid-cols-4 gap-2 text-xs border-b border-black/10 last:border-b-0">
                <input type="text" className="min-h-[1.6rem] border-0 border-b border-neutral-900 bg-transparent px-1 py-1 outline-none" />
                <input type="text" className="min-h-[1.6rem] border-0 border-b border-neutral-900 bg-transparent px-1 py-1 outline-none" />
                <input type="text" className="min-h-[1.6rem] border-0 border-b border-neutral-900 bg-transparent px-1 py-1 outline-none" />
                <input type="text" className="min-h-[1.6rem] border-0 border-b border-neutral-900 bg-transparent px-1 py-1 outline-none" />
              </div>
            ))}
        </div>

        <div className="mt-6 print:mt-1.5 border-t border-neutral-900 pt-4 print:pt-1">
          <div className="grid grid-cols-1 gap-x-10 gap-y-4 print:gap-y-0.5 text-sm md:grid-cols-2 print:text-[7.5pt]">
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
  startTime?: string;
  endTime?: string;
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
  /** Print layout is compact (see `ins-print-one-page`); list every row — do not truncate the summary table. */
  const shownCourses = courses;
  const hiddenCourseCount = 0;

  return (
    <div className="space-y-8 print:space-y-1.5 text-neutral-900 print:text-[7.5pt] print:leading-tight">
      <div className="flex flex-col gap-4 print:gap-1 border-b border-neutral-300 pb-6 print:pb-1.5 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-center text-base font-bold uppercase tracking-wide sm:text-left sm:text-lg print:text-[9pt] print:leading-none">
          Cebu Technological University
        </h3>
        <div className="text-right text-sm print:text-[7.5pt]">
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

      <div className="space-y-4 print:space-y-2 text-sm">
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
        cellMode="spanned"
        cellsByDay={schedule as Record<InsDay, InsTimedCell[]>}
        showMondayPlaceholder={!readOnly}
        renderSpanned={({ items, paperFormRow }) => {
          if (paperFormRow) {
            return (
              <div className="text-xs leading-relaxed text-neutral-500">
                <div>Course code</div>
                <div>Instructor</div>
                <div>Room</div>
              </div>
            );
          }
          return (
            <div className="w-full space-y-1 pr-1">
              {(items as SectionScheduleCell[]).slice(0, 3).map((row, idx) => {
                const inner = (
                  <div key={`${row.time}-${idx}`} className="w-full space-y-0.5 text-xs leading-snug break-words">
                    <div className="font-semibold break-words">{row.course}</div>
                    <div className="text-[10px] text-neutral-600">{row.time}</div>
                    <div className="break-words">{row.instructor}</div>
                    <div className="break-words">{row.room}</div>
                  </div>
                );
                return <div key={`${row.time}-${idx}`}>{inner}</div>;
              })}
              {(items as SectionScheduleCell[]).length > 3 ? (
                <div className="text-[10px] text-neutral-600 print:hidden">
                  +{(items as SectionScheduleCell[]).length - 3} more…
                </div>
              ) : null}
            </div>
          );
        }}
        signatureSlots={insSignatureSlots}
        scheduleApproved={scheduleApproved}
        signatureStrip="campusOnly"
      />

      <div className="min-h-[14rem] print:min-h-0 border border-neutral-900 p-4 md:p-6 print:p-2.5">
        <div className="mb-4 text-center text-sm font-bold uppercase tracking-wide">Summary of Courses</div>
        <div className="mb-2 border-b border-neutral-900 pb-2 text-xs font-semibold">
          <div className="grid grid-cols-4 gap-2">
            <span>No. of Students</span>
            <span>Course code</span>
            <span>Descriptive Title</span>
            <span>Degree/Yr/Sec</span>
          </div>
        </div>
        <div className="space-y-1 print:space-y-0.5">
          {shownCourses.map((c, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-2 text-xs border-b border-black/10 last:border-b-0">
              {readOnly ? (
                <>
                  <span className="flex min-h-[1.4rem] items-center bg-white px-1 py-1">{c.students}</span>
                  <span className="flex min-h-[1.4rem] items-center bg-white px-1 py-1">{c.code}</span>
                  <span className="flex min-h-[1.4rem] items-center bg-white px-1 py-1">{c.title}</span>
                  <span className="flex min-h-[1.4rem] items-center bg-white px-1 py-1">{c.degreeYrSec}</span>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    defaultValue={String(c.students)}
                    className="min-h-[1.6rem] border-0 border-b border-neutral-900 bg-transparent px-1 py-1 outline-none"
                  />
                  <input type="text" defaultValue={c.code} className="min-h-[1.6rem] border-0 border-b border-neutral-900 bg-transparent px-1 py-1 outline-none" />
                  <input type="text" defaultValue={c.title} className="min-h-[1.6rem] border-0 border-b border-neutral-900 bg-transparent px-1 py-1 outline-none" />
                  <input
                    type="text"
                    defaultValue={c.degreeYrSec}
                    className="min-h-[1.6rem] border-0 border-b border-neutral-900 bg-transparent px-1 py-1 outline-none"
                  />
                </>
              )}
            </div>
          ))}
          {readOnly && hiddenCourseCount > 0 ? (
            <div className="text-[10px] text-neutral-600 pt-1">+{hiddenCourseCount} more course(s)…</div>
          ) : null}
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
  /** Built from `buildInsRoomView` — includes per-slot instructor (AKA / full name). */
  schedule: InsRoomSchedule;
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

  return (
    <div className="space-y-8 print:space-y-1.5 text-neutral-900 print:text-[7.5pt] print:leading-tight">
      <div className="flex flex-col gap-4 print:gap-1 border-b border-neutral-300 pb-6 print:pb-1.5 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-center text-base font-bold uppercase tracking-wide sm:text-left sm:text-lg print:text-[9pt] print:leading-none">
          Cebu Technological University
        </h3>
        <div className="text-right text-sm print:text-[7.5pt]">
          <div className="font-semibold">INS FORM 5C</div>
          <div>{formDate()}</div>
          <div>Revision: 2</div>
        </div>
      </div>

      <div className="space-y-2 print:space-y-0 text-center">
        <h4 className="text-xl font-bold uppercase tracking-wide print:text-[10pt] print:leading-none">Room Utilization</h4>
        <div className="text-sm print:text-[7.5pt]">Day Program</div>
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
        cellMode="spanned"
        cellsByDay={schedule as Record<InsDay, InsTimedCell[]>}
        showMondayPlaceholder={!readOnly}
        renderSpanned={({ items, paperFormRow }) => {
          if (paperFormRow) {
            return (
              <div className="text-xs leading-relaxed text-neutral-500">
                <div>Course code</div>
                <div>Instructor</div>
                <div>Yr. & Sec.</div>
                <div>Room</div>
              </div>
            );
          }
          return (
            <div className="w-full space-y-1 pr-1">
              {(items as InsRoomCell[]).slice(0, 3).map((classAtTime, idx) => {
                const inner = (
                  <div key={`${classAtTime.time}-${idx}`} className="w-full space-y-0.5 text-xs leading-snug break-words">
                    <div className="font-semibold break-words">{classAtTime.course}</div>
                    <div className="text-[10px] text-neutral-600">{classAtTime.time}</div>
                    <div className="break-words">{classAtTime.instructor}</div>
                    <div className="break-words">{classAtTime.yearSec}</div>
                    <div className="break-words">{classAtTime.room}</div>
                  </div>
                );
                return <div key={`${classAtTime.time}-${idx}`}>{inner}</div>;
              })}
              {(items as InsRoomCell[]).length > 3 ? (
                <div className="text-[10px] text-neutral-600 print:hidden">
                  +{(items as InsRoomCell[]).length - 3} more…
                </div>
              ) : null}
            </div>
          );
        }}
        signatureSlots={insSignatureSlots}
        scheduleApproved={scheduleApproved}
        signatureStrip="none"
      />

      {/* Screen footer (spacious). Print uses a compact signature-line footer below. */}
      <div className="mt-12 grid grid-cols-1 gap-x-16 gap-y-12 border-t border-neutral-200 pt-12 md:grid-cols-2 print:hidden">
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

      {/* Print-only footer: compact signature lines (one page). */}
      <div className="hidden print:grid grid-cols-3 gap-6 border-t border-neutral-900 pt-4 text-[11px]">
        <div className="text-center">
          <div className="mb-6 border-b border-neutral-900" />
          <div className="font-semibold">Prepared by:</div>
          <div className="text-[10px] text-neutral-700">Program Coordinator/Chair</div>
        </div>
        <div className="text-center">
          <div className="mb-6 border-b border-neutral-900" />
          <div className="font-semibold">Reviewed, Certified True and Correct:</div>
          <div className="text-[10px] text-neutral-700">Director/Dean</div>
        </div>
        <div className="text-center">
          <div className="mb-6 border-b border-neutral-900" />
          <div className="font-semibold">Approved:</div>
          <div className="text-[10px] text-neutral-700">Campus Director</div>
        </div>
      </div>
    </div>
  );
}
