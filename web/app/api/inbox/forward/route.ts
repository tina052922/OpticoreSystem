import { NextResponse } from "next/server";
import { appendWorkflowMessage, type PortalId } from "@/lib/inbox-store";
import { insertAuditLog } from "@/lib/server/audit-log";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PORTALS: PortalId[] = ["chairman", "college", "cas", "gec", "doi"];

type Body = {
  fromLabel?: string;
  toLabel?: string;
  subject?: string;
  body?: string;
  /** Portal that will see this in Mail tab */
  mailFor?: PortalId;
  /** Portal that will see this in Sent tab */
  sentFor?: PortalId;
  workflowStage?: string;
};

/**
 * Simulate forwarding a schedule message (e.g. Chairman → College).
 * Production: persist + notify recipients.
 */
export async function POST(req: Request) {
  const json = (await req.json().catch(() => null)) as Body | null;
  if (!json?.mailFor || !json?.sentFor) {
    return NextResponse.json({ error: "mailFor and sentFor portals are required" }, { status: 400 });
  }
  if (!PORTALS.includes(json.mailFor) || !PORTALS.includes(json.sentFor)) {
    return NextResponse.json({ error: "Invalid portal id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      const row = await fetchMyUserRowForAuth(supabase, user.id);
      await insertAuditLog(supabase, {
        actorId: user.id,
        collegeId: row?.collegeId ?? null,
        action: "inbox.forward_workflow",
        entityType: "InboxWorkflow",
        details: {
          mailFor: json.mailFor,
          sentFor: json.sentFor,
          workflowStage: json.workflowStage ?? null,
          subject: json.subject?.trim() ?? null,
        },
      });
    }
  }

  const msg = appendWorkflowMessage({
    from: json.fromLabel?.trim() || "OptiCore User",
    to: json.toLabel?.trim() || "Recipient",
    subject: json.subject?.trim() || "Schedule workflow message",
    body: json.body?.trim() || "(No body)",
    mailFor: [json.mailFor],
    sentFor: [json.sentFor],
    workflowStage: json.workflowStage,
    status: "Unread",
  });

  return NextResponse.json({ ok: true, message: msg });
}
