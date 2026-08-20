import type { AcademicPeriod } from "@/types/db";
import type { BsitSemester } from "@/lib/chairman/bsit-prospectus";

/**
 * Maps a DB academic period to BSIT prospectus semester (1 = first sem, 2 = second sem).
 * Used to filter prospectus subject rows to match the chair’s selected term.
 */
export function prospectusSemesterFromAcademicPeriod(p: AcademicPeriod | null | undefined): BsitSemester | null {
  if (!p) return null;
  const blob = `${p.semester ?? ""} ${p.name ?? ""} ${p.academicYear ?? ""}`.toLowerCase();
  if (/\b2nd\b|\bsecond\b|2\s*st\s*sem/i.test(blob) || blob.includes("2nd semester")) return 2;
  if (/\b1st\b|\bfirst\b|1\s*st\s*sem/i.test(blob) || blob.includes("1st semester")) return 1;
  // Numeric hints
  if (/\bs2\b|sem\s*2|semester\s*2/i.test(blob)) return 2;
  if (/\bs1\b|sem\s*1|semester\s*1/i.test(blob)) return 1;
  return null;
}
