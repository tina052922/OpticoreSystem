import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { SystemConfigurationClient } from "@/components/admin/SystemConfigurationClient";
import { getDoiSession } from "@/lib/auth/doi-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DoiSystemConfigurationPage() {
  const session = await getDoiSession();
  if (!session) redirect("/login?next=/doi/system-configuration");

  return (
    <div>
      <ChairmanPageHeader
        title="System Configuration"
        subtitle="Signatories, teaching load, and academic terms"
      />
      <SystemConfigurationClient mode="doi" />
    </div>
  );
}
