import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessToken = request.cookies.has("oc_at");

  const isProtectedRoute =
    pathname.startsWith("/chairman") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/doi") ||
    pathname.startsWith("/faculty") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/gec");

  // Protected route without auth → redirect to login
  if (isProtectedRoute && !hasAccessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const authRedirectRoutes = ["/login"];

  if (authRedirectRoutes.includes(pathname) && hasAccessToken) {
    const lastPath = request.cookies.get("last_visited_path")?.value;
    if (lastPath && lastPath !== "/login" && lastPath !== "/register" && lastPath.startsWith("/")) {
      return NextResponse.redirect(new URL(lastPath, request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
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
  ],
};
