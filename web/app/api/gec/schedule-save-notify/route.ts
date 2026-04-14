import { NextResponse } from "next/server";
import { insertAuditLog } from "@/lib/server/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";

type Body = {
  collegeId?: string | null;
  academicPeriodId?: string | null;
  sectionId?: string | null;
  sectionName?: string | null;
  rowCount?: number;
};

/**
 * Optional hook after GEC Chairman saves vacant rows: audit only (shared `ScheduleEntry` is already live;
 * INS uses `opticore:ins-catalog-reload`). No workflow inbox — College Admin sees changes in hub + audit log.
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
  if (!profile || profile.role !== "gec_chairman") {
    return NextResponse.json({ error: "Only GEC Chairman can send this notification" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const collegeId = body?.collegeId?.trim();
  const academicPeriodId = body?.academicPeriodId?.trim();
  const sectionId = body?.sectionId?.trim();
  const sectionName = body?.sectionName?.trim() || "—";
  const rowCount = typeof body?.rowCount === "number" ? body.rowCount : 0;

  if (!collegeId || !academicPeriodId) {
    return NextResponse.json({ error: "collegeId and academicPeriodId are required" }, { status: 400 });
  }

  let periodLabel = academicPeriodId;
  const { data: ap } = await supabase.from("AcademicPeriod").select("name").eq("id", academicPeriodId).maybeSingle();
  if (ap && typeof (ap as { name?: string }).name === "string") {
    periodLabel = (ap as { name: string }).name;
  }

  await insertAuditLog(supabase, {
    actorId: user.id,
    collegeId,
    action: "gec.vacant_schedule_saved",
    entityType: "ScheduleEntry",
    entityId: sectionId ?? null,
    details: {
      academicPeriodId,
      periodLabel,
      sectionName,
      rowCount,
      kind: "gec_vacant_save",
    },
  });

  return NextResponse.json({ ok: true });
}
