import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getSupabaseAdminConfigError } from "@/lib/supabase/admin";
import { generateInstructorTempPassword } from "@/lib/auth/instructor-registration";
import { migrateInstructorPlaceholderToAuthUser } from "@/lib/server/instructor-placeholder-migrate";

type Body = {
  fullName?: string;
  email?: string;
  employeeId?: string;
  collegeId?: string | null;
};

const GMAIL_RE = /@gmail\.com$/i;

/**
 * Self-service instructor registration: creates Auth user + public.User + FacultyProfile.
 *
 * Schedules always reference `ScheduleEntry.instructorId` = `public.User.id`. Chairmen plot by **Employee ID** in the UI;
 * the placeholder `User` row created in Faculty Profile shares that `employeeId`, so when this API links Auth to the
 * placeholder (`migrateInstructorPlaceholderToAuthUser`), existing schedule rows follow the new `auth.users.id`.
 *
 * ## Chairman plots before the instructor registers (recommended approach)
 * The Chairman should record the person in **Faculty Profile** with the official **Employee ID** first.
 * That creates a placeholder `public.User` (no Auth login) and `FacultyProfile`. The Evaluator then plots
 * `ScheduleEntry.instructorId` = that placeholder id — FKs stay valid. When the instructor self-registers with
 * the **same Employee ID**, we detect the placeholder (no Auth user), create Auth, and **re-point** schedules
 * and profile to `auth.users.id` via {@link migrateInstructorPlaceholderToAuthUser}.
 *
 * If the Chairman skips Faculty Profile and only types a name in the Evaluator, there is no stable Employee ID
 * link — registration cannot attach plots automatically. The product rule is: **Employee ID is the join key.**
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
  let collegeId = body?.collegeId?.trim() || null;

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

  const { data: placeholder } = await admin
    .from("User")
    .select("id, collegeId, email")
    .eq("employeeId", employeeId)
    .maybeSingle();

  if (placeholder) {
    const { data: authLookup } = await admin.auth.admin.getUserById(placeholder.id);
    if (authLookup?.user) {
      const authUser = authLookup.user;
      const authEmail = (authUser.email ?? "").trim().toLowerCase();
      if (authEmail && authEmail !== email) {
        return NextResponse.json(
          { error: "This Employee ID is linked to a different email. Sign in with the email on file or contact admin." },
          { status: 409 },
        );
      }
      const meta = (authUser.user_metadata ?? {}) as { must_change_password?: boolean; full_name?: string };
      /** Account exists but first-time setup (password change) not finished — allow resuming without a false "already registered" error. */
      if (meta.must_change_password === true) {
        const temporaryPassword = generateInstructorTempPassword();
        const { error: pwdErr } = await admin.auth.admin.updateUserById(placeholder.id, {
          password: temporaryPassword,
          user_metadata: {
            ...meta,
            must_change_password: true,
            full_name: fullName,
          },
        });
        if (pwdErr) {
          return NextResponse.json({ error: pwdErr.message ?? "Could not refresh sign-in credentials." }, { status: 400 });
        }
        await admin
          .from("User")
          .update({ email, name: fullName, collegeId: collegeId ?? placeholder.collegeId })
          .eq("id", placeholder.id);
        await admin.from("FacultyProfile").update({ fullName }).eq("userId", placeholder.id);
        return NextResponse.json({
          ok: true,
          resumedIncompleteSetup: true,
          message: "Finish setup: verify the on-screen code, then set your new password.",
          temporaryPassword,
        });
      }
      return NextResponse.json(
        { error: "This instructor is already registered. Sign in with your email." },
        { status: 409 },
      );
    }

    if (!collegeId && placeholder.collegeId) {
      collegeId = placeholder.collegeId;
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
    const mig = await migrateInstructorPlaceholderToAuthUser(admin, placeholder.id, uid, {
      email,
      name: fullName,
      collegeId,
      employeeId,
    });

    if (mig.error) {
      await admin.auth.admin.deleteUser(uid);
      return NextResponse.json({ error: `Could not link your account to existing records: ${mig.error}` }, { status: 500 });
    }

    // Demo requirement: do not send email codes/passwords. Client will show OTP and force password change.
    const payload: Record<string, unknown> = {
      ok: true,
      linkedPlaceholder: true,
      message: "Account linked. Continue to OTP verification.",
      temporaryPassword,
    };

    return NextResponse.json(payload);
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

  // Demo requirement: do not send email codes/passwords. Client will show OTP and force password change.
  const payload: Record<string, unknown> = {
    ok: true,
    message: "Account created. Continue to OTP verification.",
    temporaryPassword,
  };

  return NextResponse.json(payload);
}
