import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { insertAuditLog } from "@/lib/server/audit-log";
import { Q } from "@/lib/supabase/catalog-columns";
import type { AccessScope } from "@/types/db";
import { GEC_DEFAULT_APPROVAL_COLLEGE_ID } from "@/lib/gec-routing";

const ALLOWED: AccessScope[] = ["evaluator", "ins_forms", "gec_vacant_slots"];

function normalizeScopes(raw: unknown): AccessScope[] | null {
  if (!Array.isArray(raw)) return null;
  const out = [...new Set(raw.map(String))] as AccessScope[];
  if (!out.length) return null;
  if (!out.every((s) => ALLOWED.includes(s as AccessScope))) return null;
  return out as AccessScope[];
}

/** List access requests visible to the current user (RLS). */
export async function GET() {
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

  const { data, error } = await supabase
    .from("AccessRequest")
    .select(Q.accessRequest)
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const list = data ?? [];
  const ids = [...new Set(list.map((r) => r.requesterId))];
  let names: Record<string, string> = {};
  if (ids.length) {
    const { data: users } = await supabase.from("User").select("id, name").in("id", ids);
    names = Object.fromEntries((users ?? []).map((u) => [u.id, u.name]));
  }

  const requests = list.map((r) => ({
    ...r,
    requesterName: names[r.requesterId] ?? r.requesterId,
  }));

  return NextResponse.json({ requests });
}

/** Create a pending access request (GEC Chairman, CAS Admin, or College Admin cross-college evaluator). */
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

  const row = await fetchMyUserRowForAuth(supabase, user.id);
  if (!row || !["gec_chairman", "cas_admin", "college_admin"].includes(row.role)) {
    return NextResponse.json(
      { error: "Only GEC Chairman, CAS Admin, or College Admin can use this request flow" },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    scopes?: unknown;
    note?: string;
    /** College Admin only: request access to another college's Central Hub (must differ from your college). */
    targetCollegeId?: string;
  } | null;

  /** College Admin → another college's admin approves (AccessRequest.collegeId = target college). */
  if (row.role === "college_admin") {
    const homeId = row.collegeId?.trim() || null;
    const targetCollegeId = body?.targetCollegeId?.trim() || null;
    if (!homeId) {
      return NextResponse.json({ error: "Your profile must be linked to a college." }, { status: 400 });
    }
    if (!targetCollegeId) {
      return NextResponse.json({ error: "targetCollegeId is required for College Admin requests." }, { status: 400 });
    }
    if (targetCollegeId === homeId) {
      return NextResponse.json({ error: "Use your own college hub without a cross-college request." }, { status: 400 });
    }
    const { data: colRow, error: colErr } = await supabase.from("College").select("id").eq("id", targetCollegeId).maybeSingle();
    if (colErr || !colRow) {
      return NextResponse.json({ error: "Unknown target college." }, { status: 400 });
    }
    const scopes = normalizeScopes(body?.scopes);
    if (!scopes || !scopes.includes("evaluator") || scopes.length !== 1) {
      return NextResponse.json(
        { error: "College Admin cross-college requests must use scopes: [\"evaluator\"] only." },
        { status: 400 },
      );
    }
    const note = body?.note?.trim() || null;
    const { data: inserted, error } = await supabase
      .from("AccessRequest")
      .insert({
        requesterId: user.id,
        collegeId: targetCollegeId,
        status: "pending",
        scopes,
        note,
      })
      .select(Q.accessRequest)
      .maybeSingle();

    if (error) {
      const code = error.code === "23505" ? 409 : 400;
      const msg =
        code === 409
          ? "You already have a pending request for this college. Wait for that college's admin to approve."
          : error.message;
      return NextResponse.json({ error: msg }, { status: code });
    }

    await insertAuditLog(supabase, {
      actorId: user.id,
      collegeId: targetCollegeId,
      action: "access_request.submitted",
      entityType: "AccessRequest",
      entityId: inserted?.id ?? null,
      details: { scopes, note, kind: "college_admin_cross_college_evaluator" },
    });

    const { data: admins } = await supabase
      .from("User")
      .select("id")
      .eq("role", "college_admin")
      .eq("collegeId", targetCollegeId);
    if (admins?.length) {
      const msg = `Another college's admin requested Central Hub Evaluator access (${scopes.join(", ")}). Open Access requests to approve or deny.`;
      await supabase.from("Notification").insert(admins.map((a) => ({ userId: a.id, message: msg })));
    }

    return NextResponse.json({ ok: true, request: inserted });
  }

  /** GEC Chair is campus-wide (GEC core subjects); requests route to COTE College Admin for approval. CAS Admin uses their college. */
  const targetCollegeId =
    row.role === "cas_admin"
      ? row.collegeId
      : row.role === "gec_chairman"
        ? row.collegeId ?? GEC_DEFAULT_APPROVAL_COLLEGE_ID
        : null;
  if (!targetCollegeId) {
    return NextResponse.json({ error: "Your profile must be linked to a college (CAS Admin)." }, { status: 400 });
  }

  const scopes = normalizeScopes(body?.scopes);
  if (!scopes) {
    return NextResponse.json(
      { error: "scopes must be a non-empty array of: evaluator, ins_forms, gec_vacant_slots" },
      { status: 400 },
    );
  }

  const note = body?.note?.trim() || null;

  const { data: inserted, error } = await supabase
    .from("AccessRequest")
    .insert({
      requesterId: user.id,
      collegeId: targetCollegeId,
      status: "pending",
      scopes,
      note,
    })
    .select(Q.accessRequest)
    .maybeSingle();

  if (error) {
    const code = error.code === "23505" ? 409 : 400;
    const msg =
      code === 409
        ? "You already have a pending request for this college. Wait for College Admin or withdraw (contact admin)."
        : error.message;
    return NextResponse.json({ error: msg }, { status: code });
  }

  await insertAuditLog(supabase, {
    actorId: user.id,
    collegeId: targetCollegeId,
    action: "access_request.submitted",
    entityType: "AccessRequest",
    entityId: inserted?.id ?? null,
    details: { scopes, note },
  });

  /** In-app notice for College Admin (replaces workflow Inbox mail). */
  const { data: admins } = await supabase
    .from("User")
    .select("id")
    .eq("role", "college_admin")
    .eq("collegeId", targetCollegeId);
  if (admins?.length) {
    const fromLabel = row.role === "cas_admin" ? "CAS Admin" : "GEC Chairman";
    const msg = `${fromLabel} submitted an access request (${scopes.join(", ")}). Open Access requests to approve or deny.`;
    await supabase.from("Notification").insert(admins.map((a) => ({ userId: a.id, message: msg })));
  }

  return NextResponse.json({ ok: true, request: inserted });
}
