/**
 * How many students are enrolled in ONE SUBJECT for ONE SECTION.
 *
 * The obvious place for this figure is the section, and that is where it used to live —
 * `Section.studentCount`, one number printed down the whole "No. of Students" column of INS Form
 * 5A. Irregular students make that wrong. A block of 40 carries 40 in its major, perhaps 12 in an
 * elective most of them already passed, and 46 in a GE class drawing from two sections. One number
 * per section cannot express any of that.
 *
 * So the grain is the OFFERING — section + subject — which is exactly the grain INS Form 5A prints
 * at: its Summary of Courses has one row per course–section pair. Lecture and laboratory are
 * separate offerings, because they are separate subject codes (`CC-112` / `CC-112L`) and the form
 * lists them as separate rows.
 *
 * A subject meeting twice a week is still one offering: both meetings carry the figure, and
 * entering it on either answers for both.
 *
 * Nothing falls back to `Section.studentCount` any more, and sections no longer offer the field at
 * all: a figure on an INS form is one somebody entered against that subject, or it is blank.
 */

/** Matches the migration's CHECK constraint on `ScheduleEntry.studentCount`. */
export const MAX_OFFERING_ENROLLMENT = 500;

/** The blank a number input holds before anything is typed. */
export type EnrollmentInput = number | "";

/**
 * Identifies one offering.
 *
 * Case and spacing are normalised so `cc 112` and `CC-112` are the same subject, but the `L` suffix
 * is NOT collapsed: lecture and laboratory enroll separately and print separately.
 */
export function offeringKey(sectionId: string, subjectCode: string): string {
  return `${sectionId}::${subjectCode.replace(/\s+/g, "").replace(/-/g, "").toUpperCase()}`;
}

/** True when this is a figure worth storing. Zero reads as "nobody filled it in". */
export function isCompleteEnrollment(value: EnrollmentInput | null | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_OFFERING_ENROLLMENT
  );
}

/** What a number input's raw string should become in plot-row state. */
export function parseEnrollmentInput(raw: string): EnrollmentInput {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 0) return "";
  return Math.min(MAX_OFFERING_ENROLLMENT, n);
}

/** What goes in the column of a saved row: the figure, or null when none was given. */
export function enrollmentForStorage(value: EnrollmentInput): number | null {
  return isCompleteEnrollment(value) ? value : null;
}

export type OfferingRow = {
  sectionId: string;
  subjectCode: string;
  students: EnrollmentInput;
};

/** Index the figures already plotted, so a second meeting of a subject inherits the first one's. */
export function offeringEnrollmentIndex(
  rows: readonly OfferingRow[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (!r.sectionId || !r.subjectCode || !isCompleteEnrollment(r.students)) continue;
    m.set(offeringKey(r.sectionId, r.subjectCode), r.students);
  }
  return m;
}

/**
 * The figure to show for an offering, in order of authority:
 *
 *   1. what is being typed for this very offering;
 *   2. what another meeting of the same subject and section already carries.
 *
 * There is no third step. The section's own `studentCount` was offered as a starting point for a
 * while, which quietly made the section the source again whenever nobody corrected it — the exact
 * thing this field exists to replace. A subject nobody has counted yet shows blank and has to be
 * typed, so every figure on an INS form is one somebody actually entered.
 */
export function enrollmentForOffering(args: {
  sectionId: string;
  subjectCode: string;
  /** What the modal currently holds, and the offering it was entered against. */
  draft?: OfferingRow | null;
  /** Figures already plotted, from {@link offeringEnrollmentIndex}. */
  plotted?: ReadonlyMap<string, number>;
}): EnrollmentInput {
  const { sectionId, subjectCode, draft, plotted } = args;
  if (!sectionId || !subjectCode) return "";
  const key = offeringKey(sectionId, subjectCode);
  if (
    draft &&
    draft.sectionId === sectionId &&
    offeringKey(draft.sectionId, draft.subjectCode) === key &&
    isCompleteEnrollment(draft.students)
  ) {
    return draft.students;
  }
  const already = plotted?.get(key);
  return isCompleteEnrollment(already) ? already : "";
}

/**
 * Give every meeting of one offering the same figure.
 *
 * Only this subject in this section — the rest of the section's subjects are left alone, which is
 * the whole point of moving off `Section.studentCount`.
 */
export function applyOfferingEnrollmentToRows<T extends OfferingRow>(
  rows: readonly T[],
  sectionId: string,
  subjectCode: string,
  students: EnrollmentInput,
): T[] {
  if (!sectionId || !subjectCode) return rows as T[];
  const key = offeringKey(sectionId, subjectCode);
  let changed = false;
  const next = rows.map((r) => {
    if (!r.sectionId || !r.subjectCode) return r;
    if (offeringKey(r.sectionId, r.subjectCode) !== key || r.students === students) return r;
    changed = true;
    return { ...r, students };
  });
  return changed ? next : (rows as T[]);
}

/**
 * The figure the INS forms and the Evaluator table print for a course–section pair.
 *
 * Only the plotted figure. It used to fall back to `Section.studentCount`, which meant a form could
 * print a number nobody had entered against that subject; sections no longer carry an editable
 * count at all, so the fallback would now be printing a frozen leftover.
 *
 * Null means nobody has recorded it, and the readers print a blank for someone to write in rather
 * than a `0` that would read as "no students enrolled".
 */
export function insCourseEnrollment(
  entryStudentCount: number | null | undefined,
): number | null {
  return isCompleteEnrollment(entryStudentCount) ? entryStudentCount : null;
}
