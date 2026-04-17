import { redirect } from "next/navigation";
import { ChairmanScopedPage } from "@/components/chairman/ChairmanScopedPage";
import { SubjectCodesWorkspace } from "@/components/subjects/SubjectCodesWorkspace";
import { getChairmanSession } from "@/lib/auth/chairman-session";

export default async function ChairmanSubjectCodesPage() {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  return (
    <ChairmanScopedPage
      title="Subject Codes"
      subtitle="Official curriculum reference for your assigned program (static prospectus when available in the registry)."
      chairmanCollegeId={session.collegeId}
      chairmanProgramId={session.programId}
      chairmanProgramCode={session.programCode}
      chairmanProgramName={session.programName}
    >
      <SubjectCodesWorkspace lockedProgramId={session.programId} lockedProgramCode={session.programCode} />
    </ChairmanScopedPage>
  );
}
