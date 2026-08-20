/**
 * End-to-end check: inserting ScheduleChangeRequest (service role) fires the
 * notify_on_schedule_change_request_insert trigger → Notification rows for college admins + instructor.
 *
 * Usage (from web/): node scripts/verify-schedule-change-notification-trigger.mjs
 * Requires web/.env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Cleans up the test SCR and the notifications it created.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = join(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) {
    console.error("Missing web/.env.local");
    process.exit(1);
  }
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in web/.env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("OptiCore — verify ScheduleChangeRequest → Notification trigger\n");

  const t0 = new Date().toISOString();

  const { data: entries, error: eErr } = await admin
    .from("ScheduleEntry")
    .select("id, academicPeriodId, instructorId, sectionId")
    .not("instructorId", "is", null)
    .limit(40);

  if (eErr || !entries?.length) {
    console.error("No ScheduleEntry rows with instructorId — cannot run trigger test.");
    process.exit(1);
  }

  let picked = null;
  let collegeId = null;
  for (const row of entries) {
    const { data: u } = await admin.from("User").select("collegeId").eq("id", row.instructorId).maybeSingle();
    const cid = u?.collegeId ?? null;
    if (cid) {
      picked = row;
      collegeId = cid;
      break;
    }
  }

  if (!picked || !collegeId) {
    console.error("No instructor-linked ScheduleEntry with User.collegeId — cannot run trigger test.");
    process.exit(1);
  }

  const { data: admins } = await admin.from("User").select("id").eq("role", "college_admin").eq("collegeId", collegeId);
  const adminIds = (admins ?? []).map((a) => a.id);
  if (adminIds.length === 0) {
    console.warn("⚠ No college_admin in this college — trigger should still notify instructor only.");
  }

  const reason = "Automated OptiCore trigger verification (safe to delete).";
  const { data: inserted, error: insErr } = await admin
    .from("ScheduleChangeRequest")
    .insert({
      academicPeriodId: picked.academicPeriodId,
      scheduleEntryId: picked.id,
      instructorId: picked.instructorId,
      collegeId,
      requestedDay: "Wednesday",
      requestedStartTime: "10:00",
      requestedEndTime: "11:00",
      reason,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (insErr || !inserted?.id) {
    console.error("✗ ScheduleChangeRequest insert failed:", insErr?.message ?? "no row");
    process.exit(1);
  }
  console.log("✓ Inserted test ScheduleChangeRequest:", inserted.id);

  const watchIds = [picked.instructorId, ...adminIds];
  const { data: notifs, error: nErr } = await admin
    .from("Notification")
    .select("id, userId, message, createdAt")
    .in("userId", watchIds)
    .gte("createdAt", t0)
    .order("createdAt", { ascending: false });

  if (nErr) {
    console.error("✗ Notification query failed:", nErr.message);
    await admin.from("ScheduleChangeRequest").delete().eq("id", inserted.id);
    process.exit(1);
  }

  const list = notifs ?? [];
  const adminHit = list.some((n) => adminIds.includes(n.userId) && n.message.includes("New schedule change request"));
  const selfHit = list.some(
    (n) => n.userId === picked.instructorId && n.message.includes("was sent to College Admin"),
  );

  /** Cleanup before exit so QA data stays tidy */
  const notifIds = list.map((n) => n.id);
  if (notifIds.length) await admin.from("Notification").delete().in("id", notifIds);
  await admin.from("ScheduleChangeRequest").delete().eq("id", inserted.id);

  if (!adminHit && adminIds.length > 0) {
    console.error("✗ Expected at least one college_admin notification with “New schedule change request”.");
    console.error("  Is migration 20260426120000_schedule_change_request_notifications.sql applied?");
    process.exit(1);
  }
  if (!selfHit) {
    console.error("✗ Expected instructor confirmation notification.");
    process.exit(1);
  }

  console.log("✓ Trigger created admin notification(s):", adminHit ? "yes" : "n/a (no admins)");
  console.log("✓ Trigger created instructor confirmation: yes");
  console.log("✓ Cleaned up test SCR +", notifIds.length, "notification(s)\n");
  console.log("All schedule-change notification trigger checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
