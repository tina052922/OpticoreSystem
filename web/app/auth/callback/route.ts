import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Exchanges PKCE `code` from email links (password recovery, magic link, OAuth)
 * for a session. Add this URL in Supabase → Authentication → URL Configuration:
 *   http://localhost:3000/auth/callback
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Default to /login so middleware sends the user to their role home (same as post-password sign-in).
  const next = searchParams.get("next") ?? "/login";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.redirect(`${origin}/login?error=supabase_config`);
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
