import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormFaculty } from "@/components/ins/INSFormFaculty";
import { getChairmanSession } from "@/lib/auth/chairman-session";
import { redirect } from "next/navigation";

export default async function InsFacultyPage() {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Schedule view — your college; filter by program only."
      />
      <INSFormFaculty
        chairmanCollegeId={session.collegeId}
        chairmanProgramId={session.programId}
        chairmanProgramCode={session.programCode}
        chairmanProgramName={session.programName}
      />
    </div>
  );
}
