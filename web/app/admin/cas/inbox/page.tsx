"use client";

import { InboxWorkspace } from "@/components/inbox/InboxWorkspace";

export default function CasInboxPage() {
  return (
    <InboxWorkspace
      portal="cas"
      title="Inbox"
      subtitle="Mail: from College and returned GEC portions. Sent: to GEC Chairmen and DOI."
    />
  );
}
