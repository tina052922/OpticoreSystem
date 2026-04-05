import { NextResponse } from "next/server";
import {
  listInboxMessages,
  listMailTab,
  listSentTab,
  type PortalId,
} from "@/lib/inbox-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listWorkflowInboxForPortal } from "@/lib/server/workflow-inbox";
import type { InboxMessage } from "@/lib/inbox-store";

const PORTALS: PortalId[] = ["chairman", "college", "cas", "gec", "doi"];

function mergeByDate(a: InboxMessage[], b: InboxMessage[]): InboxMessage[] {
  const seen = new Set<string>();
  const out: InboxMessage[] = [];
  for (const m of [...a, ...b]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  out.sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
  return out;
}

/** GET ?portal=chairman|college|cas|gec|doi — Mail + Sent lists for that portal. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const portal = searchParams.get("portal") as PortalId | null;

  if (!portal) {
    return NextResponse.json({ messages: listInboxMessages() });
  }

  if (!PORTALS.includes(portal)) {
    return NextResponse.json({ error: "Invalid portal" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  let mail = listMailTab(portal);
  let sent = listSentTab(portal);

  if (supabase && user?.id) {
    try {
      const db = await listWorkflowInboxForPortal(supabase, portal);
      mail = mergeByDate(db.mail, mail);
      sent = mergeByDate(db.sent, sent);
    } catch {
      // Table may not exist before migration — fall back to in-memory only
    }
  }

  return NextResponse.json({
    portal,
    mail,
    sent,
  });
}
