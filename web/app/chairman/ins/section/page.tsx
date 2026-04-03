import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormSection } from "@/components/ins/INSFormSection";
import { getChairmanSession } from "@/lib/auth/chairman-session";
import { redirect } from "next/navigation";

export default async function InsSectionPage() {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Section schedule view — your college; filter by program only."
      />
      <INSFormSection
        chairmanCollegeId={session.collegeId}
        chairmanProgramId={session.programId}
        chairmanProgramCode={session.programCode}
        chairmanProgramName={session.programName}
      />
    </div>
  );
}
