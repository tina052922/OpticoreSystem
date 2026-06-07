import { insInstructorDisplayName } from "@/lib/ins/ins-instructor-display";
import type { FacultyProfile, Program, Section, User } from "@/types/db";

const YEAR_ORDINALS = ["", "1st", "2nd", "3rd", "4th", "5th"] as const;

function yearLevelLabel(yearLevel: number): string {
  if (yearLevel >= 1 && yearLevel <= 5) return `${YEAR_ORDINALS[yearLevel]} Year`;
  return `Year ${yearLevel}`;
}

/** Form 5B header lines: degree/year, class adviser, and section assignment. */
export function buildInsSectionHeaderFields(args: {
  sectionId: string;
  sectionById: Map<string, Section>;
  programById: Map<string, Program>;
  facultyProfiles: Iterable<Pick<FacultyProfile, "userId" | "fullName" | "aka" | "advisorySectionId">>;
  userById: Map<string, User>;
}): { degreeAndYear: string; adviser: string; assignment: string } {
  const sec = args.sectionById.get(args.sectionId);
  if (!sec) {
    return { degreeAndYear: "—", adviser: "—", assignment: "—" };
  }

  const program = args.programById.get(sec.programId);
  const degreeAndYear = program
    ? `${program.code} — ${yearLevelLabel(sec.yearLevel)}`
    : sec.name;

  let adviser = "—";
  for (const fp of args.facultyProfiles) {
    if (fp.advisorySectionId?.trim() !== args.sectionId) continue;
    const user = args.userById.get(fp.userId);
    adviser = insInstructorDisplayName(user, fp);
    break;
  }

  return {
    degreeAndYear,
    adviser,
    assignment: sec.name,
  };
}
