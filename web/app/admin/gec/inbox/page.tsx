"use client";

import { InboxWorkspace } from "@/components/inbox/InboxWorkspace";

export default function GecInboxPage() {
  return (
    <InboxWorkspace
      portal="gec"
      title="Inbox"
      subtitle="Workflow inbox for GEC evaluation and access requests."
    />
  );
}
