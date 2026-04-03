import { CampusNavigationPlaceholder } from "@/components/campus/CampusNavigationPlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { getDefaultHomeForRole } from "@/lib/auth/role-home";

export default async function CampusNavigationPage() {
  const supabase = await createSupabaseServerClient();
  let backHref = "/login";
  let backLabel = "Back to login";

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      const row = await fetchMyUserRowForAuth(supabase, user.id);
      if (row?.role) {
        backHref = getDefaultHomeForRole(row.role);
        backLabel = "Back to home";
      }
    }
  }

  return <CampusNavigationPlaceholder backHref={backHref} backLabel={backLabel} />;
}
