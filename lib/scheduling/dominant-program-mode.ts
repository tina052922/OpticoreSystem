import { resolveProgramMode, type ProgramMode } from "@/lib/scheduling/program-mode";

/**
 * The programme a set of schedule rows belongs to: day or evening.
 *
 * A section is plotted entirely in one or the other, so its rows agree in practice. They are counted
 * rather than sampled anyway, so one stray row — a make-up class plotted at the wrong hour, a row
 * whose mode was never stamped and is inferred from its shape — cannot decide a student's whole
 * timetable. A tie goes to day, the campus default.
 *
 * Null means the rows said nothing at all: no schedule yet. The caller should leave the mode
 * unlocked rather than guess, so the student is not shown an empty timetable for a programme they
 * may not be in.
 */
export function dominantProgramMode(
  rows: readonly { programMode?: string | null; programSession?: string | null; day?: string | null; startTime?: string | null }[],
): ProgramMode | null {
  let day = 0;
  let night = 0;
  for (const row of rows) {
    if (resolveProgramMode(row) === "night") night += 1;
    else day += 1;
  }
  if (day === 0 && night === 0) return null;
  return night > day ? "night" : "day";
}
