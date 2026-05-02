import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { FacultyDashboardTermClient } from "@/components/portal/FacultyDashboardTermClient";
import { requireRoles } from "@/lib/auth/require-role";

/** Instructor-only summary: load, roster, and quick links to INS / change requests. */
export default async function FacultySchedulePage() {
  const profile = await requireRoles(["instructor"]);

  return (
    <div>
      <ChairmanPageHeader title="My schedule" subtitle="Your assignments and weekly load for the selected term." />
      <FacultyDashboardTermClient profileName={profile.name} surface="my-schedule" />
    </div>
  );
}
