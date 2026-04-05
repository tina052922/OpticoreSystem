import { redirect } from "next/navigation";
import { ChairmanScopedPage } from "@/components/chairman/ChairmanScopedPage";
import { FacultyProfileWorkspace } from "@/components/faculty/FacultyProfileWorkspace";
import { getChairmanSession } from "@/lib/auth/chairman-session";

export default async function ChairmanFacultyProfilePage() {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  return (
    <ChairmanScopedPage
      title="Faculty Profile"
      subtitle="Faculty linked to your college — scope is locked to your assigned program."
      chairmanCollegeId={session.collegeId}
      chairmanProgramId={session.programId}
      chairmanProgramCode={session.programCode}
      chairmanProgramName={session.programName}
    >
      <FacultyProfileWorkspace
        chairmanCollegeId={session.collegeId}
        chairmanProgramCode={session.programCode}
      />
    </ChairmanScopedPage>
  );
}
