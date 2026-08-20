import { cookies } from "next/headers";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { SystemConfigurationClient } from "@/components/admin/SystemConfigurationClient";
import { requireRoles } from "@/lib/auth/require-role";
import { apiFetch } from "@/lib/api/client";

export const dynamic = "force-dynamic";

export default async function CollegeSystemConfigurationPage() {
  const profile = await requireRoles(["college_admin"]);
  let collegeName: string | null = null;
  if (profile.collegeId) {
    try {
      const cookieStore = await cookies();
      const data = await apiFetch<{ colleges: { name: string }[] }>(
        `/api/catalog/colleges?extended=true`,
        { method: "GET", cookieHeader: cookieStore.toString() },
      );
      collegeName = data.colleges.find((c: any) => c.id === profile.collegeId)?.name ?? null;
    } catch { /* ignore */ }
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
