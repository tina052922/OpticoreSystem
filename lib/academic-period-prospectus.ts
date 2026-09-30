import type { AcademicPeriod } from "@/types/db";
import type { BsitSemester } from "@/lib/chairman/bsit-prospectus";

/**
 * Maps a DB academic period to BSIT prospectus semester (1 = first sem, 2 = second sem).
 * Used to filter prospectus subject rows to match the chair’s selected term.
 */
export function prospectusSemesterFromAcademicPeriod(p: AcademicPeriod | null | undefined): BsitSemester | null {
  if (!p) return null;

  /**
   * The `semester` field on its own first. DOI's "Add new academic period" form stores a bare "1",
   * "2" or "Summer", and none of the phrase patterns below match a lone digit — so every term
   * created through the UI read as "no semester". It has to be tested in isolation: the combined
   * text below contains the academic year, and a digit search there would read "AY 2025-2026" as
   * second semester.
   */
  const semesterField = String(p.semester ?? "").trim();
  if (semesterField === "1") return 1;
  if (semesterField === "2") return 2;

  const blob = `${p.semester ?? ""} ${p.name ?? ""} ${p.academicYear ?? ""}`.toLowerCase();
  if (/\b2nd\b|\bsecond\b|2\s*st\s*sem/i.test(blob) || blob.includes("2nd semester")) return 2;
  if (/\b1st\b|\bfirst\b|1\s*st\s*sem/i.test(blob) || blob.includes("1st semester")) return 1;
  // Numeric hints
  if (/\bs2\b|sem\s*2|semester\s*2/i.test(blob)) return 2;
  if (/\bs1\b|sem\s*1|semester\s*1/i.test(blob)) return 1;
  return null;
}
