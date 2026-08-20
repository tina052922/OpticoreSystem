// web/lib/auth/require-role.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authApi } from "@/lib/api/client";
import type { Role, SafeUser } from "@/lib/api/client";

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

    // Fetch user from Express backend using the cookie header
    const { user } = await authApi.me({ cookieHeader });

    if (!user) {
      redirect("/login");
    }

    return user;
  } catch (error) {
    // Next.js redirect throws a specific error that must not be caught and swallowed
    if (error && typeof error === "object" && "digest" in error && (error as any).digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("[getAuthenticatedProfile] Auth failed:", error);
    redirect("/login");
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
  } catch (error) {
    return null;
  }
}

export async function requireRoles(allowedRoles: Role[]): Promise<SafeUser> {
  const profile = await getAuthenticatedProfile();

  if (!allowedRoles.includes(profile.role)) {
    // Redirect to login with a forbidden error so the UI can show a message
    redirect(`/login?error=forbidden_role`);
  }

  return profile;
}
