import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getSupabaseAdminConfigError } from "@/lib/supabase/admin";
import { generateInstructorTempPassword } from "@/lib/auth/instructor-registration";
import { sendInstructorWelcomeEmail } from "@/lib/server/send-instructor-welcome-email";

type Body = {
  fullName?: string;
  email?: string;
  employeeId?: string;
  collegeId?: string | null;
};

const GMAIL_RE = /@gmail\.com$/i;

/**
 * Self-service instructor registration: creates auth user with temp password, public.User + FacultyProfile.
 * Email with password is sent via Resend when RESEND_API_KEY is set; in development the response may include devOnlyPassword.
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
  const employeeId = body?.employeeId?.trim() ?? "";
  const collegeId = body?.collegeId?.trim() || null;

  if (!fullName || fullName.length < 2) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!employeeId || employeeId.length < 2) {
    return NextResponse.json({ error: "Employee ID is required." }, { status: 400 });
  }
  if (!GMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Use a Gmail address (@gmail.com) for self-registration, or contact your college admin." },
      { status: 400 },
    );
  }

  if (collegeId) {
    const { data: col } = await admin.from("College").select("id").eq("id", collegeId).maybeSingle();
    if (!col) {
      return NextResponse.json({ error: "Invalid college selected." }, { status: 400 });
    }
  }

  const { data: eidTaken } = await admin.from("User").select("id").eq("employeeId", employeeId).maybeSingle();
  if (eidTaken) {
    return NextResponse.json({ error: "That Employee ID is already registered." }, { status: 409 });
  }

  const temporaryPassword = generateInstructorTempPassword();

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      must_change_password: true,
      full_name: fullName,
    },
  });

  if (authErr || !created?.user) {
    const msg = authErr?.message ?? "Could not create account";
    const status = msg.includes("already been registered") || msg.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  const uid = created.user.id;

  const { error: userErr } = await admin.from("User").insert({
    id: uid,
    email,
    name: fullName,
    role: "instructor",
    collegeId,
    employeeId,
  });

  if (userErr) {
    await admin.auth.admin.deleteUser(uid);
    return NextResponse.json(
      { error: userErr.message.includes("unique") ? "That email is already registered." : userErr.message },
      { status: 400 },
    );
  }

  const { error: fpErr } = await admin.from("FacultyProfile").insert({
    userId: uid,
    fullName,
  });

  if (fpErr) {
    await admin.from("User").delete().eq("id", uid);
    await admin.auth.admin.deleteUser(uid);
    return NextResponse.json({ error: "Could not create faculty profile. Try again or contact support." }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const emailResult = await sendInstructorWelcomeEmail({
    to: email,
    name: fullName,
    temporaryPassword,
    appOrigin: origin,
  });

  const payload: Record<string, unknown> = {
    ok: true,
    message: emailResult.sent
      ? "Check your Gmail inbox for your temporary password and next steps."
      : process.env.RESEND_API_KEY
        ? `Account created, but email could not be sent (${emailResult.error ?? "unknown"}). Contact your college admin.`
        : "Account created. Configure RESEND_API_KEY to enable email delivery.",
    emailSent: emailResult.sent,
  };

  if (process.env.NODE_ENV === "development" && !emailResult.sent) {
    (payload as { devOnlyPassword?: string }).devOnlyPassword = temporaryPassword;
    (payload as { devWarning?: string }).devWarning =
      "Development only: temporary password included because email was not sent. Do not enable in production.";
  }

  return NextResponse.json(payload);
}
