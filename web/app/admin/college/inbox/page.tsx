"use client";

import { InboxWorkspace } from "@/components/inbox/InboxWorkspace";

export default function CollegeInboxPage() {
  return (
    <InboxWorkspace
      portal="college"
      title="Inbox"
      subtitle="Mail: drafts from Chairman. Sent: items forwarded to CAS Admin."
      enableCollegeForwardToCas
    />
  );
}
