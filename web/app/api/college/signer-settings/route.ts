import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";

type Body = {
  collegeId?: string;
  campusDirectorUserId?: string | null;
  contractSignerUserId?: string | null;
};

/**
 * College Admin: set Campus Director / Contract signers for INS (their college only).
 * DOI Admin: may update any college.
 */
export async function PATCH(req: Request) {
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
  if (!profile || (profile.role !== "college_admin" && profile.role !== "doi_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const collegeId = body?.collegeId?.trim();
  if (!collegeId) {
    return NextResponse.json({ error: "collegeId is required" }, { status: 400 });
  }

  if (profile.role === "college_admin" && profile.collegeId !== collegeId) {
    return NextResponse.json({ error: "You can only update your own college" }, { status: 403 });
  }

  const { error } = await supabase
    .from("College")
    .update({
      campusDirectorUserId: body?.campusDirectorUserId ?? null,
      contractSignerUserId: body?.contractSignerUserId ?? null,
    })
    .eq("id", collegeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
