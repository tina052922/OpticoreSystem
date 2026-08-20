import { cookies } from "next/headers";
import { authApi } from "@/lib/api/client";

export type DoiSession = {
  authId: string;
  email: string;
  name: string;
  role: "doi_admin";
  collegeId: string | null;
  profileImageUrl?: string | null;
};

export async function getDoiSession(): Promise<DoiSession | null> {
  // Strategy 1: Express backend (preferred — no Supabase env vars needed)
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    if (cookieHeader) {
      const { user } = await authApi.me({ cookieHeader });
      if (user && user.role === "doi_admin") {
        return {
          authId: user.id,
          email: user.email,
          name: user.name ?? "",
          role: "doi_admin",
          collegeId: user.collegeId ?? null,
          profileImageUrl: null,
        };
      }
    }
  } catch {
    // Express API not available
  }

  return null;
}
