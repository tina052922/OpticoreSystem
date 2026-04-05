"use client";

import { InboxWorkspace } from "@/components/inbox/InboxWorkspace";

export default function ChairmanInboxPage() {
  return <InboxWorkspace portal="chairman" title="Inbox" enableChairmanForward />;
}
