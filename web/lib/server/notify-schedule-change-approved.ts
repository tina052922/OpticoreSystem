import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScheduleEntry } from "@/types/db";

type MinimalEntry = Pick<ScheduleEntry, "sectionId" | "subjectId" | "academicPeriodId"> & {
  day: string;
  startTime: string;
  endTime: string;
};

/**
 * Notify students, admins, chairs, VPAA-oriented roles, and the instructor when College Admin applies an approved change.
 * Uses the service-role client so inserts are not blocked by Notification RLS.
 */
export async function notifyScheduleChangeApproved(
  admin: SupabaseClient,
  opts: {
    collegeId: string;
    programId: string;
    sectionId: string;
    instructorId: string;
    instructorName: string;
    subjectCode: string;
    sectionName: string;
    slotLabel: string;
    roomLabel?: string | null;
    entryAfter: MinimalEntry;
  },
): Promise<void> {
  const {
    collegeId,
    programId,
    sectionId,
    instructorId,
    instructorName,
    subjectCode,
    sectionName,
    slotLabel,
    roomLabel,
  } = opts;
  const whenWhere = roomLabel ? `${slotLabel} · Room ${roomLabel}` : slotLabel;

  const studentRows = await admin.from("StudentProfile").select("userId").eq("sectionId", sectionId);
  if (studentRows.error) throw studentRows.error;

  const studentMsg = `Your class has been changed to ${subjectCode} (${sectionName}) — ${whenWhere}.`;
  const staffMsg = `Schedule change approved: ${subjectCode} (${sectionName}), taught by ${instructorName}, moved to ${whenWhere}.`;

  const studentIds = [...new Set((studentRows.data ?? []).map((r) => String(r.userId)).filter(Boolean))];
  const recipientMessages = new Map<string, string>();

  for (const uid of studentIds) {
    recipientMessages.set(uid, studentMsg);
  }

  recipientMessages.set(
    instructorId,
    `Your schedule change was approved for ${subjectCode} (${sectionName}). New slot: ${whenWhere}.`,
  );

  const { data: collegeStaff, error: collegeStaffErr } = await admin
    .from("User")
    .select("id, role, chairmanProgramId")
    .eq("collegeId", collegeId)
    .in("role", ["college_admin", "chairman_admin", "cas_admin"]);

  if (collegeStaffErr) throw collegeStaffErr;

  for (const u of collegeStaff ?? []) {
    const id = String((u as { id: string }).id);
    if (!id || id === instructorId) continue;
    const role = String((u as { role: string }).role ?? "");
    if (role === "chairman_admin") {
      const cp = (u as { chairmanProgramId?: string | null }).chairmanProgramId ?? null;
      if (cp && cp !== programId) continue;
    }
    recipientMessages.set(id, staffMsg);
  }

  const { data: doiUsers, error: doiErr } = await admin.from("User").select("id").eq("role", "doi_admin");
  if (doiErr) throw doiErr;
  for (const d of doiUsers ?? []) {
    const id = String((d as { id: string }).id);
    if (id) recipientMessages.set(id, staffMsg);
  }

  const notifications = [...recipientMessages.entries()].map(([userId, message]) => ({
    userId,
    message,
    isRead: false,
  }));

  if (notifications.length === 0) return;
  const { error } = await admin.from("Notification").insert(notifications);
  if (error) throw error;
}
