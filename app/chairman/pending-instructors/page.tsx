import { redirect } from "next/navigation";
import { ChairmanScopedPage } from "@/components/chairman/ChairmanScopedPage";
import { PendingInstructorsReview } from "@/components/faculty/PendingInstructorsReview";
import { getChairmanSession } from "@/lib/auth/chairman-session";

/**
 * Chairman approval queue for instructor self-registrations.
 *
 * Scope is enforced by the API from the session's college, not from anything
 * this page passes — so a chairman cannot see or act on another college's
 * applicants even by crafting a request.
 */
export default async function ChairmanPendingInstructorsPage() {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  return (
    <ChairmanScopedPage
      title="Pending Instructors"
      subtitle="Instructors who verified their CTU email and are waiting for your approval."
      chairmanCollegeId={session.collegeId}
      chairmanProgramId={session.programId}
      chairmanProgramCode={session.programCode}
      chairmanProgramName={session.programName}
    >
      <PendingInstructorsReview />
    </ChairmanScopedPage>
  );
}
