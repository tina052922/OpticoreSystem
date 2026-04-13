import { ChairmanInboxClient } from "@/app/chairman/inbox/ChairmanInboxClient";
import { getChairmanSession } from "@/lib/auth/chairman-session";
import { redirect } from "next/navigation";

export default async function ChairmanInboxPage() {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  return (
    <ChairmanInboxClient
      chairmanCollegeId={session.collegeId}
      chairmanProgramId={session.programId}
      chairmanProgramCode={session.programCode}
    />
  );
}
