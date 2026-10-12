import type { FacultyProfile, User } from "@/types/db";

/**
 * INS Forms (5A header, 5B cells, 5C cells): the Faculty Profile full name, else the account name.
 *
 * There used to be an A.K.A. that took precedence — a second name people set at registration and
 * nobody maintained, so forms could print one name while every other page showed another. One name
 * per person is the rule now.
 *
 * Never show `User.employeeId` — schedules still key off `ScheduleEntry.instructorId` (`User.id`);
 * `employeeId` is only for linking self-registration to plotted rows.
 */
export function insInstructorDisplayName(
  user: User | undefined,
  profile: Pick<FacultyProfile, "fullName"> | null | undefined,
): string {
  if (!user) return "Vacant Slot (TBD)";
  const fn = profile?.fullName?.trim();
  if (fn) return fn;
  return (user.name ?? "").trim() || "—";
}
