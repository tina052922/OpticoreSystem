import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/** Public catalog for registration dropdowns (anon policy on College; no session required). */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ colleges: [] });
  }
  const supabase = createClient(url, anon);
  const { data, error } = await supabase.from("College").select("id, code, name").order("code");
  if (error) {
    return NextResponse.json({ error: error.message, colleges: [] }, { status: 400 });
  }
  return NextResponse.json({ colleges: data ?? [] });
}
