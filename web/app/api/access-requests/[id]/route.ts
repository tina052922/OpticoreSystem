import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { insertAuditLog } from "@/lib/server/audit-log";
import { Q } from "@/lib/supabase/catalog-columns";

const APPROVAL_DAYS = 14;

type PatchBody = {
  status?: "approved" | "rejected";
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
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
  if (!profile || profile.role !== "college_admin") {
    return NextResponse.json({ error: "Only College Admin can approve or reject" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as PatchBody | null;
  const status = body?.status;
  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "status must be approved or rejected" }, { status: 400 });
  }

  const expiresAt =
    status === "approved"
      ? new Date(Date.now() + APPROVAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { data: updated, error } = await supabase
    .from("AccessRequest")
    .update({
      status,
      reviewedById: user.id,
      reviewedAt: new Date().toISOString(),
      expiresAt,
    })
    .eq("id", id)
    .select(Q.accessRequest)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Request not found or not allowed" }, { status: 404 });
  }

  await insertAuditLog(supabase, {
    actorId: user.id,
    collegeId: profile.collegeId,
    action: status === "approved" ? "access_request.approved" : "access_request.rejected",
    entityType: "AccessRequest",
    entityId: id,
    details: {
      requesterId: updated.requesterId,
      scopes: updated.scopes,
      expiresAt: updated.expiresAt,
    },
  });

  return NextResponse.json({ ok: true, request: updated });
}
