import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";
import { getDefaultHomeForRole } from "@/lib/auth/role-home";

export type ChairmanSession = {
  id: string;
  email: string;
  name: string | null;
  role: "chairman_admin";
  collegeId: string | null;
  programId: string | null;
  programCode: string | null;
  programName: string | null;
  profileImageUrl: string | null;
  signatureImageUrl: string | null;
  employeeId: string | null;
};

export async function getChairmanSession(): Promise<ChairmanSession> {
  const user = await getAuthenticatedProfile();
  if (user.role !== "chairman_admin") {
    redirect(getDefaultHomeForRole(user.role));
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: "chairman_admin",
    collegeId: user.collegeId ?? null,
    programId: user.chairmanProgramId ?? null,
    programCode: user.chairmanProgramCode ?? null,
    programName: user.chairmanProgramName ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
    signatureImageUrl: user.signatureImageUrl ?? null,
    employeeId: user.employeeId ?? null,
  };
}
