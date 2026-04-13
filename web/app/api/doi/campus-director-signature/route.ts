import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";

const SETTINGS_ID = "default";

/**
 * DOI admin only: upload or replace the campus-wide Campus Director signature (INS Form 5B and full strip).
 * Storage path: `signatures/campus/campus-director-{ts}.{ext}` → `CampusInsSettings.campusDirectorSignatureImageUrl`
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
  if (!profile || profile.role !== "doi_admin") {
    return NextResponse.json({ error: "Forbidden — DOI admin only" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server is not configured for storage uploads (service role)." }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size < 1) {
    return NextResponse.json({ error: "A non-empty file is required" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  if (!["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
    return NextResponse.json({ error: "Use PNG, JPEG, WebP, or GIF" }, { status: 400 });
  }

  const path = `campus/campus-director-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;

  const { error: upErr } = await admin.storage.from("signatures").upload(path, buf, {
    contentType,
    upsert: true,
  });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  const { data: pub } = admin.storage.from("signatures").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { error: dbErr } = await admin.from("CampusInsSettings").upsert(
    {
      id: SETTINGS_ID,
      campusDirectorSignatureImageUrl: publicUrl,
    },
    { onConflict: "id" },
  );

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, url: publicUrl });
}

/** Clear campus-wide Campus Director signature. */
export async function DELETE() {
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
  if (!profile || profile.role !== "doi_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration" }, { status: 503 });
  }

  const { error: dbErr } = await admin
    .from("CampusInsSettings")
    .update({ campusDirectorSignatureImageUrl: null })
    .eq("id", SETTINGS_ID);

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
