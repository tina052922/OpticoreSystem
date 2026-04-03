import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
/** Supabase may refresh the session in middleware; those cookies live on `sessionResponse`. NextResponse.redirect() must copy them or the browser keeps stale tokens. */
function redirectWithSession(sessionResponse: NextResponse, url: URL) {
  const redirect = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach((c) => {
    redirect.cookies.set(c.name, c.value);
  });
  return redirect;
}

/** First matching prefix wins (longest paths first). */
function requiredRoleForPath(path: string): string | null {
  if (path.startsWith("/admin/college")) return "college_admin";
  if (path.startsWith("/admin/cas")) return "cas_admin";
  if (path.startsWith("/admin/gec")) return "gec_chairman";
  if (path.startsWith("/chairman")) return "chairman_admin";
  if (path.startsWith("/doi")) return "doi_admin";
  if (path.startsWith("/faculty")) return "instructor";
  if (path.startsWith("/student")) return "student";
  return null;
}

function isProtectedPath(path: string): boolean {
  return requiredRoleForPath(path) !== null;
}

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response, configured } = createSupabaseMiddlewareClient(request);

    const path = request.nextUrl.pathname;

    // Root URL always goes to login (do not auto-skip to a role dashboard here).
    if (path === "/" || path === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return redirectWithSession(response, url);
    }

    if (!configured || !supabase) {
      if (isProtectedPath(path)) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("error", "supabase_config");
        url.searchParams.set("next", path);
        return redirectWithSession(response, url);
      }
      return NextResponse.next();
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[middleware] getUser:", authError.message);
    }

    const requiredRole = requiredRoleForPath(path);
    if (requiredRole) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", path);
        return redirectWithSession(response, url);
      }

      const profile = await fetchMyUserRowForAuth(supabase, user.id);

      if (!profile || profile.role !== requiredRole) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("error", "forbidden_role");
        return redirectWithSession(response, url);
      }
    }

    // Intentionally do NOT redirect away from /login when a session exists.
    // Otherwise opening localhost → / → /login would immediately jump to a dashboard.
    // After sign-in, LoginClient navigates to the role home.

    return response;
  } catch (e) {
    console.error("[middleware]", e);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
