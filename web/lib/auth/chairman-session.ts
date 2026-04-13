import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";

/** COTE / seed college id — when `chairmanProgramId` is not set in DB yet, session defaults to BSIT for this college. */
const CTE_COLLEGE_ID = "col-tech-eng";
const DEFAULT_BSIT_PROGRAM_ID = "prog-bsit";

export type ChairmanSession = {
  authId: string;
  email: string;
  name: string;
  role: "chairman_admin";
  collegeId: string | null;
  /** Single program the chairman may manage (e.g. BSIT). */
  programId: string | null;
  programCode: string | null;
  programName: string | null;
  signatureImageUrl?: string | null;
};

export async function getChairmanSession(): Promise<ChairmanSession | null> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id || !user.email) return null;

    const row = await fetchMyUserRowForAuth(supabase, user.id);

    if (!row || row.role !== "chairman_admin") return null;

    let programId = row.chairmanProgramId ?? null;
    let programCode = row.chairmanProgramCode ?? null;
    let programName = row.chairmanProgramName ?? null;

    // OptiCore BSIT Chairman: if the column is not migrated yet, default program scope to BSIT (same as seed).
    if (!programId && row.collegeId === CTE_COLLEGE_ID) {
      programId = DEFAULT_BSIT_PROGRAM_ID;
      programCode = programCode ?? "BSIT";
      programName = programName ?? "Bachelor of Science in Information Technology";
    }

    return {
      authId: user.id,
      email: user.email,
      name: row.name,
      role: "chairman_admin",
      collegeId: row.collegeId,
      programId,
      programCode,
      programName,
      signatureImageUrl: row.signatureImageUrl ?? null,
    };
  } catch {
    return null;
  }
}
