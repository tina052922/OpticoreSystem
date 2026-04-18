import type { SupabaseClient } from "@supabase/supabase-js";

/** Narrow row shape for auth checks (no import from @/types to keep middleware Edge bundle simple). */
export type AuthUserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  collegeId: string | null;
  employeeId?: string | null;
  chairmanProgramId?: string | null;
  chairmanProgramCode?: string | null;
  chairmanProgramName?: string | null;
  signatureImageUrl?: string | null;
  profileImageUrl?: string | null;
};

/** Prefer RPC (SECURITY DEFINER); fallback to table + lowercase id. */
export async function fetchMyUserRowForAuth(
  supabase: SupabaseClient,
  userId: string,
): Promise<AuthUserProfile | null> {
  const { data: rpcData, error: rpcErr } = await supabase.rpc("auth_get_my_user_row");
  if (!rpcErr && rpcData && typeof rpcData === "object" && rpcData !== null && "role" in rpcData) {
    const row = rpcData as AuthUserProfile;
    if (String(row.role ?? "").trim()) return row;
  }

  const uid = userId.toLowerCase();
  const { data: row, error: rowErr } = await supabase
    .from("User")
    .select("id,email,name,role,collegeId,employeeId,chairmanProgramId,signatureImageUrl,profileImageUrl")
    .eq("id", uid)
    .maybeSingle<AuthUserProfile>();

  if (rowErr || !row) return null;
  return row;
}
