import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Paginated audit log (RLS: college scope, CAS/DOI campus-wide). */
export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const { data: rows, error } = await supabase
    .from("AuditLog")
    .select("id, actorId, collegeId, action, entityType, entityId, details, createdAt")
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const actorIds = [...new Set((rows ?? []).map((r) => r.actorId))];
  let names: Record<string, string> = {};
  if (actorIds.length) {
    const { data: users } = await supabase.from("User").select("id, name").in("id", actorIds);
    names = Object.fromEntries((users ?? []).map((u) => [u.id, u.name]));
  }

  const entries = (rows ?? []).map((r) => ({
    ...r,
    actorName: names[r.actorId] ?? r.actorId,
  }));

  return NextResponse.json({ entries });
}
