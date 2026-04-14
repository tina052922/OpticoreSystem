import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { FacultyDashboardTermClient } from "@/components/portal/FacultyDashboardTermClient";
import { requireRoles } from "@/lib/auth/require-role";

export default async function FacultyDashboardPage() {
  const profile = await requireRoles(["instructor"]);

  return (
    <div>
      <ChairmanPageHeader title="Campus Intelligence" subtitle="Overview of your teaching load for the selected term." />
      <FacultyDashboardTermClient profileName={profile.name} />
    </div>
  );
}
