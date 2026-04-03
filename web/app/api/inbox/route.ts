import { NextResponse } from "next/server";
import { listInboxMessages, listMailTab, listSentTab, type PortalId } from "@/lib/inbox-store";

const PORTALS: PortalId[] = ["chairman", "college", "cas", "gec", "doi"];

/** GET ?portal=chairman|college|cas|gec|doi — Mail + Sent lists for that portal. Omit portal for legacy full list. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const portal = searchParams.get("portal") as PortalId | null;

  if (!portal) {
    return NextResponse.json({ messages: listInboxMessages() });
  }

  if (!PORTALS.includes(portal)) {
    return NextResponse.json({ error: "Invalid portal" }, { status: 400 });
  }

  return NextResponse.json({
    portal,
    mail: listMailTab(portal),
    sent: listSentTab(portal),
  });
}
