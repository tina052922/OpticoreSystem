import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormRoom } from "@/components/ins/INSFormRoom";
import { getChairmanSession } from "@/lib/auth/chairman-session";
import { redirect } from "next/navigation";

export default async function InsRoomPage() {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Room schedule view — your college; filter by program only."
      />
      <INSFormRoom
        chairmanCollegeId={session.collegeId}
        chairmanProgramId={session.programId}
        chairmanProgramCode={session.programCode}
        chairmanProgramName={session.programName}
      />
    </div>
  );
}
