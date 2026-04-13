import type { SupabaseClient } from "@supabase/supabase-js";
import type { InboxMessage, PortalId } from "@/lib/inbox-store";

export type WorkflowInboxDbRow = {
  id: string;
  senderId: string | null;
  collegeId: string;
  fromLabel: string;
  toLabel: string;
  subject: string;
  body: string;
  workflowStage: string | null;
  mailFor: string[];
  sentFor: string[];
  status: string;
  createdAt: string;
  payload?: unknown | null;
};

export function workflowRowToMessage(row: WorkflowInboxDbRow): InboxMessage {
  return {
    id: row.id,
    from: row.fromLabel,
    to: row.toLabel,
    subject: row.subject,
    body: row.body,
    status: row.status === "Read" ? "Read" : "Unread",
    createdAt: row.createdAt,
    workflowStage: row.workflowStage ?? undefined,
    mailFor: row.mailFor as PortalId[],
    sentFor: row.sentFor as PortalId[],
    payload: row.payload ?? undefined,
  };
}

export async function insertWorkflowInboxMessage(
  supabase: SupabaseClient,
  args: {
    senderId: string;
    collegeId: string;
    fromLabel: string;
    toLabel: string;
    subject: string;
    body: string;
    workflowStage?: string;
    mailFor: PortalId[];
    sentFor: PortalId[];
    /** Structured INS + Evaluator bundle for College Admin / Central Hub. */
    payload?: unknown;
  },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("WorkflowInboxMessage").insert({
    senderId: args.senderId,
    collegeId: args.collegeId,
    fromLabel: args.fromLabel,
    toLabel: args.toLabel,
    subject: args.subject,
    body: args.body,
    workflowStage: args.workflowStage ?? null,
    mailFor: args.mailFor,
    sentFor: args.sentFor,
    status: "Unread",
    payload: args.payload ?? null,
  });
  return { error: error?.message ?? null };
}

export async function listWorkflowInboxForPortal(
  supabase: SupabaseClient,
  portal: PortalId,
): Promise<{ mail: InboxMessage[]; sent: InboxMessage[] }> {
  const { data, error } = await supabase
    .from("WorkflowInboxMessage")
    .select("*")
    .order("createdAt", { ascending: false });

  if (error || !data) {
    return { mail: [], sent: [] };
  }

  const rows = data as WorkflowInboxDbRow[];
  const mail = rows.filter((r) => Array.isArray(r.mailFor) && r.mailFor.includes(portal)).map(workflowRowToMessage);
  const sent = rows.filter((r) => Array.isArray(r.sentFor) && r.sentFor.includes(portal)).map(workflowRowToMessage);
  return { mail, sent };
}
