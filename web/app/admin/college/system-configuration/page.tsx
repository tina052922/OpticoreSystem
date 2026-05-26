import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { SystemConfigurationClient } from "@/components/admin/SystemConfigurationClient";
import { requireRoles } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CollegeSystemConfigurationPage() {
  const profile = await requireRoles(["college_admin"]);
  const supabase = await createSupabaseServerClient();
  let collegeName: string | null = null;
  if (supabase && profile.collegeId) {
    const { data } = await supabase.from("College").select("name").eq("id", profile.collegeId).maybeSingle();
    collegeName = (data as { name?: string } | null)?.name ?? null;
  }

  return (
    <div>
      <ChairmanPageHeader
        title="System Configuration"
        subtitle="Signatories, teaching load, and academic terms"
      />
      <SystemConfigurationClient mode="college" collegeId={profile.collegeId} collegeName={collegeName} />
    </div>
  );
}
