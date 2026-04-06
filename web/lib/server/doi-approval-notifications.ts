import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * After VPAA publishes a term schedule, notify stakeholders with role-specific pointers to INS views.
 * Uses the service-role client so inserts succeed regardless of Notification RLS.
 */
export async function notifyStakeholdersAfterDoiPublication(
  admin: SupabaseClient,
  academicPeriodId: string,
  periodName: string,
): Promise<{ notified: number }> {
  const { data: entries, error: e1 } = await admin
    .from("ScheduleEntry")
    .select("instructorId, sectionId")
    .eq("academicPeriodId", academicPeriodId);

  if (e1) {
    console.error("[doi-approval-notifications] ScheduleEntry load failed", e1.message);
  }

  const rows = entries ?? [];
  const sectionIds = [...new Set(rows.map((x: { sectionId: string }) => x.sectionId))];
  const instructorIds = [...new Set(rows.map((x: { instructorId: string }) => x.instructorId))];

  const { data: sections, error: e2 } =
    sectionIds.length > 0
      ? await admin.from("Section").select("id, programId").in("id", sectionIds)
      : { data: [] as { id: string; programId: string }[], error: null };

  if (e2) {
    console.error("[doi-approval-notifications] Section load failed", e2.message);
  }

  const programIds = [...new Set((sections ?? []).map((s: { programId: string }) => s.programId))];
  const { data: programs, error: e3 } =
    programIds.length > 0
      ? await admin.from("Program").select("id, collegeId").in("id", programIds)
      : { data: [] as { id: string; collegeId: string }[], error: null };

  if (e3) {
    console.error("[doi-approval-notifications] Program load failed", e3.message);
  }

  const collegeIds = [...new Set((programs ?? []).map((p: { collegeId: string }) => p.collegeId).filter(Boolean))];

  const { data: chairsAndAdmins, error: e4 } =
    collegeIds.length > 0
      ? await admin
          .from("User")
          .select("id, role")
          .in("collegeId", collegeIds)
          .in("role", ["chairman_admin", "college_admin"])
      : { data: [] as { id: string; role: string }[], error: null };

  if (e4) {
    console.error("[doi-approval-notifications] Chair/College load failed", e4.message);
  }

  const { data: casGec, error: e5 } = await admin
    .from("User")
    .select("id, role")
    .in("role", ["cas_admin", "gec_chairman"]);

  if (e5) {
    console.error("[doi-approval-notifications] CAS/GEC load failed", e5.message);
  }

  const { data: studentProfiles, error: e6 } =
    sectionIds.length > 0
      ? await admin.from("StudentProfile").select("userId").in("sectionId", sectionIds)
      : { data: [] as { userId: string }[], error: null };

  if (e6) {
    console.error("[doi-approval-notifications] StudentProfile load failed", e6.message);
  }

  const studentUserIds = [...new Set((studentProfiles ?? []).map((p: { userId: string }) => p.userId))];

  const sent = new Set<string>();
  let notified = 0;

  async function notifyUser(userId: string, message: string) {
    if (!userId || sent.has(userId)) return;
    sent.add(userId);
    const { error } = await admin.from("Notification").insert({
      userId,
      message,
      isRead: false,
    });
    if (!error) notified += 1;
  }

  const base = `Master schedule for ${periodName} is published and locked by VPAA/DOI.`;

  for (const id of instructorIds) {
    await notifyUser(
      id,
      `${base} View your final timetable (INS by Faculty): /faculty/ins/faculty — Section/Room: /faculty/ins/section, /faculty/ins/room.`,
    );
  }

  for (const u of chairsAndAdmins ?? []) {
    const line =
      u.role === "chairman_admin"
        ? `${base} View your college INS (Faculty/Section/Room): /chairman/ins/faculty.`
        : `${base} View your college INS: /admin/college/ins/faculty.`;
    await notifyUser(u.id, line);
  }

  for (const u of casGec ?? []) {
    const line =
      u.role === "cas_admin"
        ? `${base} Campus-wide INS (CAS): /admin/cas/ins/faculty.`
        : `${base} GEC portal: /admin/gec — published master schedule is visible via approved INS access.`;
    await notifyUser(u.id, line);
  }

  for (const id of studentUserIds) {
    await notifyUser(id, `${base} View your section timetable: /student/schedule.`);
  }

  return { notified };
}
