import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiClientError, authApi, type Role, type SafeUser } from "@/lib/api/client";
import { getDefaultHomeForRole } from "@/lib/auth/role-home";

function isNextRedirect(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest ?? "").startsWith("NEXT_REDIRECT"),
  );
}

function shouldLoginRedirect(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  if (error.status === 401) return true;
  if (error.status === 403) return true;
  return false;
}

export async function getAuthenticatedProfile(): Promise<SafeUser> {
  try {
    const store = await cookies();
    const cookieHeader = store
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    if (!cookieHeader) {
      redirect("/login");
    }

    const { user } = await authApi.me({ cookieHeader });

    if (!user) {
      redirect("/login");
    }

    return user;
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    if (shouldLoginRedirect(error)) {
      redirect("/login");
    }
    console.error("[getAuthenticatedProfile] Auth failed:", error);
    throw error;
  }
}

export async function getOptionalProfile(): Promise<SafeUser | null> {
  try {
    const store = await cookies();
    const cookieHeader = store
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    if (!cookieHeader) {
      return null;
    }

    const { user } = await authApi.me({ cookieHeader });
    return user || null;
  } catch {
    return null;
  }
}

export async function requireRoles(allowedRoles: Role[]): Promise<SafeUser> {
  const profile = await getAuthenticatedProfile();

  if (!allowedRoles.includes(profile.role)) {
    redirect(getDefaultHomeForRole(profile.role));
  }

  return profile;
}
