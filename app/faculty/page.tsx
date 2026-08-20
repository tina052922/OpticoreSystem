import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { FacultyDashboardTermClient } from "@/components/portal/FacultyDashboardTermClient";
import { requireRoles } from "@/lib/auth/require-role";

export default async function FacultyDashboardPage() {
  const profile = await requireRoles(["instructor"]);

  return (
    <div>
      <ChairmanPageHeader title="Campus Intelligence" />
      <FacultyDashboardTermClient profileName={profile.name ?? ""} surface="campus-intelligence" />
    </div>
  );
}
