/**
 * CTU HR Form 23B (June 2012, Rev. 0) — "Faculty Profile as to their Educational Qualification".
 *
 * The printed form splits the name into three cells, lists rows in alphabetical order by last name,
 * and prints AGE next to DATE OF BIRTH. Age is never stored: it is derived here so it cannot go stale.
 *
 * `FacultyProfile.fullName` stays the canonical display name (INS documents print it) and is recomposed
 * from the three parts on every save — see `composeFullName`.
 */

export const FACULTY_SEX_MALE = "M" as const;
export const FACULTY_SEX_FEMALE = "F" as const;

export type FacultySex = typeof FACULTY_SEX_MALE | typeof FACULTY_SEX_FEMALE;

/** Academic ranks in the CTU faculty plantilla, offered as suggestions (the column stays free text). */
export const ACADEMIC_RANK_SUGGESTIONS = [
  "Instructor I",
  "Instructor II",
  "Instructor III",
  "Assistant Professor I",
  "Assistant Professor II",
  "Assistant Professor III",
  "Assistant Professor IV",
  "Associate Professor I",
  "Associate Professor II",
  "Associate Professor III",
  "Associate Professor IV",
  "Associate Professor V",
  "Professor I",
  "Professor II",
  "Professor III",
  "Professor IV",
  "Professor V",
  "Professor VI",
  "College Lecturer",
  "Part-time Lecturer",
] as const;

/** `''` (blank cell) for anything that is not an M/F code — the form has no third value. */
export function normalizeFacultySex(raw: string | null | undefined): FacultySex | "" {
  const s = (raw ?? "").trim().toUpperCase();
  if (!s) return "";
  if (s === "M" || s.startsWith("MALE")) return FACULTY_SEX_MALE;
  if (s === "F" || s.startsWith("FEMALE")) return FACULTY_SEX_FEMALE;
  return "";
}

export type FacultyNameParts = {
  lastName: string;
  firstName: string;
  middleName: string;
};

/** The same three cells as they come off a `FacultyProfile` row — any of them may be null. */
export type PartialFacultyNameParts = {
  lastName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
};

function collapse(v: string | null | undefined): string {
  return (v ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Best-effort split of a legacy single-field name, used to prefill the three cells for profiles
 * saved before this form existed. Mirrors the SQL backfill in `013_faculty_profile_hr23b.sql`.
 *
 *   "Dela Cruz, Juan Miguel" → { last: "Dela Cruz", first: "Juan", middle: "Miguel" }
 *   "Juan Miguel Dela Cruz"  → { first: "Juan", middle: "Miguel", last: "Dela Cruz" }
 *
 * Without a comma the last token is taken as the surname, so compound surnames ("Dela Cruz") land
 * partly in the middle cell. That is a prefill, not a guess to rely on — it stays editable.
 */
export function splitFullName(fullName: string | null | undefined): FacultyNameParts {
  const name = collapse(fullName);
  if (!name) return { lastName: "", firstName: "", middleName: "" };

  const commaAt = name.indexOf(",");
  if (commaAt >= 0) {
    const lastName = collapse(name.slice(0, commaAt));
    const rest = collapse(name.slice(commaAt + 1)).split(" ").filter(Boolean);
    return {
      lastName,
      firstName: rest[0] ?? "",
      middleName: rest.slice(1).join(" "),
    };
  }

  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return { lastName: parts[0], firstName: "", middleName: "" };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

/** "First Middle Last" — the shape `fullName` already holds, so INS output is unchanged. */
export function composeFullName(parts: PartialFacultyNameParts): string {
  return [parts.firstName, parts.middleName, parts.lastName].map(collapse).filter(Boolean).join(" ");
}

/** "Last, First Middle" — the 23B reading order, for anywhere a single alphabetical label is needed. */
export function composeListName(parts: PartialFacultyNameParts): string {
  const last = collapse(parts.lastName);
  const rest = [parts.firstName, parts.middleName].map(collapse).filter(Boolean).join(" ");
  if (!last) return rest;
  return rest ? `${last}, ${rest}` : last;
}

/**
 * Whole years as of `asOf` (default: now). Null for a missing or unparseable date, and for a date in
 * the future — a negative age on the form would be worse than a blank cell.
 */
export function computeAge(dateOfBirth: string | null | undefined, asOf: Date = new Date()): number | null {
  const raw = (dateOfBirth ?? "").trim();
  if (!raw) return null;
  // `YYYY-MM-DD` (what the date column and <input type="date"> both give) parsed as local time,
  // so a birthday never shifts a day across timezones.
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const born = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    : new Date(raw);
  if (Number.isNaN(born.getTime())) return null;

  let age = asOf.getFullYear() - born.getFullYear();
  const monthDelta = asOf.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && asOf.getDate() < born.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

/** `YYYY-MM-DD` for `<input type="date">`; `''` when the stored value is empty or a timestamp we cannot read. */
export function toDateInputValue(dateOfBirth: string | null | undefined): string {
  const raw = (dateOfBirth ?? "").trim();
  if (!raw) return "";
  const ymd = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  return ymd ? ymd[1] : "";
}

/** "March 15, 1985" for the printed cell; falls back to the raw value if it cannot be parsed. */
export function formatDateOfBirth(dateOfBirth: string | null | undefined): string {
  const iso = toDateInputValue(dateOfBirth);
  if (!iso) return (dateOfBirth ?? "").trim();
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/** The form's "(Alphabetical Order)" note: by last name, then first, then middle. */
export function compareFacultyAlphabetically(
  a: PartialFacultyNameParts,
  b: PartialFacultyNameParts,
): number {
  const byLast = collapse(a.lastName).localeCompare(collapse(b.lastName), "en", { sensitivity: "base" });
  if (byLast !== 0) return byLast;
  const byFirst = collapse(a.firstName).localeCompare(collapse(b.firstName), "en", { sensitivity: "base" });
  if (byFirst !== 0) return byFirst;
  return collapse(a.middleName).localeCompare(collapse(b.middleName), "en", { sensitivity: "base" });
}

/**
 * Name parts for a profile row, falling back to a split of `fullName` (or the `User.name`) when the
 * columns are still empty — profiles created before the migration, or by self-registration.
 */
export function facultyNamePartsFrom(
  profile: PartialFacultyNameParts & { fullName?: string | null },
  fallbackName?: string | null,
): FacultyNameParts {
  const last = collapse(profile.lastName);
  const first = collapse(profile.firstName);
  const middle = collapse(profile.middleName);
  if (last || first) return { lastName: last, firstName: first, middleName: middle };
  return splitFullName(profile.fullName ?? fallbackName ?? "");
}
