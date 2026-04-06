import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getSupabaseAdminConfigError } from "@/lib/supabase/admin";

type Body = {
  fullName?: string;
  email?: string;
  password?: string;
  programId?: string;
  sectionId?: string;
  yearLevel?: number;
  studentId?: string | null;
};

/**
 * Creates a confirmed auth user + User + StudentProfile so the client can sign in immediately
 * (avoids "no session" when Supabase email confirmation is enabled for client-side signUp).
 */
export async function POST(req: Request) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    const detail = getSupabaseAdminConfigError() ?? "Supabase admin client unavailable.";
    return NextResponse.json({ error: detail }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const fullName = body?.fullName?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const programId = body?.programId?.trim() ?? "";
  const sectionId = body?.sectionId?.trim() ?? "";
  const yearLevel = typeof body?.yearLevel === "number" ? body.yearLevel : parseInt(String(body?.yearLevel), 10);
  const studentIdRaw = body?.studentId?.trim();

  if (!fullName || fullName.length < 2) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  if (!programId || !sectionId) {
    return NextResponse.json({ error: "Program and section are required." }, { status: 400 });
  }
  if (!Number.isFinite(yearLevel) || yearLevel < 1 || yearLevel > 4) {
    return NextResponse.json({ error: "Year level must be between 1 and 4." }, { status: 400 });
  }

  const { data: sec, error: secErr } = await admin
    .from("Section")
    .select("id, programId, yearLevel")
    .eq("id", sectionId)
    .maybeSingle();

  if (secErr || !sec) {
    return NextResponse.json({ error: "Invalid section." }, { status: 400 });
  }
  if (sec.programId !== programId || sec.yearLevel !== yearLevel) {
    return NextResponse.json({ error: "Program, section, and year level do not match." }, { status: 400 });
  }

  const { data: prog, error: progErr } = await admin.from("Program").select("id, collegeId").eq("id", programId).maybeSingle();

  if (progErr || !prog?.collegeId) {
    return NextResponse.json({ error: "Invalid program." }, { status: 400 });
  }

  const collegeId = prog.collegeId;
  const employeeId = studentIdRaw ? studentIdRaw : null;

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authErr || !created?.user) {
    const msg = authErr?.message ?? "Could not create account";
    const status = msg.includes("already been registered") || msg.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  const uid = created.user.id;

  const { error: uErr } = await admin.from("User").insert({
    id: uid,
    email,
    name: fullName,
    role: "student",
    collegeId,
    employeeId,
  });

  if (uErr) {
    await admin.auth.admin.deleteUser(uid);
    return NextResponse.json(
      { error: uErr.message.includes("unique") ? "That email or student ID is already registered." : uErr.message },
      { status: 400 },
    );
  }

  const { error: spErr } = await admin.from("StudentProfile").insert({
    userId: uid,
    programId,
    sectionId,
    yearLevel,
  });

  if (spErr) {
    await admin.from("User").delete().eq("id", uid);
    await admin.auth.admin.deleteUser(uid);
    return NextResponse.json({ error: "Could not complete student profile. Try again or contact support." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
