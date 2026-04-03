"use client";

import { InboxWorkspace } from "@/components/inbox/InboxWorkspace";

export default function DoiInboxPage() {
  return (
    <InboxWorkspace
      portal="doi"
      title="Inbox"
      subtitle="Mail: validated drafts from CAS for final approval. Policy justification threads appear separately in Policy reviews."
    />
  );
}
