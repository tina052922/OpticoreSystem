import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";

export type DoiSession = {
  authId: string;
  email: string;
  name: string;
  role: "doi_admin";
  collegeId: string | null;
  profileImageUrl?: string | null;
};

export async function getDoiSession(): Promise<DoiSession | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id || !user.email) return null;

  const row = await fetchMyUserRowForAuth(supabase, user.id);

  if (!row || row.role !== "doi_admin") return null;

  return {
    authId: user.id,
    email: user.email,
    name: row.name,
    role: "doi_admin",
    collegeId: row.collegeId,
    profileImageUrl: row.profileImageUrl ?? null,
  };
}
