import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import type { SchedulingPolicyConfig } from "@/lib/system-configuration/scheduling-policy";

type Body = {
  schedulingPolicy?: SchedulingPolicyConfig;
};

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
  const schedulingPolicy = body?.schedulingPolicy;
  if (!schedulingPolicy || typeof schedulingPolicy !== "object") {
    return NextResponse.json({ error: "schedulingPolicy object is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("CampusInsSettings")
    .update({ schedulingPolicy })
    .eq("id", "default");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
