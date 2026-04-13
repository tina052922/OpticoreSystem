"use client";

import { InboxWorkspace } from "@/components/inbox/InboxWorkspace";

export type ChairmanInboxClientProps = {
  chairmanCollegeId: string | null;
  chairmanProgramId: string | null;
  chairmanProgramCode?: string | null;
};

export function ChairmanInboxClient({
  chairmanCollegeId,
  chairmanProgramId,
  chairmanProgramCode = null,
}: ChairmanInboxClientProps) {
  return (
    <InboxWorkspace
      portal="chairman"
      title="Inbox"
      enableChairmanForward
      chairmanScope={{ collegeId: chairmanCollegeId, programId: chairmanProgramId, programCode: chairmanProgramCode }}
    />
  );
}
