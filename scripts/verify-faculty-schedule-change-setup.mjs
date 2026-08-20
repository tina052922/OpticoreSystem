/**
 * Verifies DB prerequisites for testing Faculty → Request schedule change.
 *
 * Usage (from web/): node scripts/verify-faculty-schedule-change-setup.mjs
 * Requires web/.env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Checks: current AcademicPeriod, demo ScheduleEntry for seed instructor, optional ScheduleChangeRequest table.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEMO_INSTRUCTOR_ID = "2913ec86-b6c3-4663-a969-1557c46835bd";
const DEMO_ENTRY_ID = "sch-qa-schedule-change-demo";
const DEMO_PERIOD_ID = "ap-2025-2";

function loadEnvLocal() {
  const envPath = join(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) {
    console.error("Missing web/.env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).");
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
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
  console.log("OptiCore — faculty schedule change QA\n");

  const { data: current, error: curErr } = await admin
    .from("AcademicPeriod")
    .select("id, name, isCurrent")
    .eq("isCurrent", true)
    .maybeSingle();

  if (curErr) {
    console.error("AcademicPeriod query failed:", curErr.message);
    process.exit(1);
  }
  if (!current) {
    console.warn("⚠ No row with isCurrent = true. API falls back to latest period; ensure ap-2025-2 exists.");
  } else {
    console.log("✓ Current period:", current.id, "—", current.name);
  }

  const { data: demo, error: demoErr } = await admin
    .from("ScheduleEntry")
    .select("id, day, startTime, endTime, academicPeriodId, instructorId")
    .eq("id", DEMO_ENTRY_ID)
    .maybeSingle();

  if (demoErr) {
    console.error("ScheduleEntry query failed:", demoErr.message);
    process.exit(1);
  }
  if (!demo) {
    console.error(
      `✗ Missing demo row id=${DEMO_ENTRY_ID}. Apply migration 20260410120000_qa_schedule_change_demo_row.sql or run supabase/seed.sql.`,
    );
    process.exit(1);
  }
  if (demo.instructorId !== DEMO_INSTRUCTOR_ID) {
    console.error("✗ Demo row instructorId mismatch.");
    process.exit(1);
  }
  if (demo.academicPeriodId !== DEMO_PERIOD_ID) {
    console.warn("⚠ Demo row academicPeriodId differs from seed default:", demo.academicPeriodId);
  }
  console.log("✓ Demo ScheduleEntry:", DEMO_ENTRY_ID, `(${demo.day} ${demo.startTime}–${demo.endTime})`);

  const { count, error: cntErr } = await admin
    .from("ScheduleEntry")
    .select("id", { count: "exact", head: true })
    .eq("instructorId", DEMO_INSTRUCTOR_ID)
    .eq("academicPeriodId", DEMO_PERIOD_ID);

  if (cntErr) {
    console.warn("Could not count rows:", cntErr.message);
  } else {
    console.log(`✓ Instructor schedule rows for ${DEMO_PERIOD_ID}:`, count ?? 0);
  }

  const { error: scrErr } = await admin.from("ScheduleChangeRequest").select("id").limit(1);
  if (scrErr) {
    console.warn("⚠ ScheduleChangeRequest table not readable:", scrErr.message, "(apply migration 20260409120000_schedule_change_requests.sql)");
  } else {
    console.log("✓ ScheduleChangeRequest table exists");
  }

  console.log("\nAfter migration 20260426120000_schedule_change_request_notifications.sql:");
  console.log("  Run: npm run verify:scr-notifications  (confirms DB trigger → Notification rows).");
  console.log("\nManual test (dev server on :3000):");
  console.log("  1. Sign in as instructor@opticore.local (seed user; public.User id matches demo instructor).");
  console.log("  2. Open /faculty/schedule — pick term in header, then Request schedule change (or tap a grid cell).");
  console.log("  3. Submit a change; sign in as college.admin@opticore.local → /admin/college/schedule-change-requests.");
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
