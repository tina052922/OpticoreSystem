import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";

async function requireAdmin(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const profile = await fetchMyUserRowForAuth(supabase, user.id);
  if (!profile || (profile.role !== "college_admin" && profile.role !== "doi_admin")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { profile };
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const gate = await requireAdmin(supabase);
  if ("error" in gate && gate.error) return gate.error;

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    semester?: string;
    academicYear?: string;
    startDate?: string | null;
    endDate?: string | null;
    setCurrent?: boolean;
  } | null;

  const name = body?.name?.trim() ?? "";
  const semester = body?.semester?.trim() ?? "";
  const academicYear = body?.academicYear?.trim() ?? "";
  if (!name || !semester || !academicYear) {
    return NextResponse.json({ error: "name, semester, and academicYear are required" }, { status: 400 });
  }

  if (body?.setCurrent) {
    await supabase.from("AcademicPeriod").update({ isCurrent: false }).eq("isCurrent", true);
  }

  const { data, error } = await supabase
    .from("AcademicPeriod")
    .insert({
      name,
      semester,
      academicYear,
      startDate: body?.startDate || null,
      endDate: body?.endDate || null,
      isCurrent: Boolean(body?.setCurrent),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const gate = await requireAdmin(supabase);
  if ("error" in gate && gate.error) return gate.error;

  const body = (await req.json().catch(() => null)) as { setCurrentId?: string } | null;
  const setCurrentId = body?.setCurrentId?.trim();
  if (!setCurrentId) {
    return NextResponse.json({ error: "setCurrentId is required" }, { status: 400 });
  }

  const { error: clearErr } = await supabase.from("AcademicPeriod").update({ isCurrent: false }).eq("isCurrent", true);
  if (clearErr) {
    return NextResponse.json({ error: clearErr.message }, { status: 400 });
  }

  const { error } = await supabase.from("AcademicPeriod").update({ isCurrent: true }).eq("id", setCurrentId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
