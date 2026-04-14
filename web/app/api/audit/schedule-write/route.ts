import { NextResponse } from "next/server";
import { insertAuditLog } from "@/lib/server/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";

const SCHEDULE_EDITOR_ROLES = new Set(["chairman_admin", "gec_chairman"]);

/**
 * Centralized audit trail for Program Chairman / GEC Chairman writes to `ScheduleEntry`
 * (no inbox forwarding — College Admin uses Audit log + Central Hub).
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await fetchMyUserRowForAuth(supabase, user.id);
  if (!profile || !SCHEDULE_EDITOR_ROLES.has(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    collegeId?: string | null;
    academicPeriodId?: string | null;
    details?: Record<string, unknown> | null;
  } | null;

  const action = (body?.action ?? "schedule.write").trim() || "schedule.write";
  const collegeId = body?.collegeId ?? profile.collegeId ?? null;

  const { error } = await insertAuditLog(supabase, {
    actorId: user.id,
    collegeId,
    action,
    entityType: "ScheduleEntry",
    entityId: body?.academicPeriodId ?? null,
    details: {
      ...(body?.details ?? {}),
      academicPeriodId: body?.academicPeriodId ?? null,
    },
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
