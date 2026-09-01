import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";
import { getDefaultHomeForRole } from "@/lib/auth/role-home";

export type DoiSession = {
  authId: string;
  email: string;
  name: string;
  role: "doi_admin";
  collegeId: string | null;
  profileImageUrl?: string | null;
};

export async function getDoiSession(): Promise<DoiSession> {
  const user = await getAuthenticatedProfile();
  if (user.role !== "doi_admin") {
    redirect(getDefaultHomeForRole(user.role));
  }

  return {
    authId: user.id,
    email: user.email,
    name: user.name ?? "",
    role: "doi_admin",
    collegeId: user.collegeId ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
  };
}
