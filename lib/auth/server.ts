import "server-only";

/**
 * Server-side helpers for reading the current user inside Next.js server
 * components, route handlers, and layouts.
 *
 * Pattern:
 *
 *   // app/chairman/layout.tsx
 *   import { requireRole } from "@/lib/auth/server";
 *   export default async function Layout({ children }: { children: ReactNode }) {
 *     await requireRole("chairman_admin");
 *     return <>{children}</>;
 *   }
 *
 * Cookies are forwarded from `next/headers` to the backend's `/api/auth/me`.
 * Because both ends agree on cookie names, the user is identified server-
 * side with zero JS-side token handling.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ApiClientError,
  authApi,
  type Role,
  type SafeUser,
} from "@/lib/api/client";
import { getRoleHome } from "@/lib/auth/role-home";

async function buildCookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

/**
 * Returns the current user or `null` if not signed in. Never throws on a
 * 401 (anonymous browsers are a normal case).
 */
export async function getCurrentUserServer(): Promise<SafeUser | null> {
  try {
    const { user } = await authApi.me({ cookieHeader: await buildCookieHeader() });
    return user;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 401) return null;
    // Treat backend outages as "anonymous" so anonymous routes still render.
    // Use `requireAuth`/`requireRole` (below) for routes that MUST gate.
    return null;
  }
}

/**
 * Require an authenticated session. Redirects to `/login` if anonymous.
 * Use inside an `async` server component / layout.
 */
export async function requireAuth(): Promise<SafeUser> {
  const user = await getCurrentUserServer();
  if (!user) redirect("/login");
  return user;
}

/**
 * Require a specific role (or one of several). Redirects to the user's
 * own home (or `/login` if anonymous) on mismatch.
 */
export async function requireRole(...allowed: Role[]): Promise<SafeUser> {
  const user = await requireAuth();
  if (!allowed.includes(user.role)) {
    redirect(getRoleHome(user.role));
  }
  return user;
}
