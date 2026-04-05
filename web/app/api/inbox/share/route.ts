import { NextResponse } from "next/server";
import { appendWorkflowMessage } from "@/lib/inbox-store";
import { insertAuditLog } from "@/lib/server/audit-log";
import { insertWorkflowInboxMessage } from "@/lib/server/workflow-inbox";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { subject?: string; body?: string; view?: string }
    | null;

  const subject = body?.subject?.trim() || "INS Form shared";
  const text =
    body?.body?.trim() ||
    `Shared INS schedule view: ${body?.view || "unknown"}. Please review in College Admin Inbox.`;

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
        action: "inbox.share_ins",
        entityType: "InboxWorkflow",
        details: { subject, view: body?.view ?? null },
      });
      if (row?.collegeId) {
        await insertWorkflowInboxMessage(supabase, {
          senderId: user.id,
          collegeId: row.collegeId,
          fromLabel: row.name ?? "Chairman",
          toLabel: "College Admin",
          subject,
          body: text,
          workflowStage: "ins_share",
          mailFor: ["college"],
          sentFor: ["chairman"],
        });
      }
    }
  }

  const msg = appendWorkflowMessage({
    from: "Chairman Admin (CTE)",
    to: "College Admin (CTE)",
    subject,
    body: text,
    mailFor: ["college"],
    sentFor: ["chairman"],
    workflowStage: "ins_share",
    status: "Read",
  });

  return NextResponse.json({ ok: true, message: msg });
}
