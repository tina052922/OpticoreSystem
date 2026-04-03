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
      subtitle="Official BSIT curriculum (CMO 25 s. 2015, A.Y. 2023–2024) — your program scope only."
      chairmanCollegeId={session.collegeId}
      chairmanProgramId={session.programId}
      chairmanProgramCode={session.programCode}
      chairmanProgramName={session.programName}
    >
      <SubjectCodesWorkspace />
    </ChairmanScopedPage>
  );
}
