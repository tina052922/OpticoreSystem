import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { FacultyScheduleTermClient } from "@/components/portal/FacultyScheduleTermClient";
import { requireRoles } from "@/lib/auth/require-role";

export default async function FacultySchedulePage() {
  const profile = await requireRoles(["instructor"]);

  return (
    <div>
      <ChairmanPageHeader
        title="My Schedule"
        subtitle="INS Form 5A — your teaching grid for the academic period selected in the header."
      />
      <FacultyScheduleTermClient facultyName={profile.name} facultyUserId={profile.id} />
    </div>
  );
}
