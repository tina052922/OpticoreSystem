import type { FacultyProfile, User } from "@/types/db";

/**
 * INS Forms (5A header, 5B cells, 5C cells): prefer **A.K.A.** from Faculty Profile when set; otherwise **full name**.
 * Never show `User.employeeId` — schedules still key off `ScheduleEntry.instructorId` (`User.id`); `employeeId` is only for
 * linking self-registration to plotted rows.
 */
export function insInstructorDisplayName(
  user: User | undefined,
  profile: Pick<FacultyProfile, "fullName" | "aka"> | null | undefined,
): string {
  if (!user) return "—";
  const aka = profile?.aka?.trim();
  if (aka) return aka;
  const fn = profile?.fullName?.trim();
  if (fn) return fn;
  return (user.name ?? "").trim() || "—";
}
