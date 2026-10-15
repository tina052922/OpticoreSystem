import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  sessionGateFor,
} from "@/lib/auth/session-refresh";

/** Express, reached directly from the edge — the browser's relative rewrite does not apply here. */
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(
  /\/+$/,
  "",
);

/**
 * Renew the session on the way through, and hand the browser the new cookies.
 *
 * A page rendered on the server cannot renew anything by itself: it reads the request's cookies, so
 * a token refreshed behind its back is a token it never sees. Doing it here means the refreshed
 * cookies reach both the browser (via `Set-Cookie` on this response) and the render that follows
 * (via the request headers), so one navigation recovers the session instead of bouncing to login.
 */
async function refreshSession(request: NextRequest): Promise<NextResponse | null> {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        accept: "application/json",
        cookie: `${REFRESH_TOKEN_COOKIE}=${refreshToken}`,
      },
      cache: "no-store",
    });
  } catch {
    // The API being unreachable is not a logout; let the page try and report it properly.
    return null;
  }

  if (!upstream.ok) return null;

  /*
   * `getSetCookie` keeps the two cookies apart; reading the joined `set-cookie` header and
   * splitting on commas corrupts any cookie whose value or Expires date contains one.
   */
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  if (setCookies.length === 0) return null;

  const response = NextResponse.next();
  for (const cookie of setCookies) response.headers.append("set-cookie", cookie);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessToken = request.cookies.has(ACCESS_TOKEN_COOKIE);

  const isProtectedRoute =
    pathname.startsWith("/chairman") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/doi") ||
    pathname.startsWith("/faculty") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/gec");

  if (isProtectedRoute) {
    const gate = sessionGateFor({
      hasAccessToken,
      hasRefreshToken: request.cookies.has(REFRESH_TOKEN_COOKIE),
    });
    if (gate === "login") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (gate === "refresh") {
      const refreshed = await refreshSession(request);
      // A refusal means the session really is over; anything else is served as normal.
      if (refreshed) return refreshed;
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  const authRedirectRoutes = ["/login"];

  if (authRedirectRoutes.includes(pathname) && hasAccessToken) {
    // Always land on `/` so the role home (not a leftover last_visited_path) is used.
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Serve the latest kiosk at this URL — do not 307 to the old standalone filename.
  if (pathname === "/campus-navigation" || pathname === "/campus-navigation/") {
    const url = request.nextUrl.clone();
    url.pathname = "/campus-navigation-standalone.html";
    const response = NextResponse.rewrite(url);
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/chairman/:path*",
    "/admin/:path*",
    "/doi/:path*",
    "/faculty/:path*",
    "/student/:path*",
    "/gec/:path*",
    "/",
    "/login",
    "/campus-navigation",
    "/campus-navigation/",
  ],
};
