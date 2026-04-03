"use client";

import { InboxWorkspace } from "@/components/inbox/InboxWorkspace";

export default function GecInboxPage() {
  return (
    <InboxWorkspace
      portal="gec"
      title="Inbox"
      subtitle="Mail: GEC distribution from CAS. Sent: returned GEC portion and access requests."
    />
  );
}
