/**
 * Creates a Supabase Auth user + public."User" row with role gec_chairman for local flow testing.
 *
 * Usage (from web/): node scripts/create-gec-chairman-test.mjs
 * Requires web/.env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Defaults: email gec.chairman.test@opticore.local, password OptiCore2026!, college col-tech-eng (CTE seed).
 * Override: GEC_TEST_EMAIL, GEC_TEST_PASSWORD, GEC_TEST_COLLEGE_ID
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const email = (process.env.GEC_TEST_EMAIL || "gec.chairman.test@opticore.local").trim().toLowerCase();
const password = process.env.GEC_TEST_PASSWORD || "OptiCore2026!";
/** Empty GEC_TEST_COLLEGE_ID = campus-wide GEC Chair (no college); matches product scope. */
const collegeIdRaw = (process.env.GEC_TEST_COLLEGE_ID ?? "col-tech-eng").trim();
/** Default COTE college from seed; set GEC_TEST_COLLEGE_ID="" only for campus-wide Auth tests (public.User may use routing college). */
const collegeId = collegeIdRaw === "" ? null : collegeIdRaw;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const name = "GEC Chairman (test)";

async function main() {
  if (collegeId !== null) {
    const { data: col } = await admin.from("College").select("id").eq("id", collegeId).maybeSingle();
    if (!col) {
      console.error(
        `College id "${collegeId}" not found. Run supabase/seed.sql or set GEC_TEST_COLLEGE_ID to a valid College.id.`,
      );
      process.exit(1);
    }
  }

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  let userId;

  if (authErr) {
    const msg = authErr.message || "";
    if (msg.includes("already been registered") || msg.includes("already exists")) {
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
      const found = list?.users?.find((u) => u.email?.toLowerCase() === email);
      if (!found) {
        console.error(authErr);
        process.exit(1);
      }
      userId = found.id;
      console.log("Auth user already exists; syncing public.User row only.");
    } else {
      console.error(authErr);
      process.exit(1);
    }
  } else if (created?.user) {
    userId = created.user.id;
    console.log("Created Auth user:", userId);
  } else {
    console.error("Unexpected: no user returned");
    process.exit(1);
  }

  const { error: upsertErr } = await admin.from("User").upsert(
    {
      id: userId,
      email,
      name,
      role: "gec_chairman",
      collegeId,
      employeeId: "CTU-ARG-GEC-TEST",
      chairmanProgramId: null,
    },
    { onConflict: "id" },
  );

  if (upsertErr) {
    console.error("public.User upsert failed:", upsertErr.message);
    process.exit(1);
  }

  console.log("");
  console.log("GEC Chairman test account ready:");
  console.log("  Email:   ", email);
  console.log("  Password:", password);
  console.log("  User id: ", userId);
  console.log("  College: ", collegeId ?? "(none — campus-wide GEC)");
  console.log("");
  console.log("Sign in at http://localhost:3000/login then open /admin/gec (vacant slots, request access).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
