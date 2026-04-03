import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import type { UserRole } from "@/types/db";

export type AuthProfileRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  collegeId: string | null;
};

/** Session row when route layout already enforced role (avoid duplicate requireRoles in page). */
export async function getAuthenticatedProfile(): Promise<AuthProfileRow> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=supabase_config");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) redirect("/login");

  const row = await fetchMyUserRowForAuth(supabase, user.id);
  if (!row) redirect("/login");
  return row as AuthProfileRow;
}

export async function requireRoles(allowed: UserRole[]): Promise<AuthProfileRow> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=supabase_config");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) redirect("/login");

  const row = await fetchMyUserRowForAuth(supabase, user.id);
  if (!row || !allowed.includes(row.role as UserRole)) {
    redirect("/login?error=forbidden_role");
  }
  return row as AuthProfileRow;
}
