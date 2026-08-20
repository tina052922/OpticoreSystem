import { cookies } from "next/headers";
import { authApi } from "@/lib/api/client";

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

export async function getChairmanSession(): Promise<ChairmanSession | null> {
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

    // Strictly ensure this is a chairman admin
    if (!user || user.role !== "chairman_admin") {
      return null;
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
      profileImageUrl: null,
      signatureImageUrl: null,
      employeeId: user.employeeId ?? null,
    };
  } catch (error) {
    console.error("[getChairmanSession] Auth failed:", error);
    return null;
  }
}
