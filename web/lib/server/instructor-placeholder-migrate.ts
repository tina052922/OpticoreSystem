import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Re-point all known FKs from a chairman-created placeholder instructor (no Auth user)
 * to the new Supabase Auth user id, then remove the placeholder row.
 *
 * ## Plotting before self-registration (recommended)
 * The Chairman should add the faculty member in Faculty Profile with the official **Employee ID** first.
 * That creates `public.User` + `FacultyProfile` without a login. Plotting uses `ScheduleEntry.instructorId`
 * = that placeholder `User.id`. When the instructor self-registers with the **same Employee ID**, we detect
 * the placeholder (no Auth account), clear `employeeId` on the placeholder, insert the real `User` row with
 * `auth.users.id`, then move `FacultyProfile` and all schedule rows to the new id.
 *
 * This avoids orphan `ScheduleEntry` rows that cannot be satisfied by FK without a prior `User` row.
 */
export async function migrateInstructorPlaceholderToAuthUser(
  admin: SupabaseClient,
  oldUserId: string,
  newUserId: string,
  next: { email: string; name: string; collegeId: string | null; employeeId: string },
): Promise<{ error: string | null }> {
  const { error: clearEid } = await admin.from("User").update({ employeeId: null }).eq("id", oldUserId);
  if (clearEid) return { error: clearEid.message };

  const { error: insErr } = await admin.from("User").insert({
    id: newUserId,
    email: next.email,
    name: next.name,
    role: "instructor",
    collegeId: next.collegeId,
    employeeId: next.employeeId,
  });
  if (insErr) return { error: insErr.message };

  const { error: fpErr } = await admin.from("FacultyProfile").update({ userId: newUserId }).eq("userId", oldUserId);
  if (fpErr) return { error: fpErr.message };

  const { error: seErr } = await admin.from("ScheduleEntry").update({ instructorId: newUserId }).eq("instructorId", oldUserId);
  if (seErr) return { error: seErr.message };

  const { error: scrErr } = await admin.from("ScheduleChangeRequest").update({ instructorId: newUserId }).eq("instructorId", oldUserId);
  if (scrErr) return { error: scrErr.message };

  const { error: nErr } = await admin.from("Notification").update({ userId: newUserId }).eq("userId", oldUserId);
  if (nErr) return { error: nErr.message };

  await admin.from("WorkflowInboxMessage").update({ senderId: newUserId }).eq("senderId", oldUserId);

  const { error: arErr } = await admin.from("AccessRequest").update({ requesterId: newUserId }).eq("requesterId", oldUserId);
  if (arErr) return { error: arErr.message };

  await admin.from("AuditLog").update({ actorId: newUserId }).eq("actorId", oldUserId);

  const { error: sljErr } = await admin.from("ScheduleLoadJustification").update({ authorUserId: newUserId }).eq("authorUserId", oldUserId);
  if (sljErr) return { error: sljErr.message };

  const { error: delErr } = await admin.from("User").delete().eq("id", oldUserId);
  if (delErr) return { error: delErr.message };

  return { error: null };
}
