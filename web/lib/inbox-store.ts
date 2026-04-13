/**
 * In-memory inbox for workflow simulation (Chairman → College → CAS → GEC → CAS → DOI).
 * Replace with Supabase tables when ready.
 */

export type PortalId = "chairman" | "college" | "cas" | "gec" | "doi";

export type InboxMessage = {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  status: "Unread" | "Read";
  createdAt: string;
  /** Workflow stage label (for detail pane). */
  workflowStage?: string;
  /** Portals that see this message under the Mail (incoming) tab. */
  mailFor: PortalId[];
  /** Portals that see this message under the Sent tab. */
  sentFor: PortalId[];
  /** INS + Evaluator schedule bundle when persisted (mirrors WorkflowInboxMessage.payload). */
  payload?: unknown;
};

type GlobalStore = {
  __opticore_inbox?: InboxMessage[];
};

function seed(): InboxMessage[] {
  const now = Date.now();
  return [
    {
      id: "m-reg",
      from: "Registrar Office",
      to: "Chairman Admin (CTE)",
      subject: "INS Form submission deadline",
      body: "Reminder: All INS Forms must be submitted by the published college deadline. This is a system notification.",
      status: "Unread",
      createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      workflowStage: "Notice",
      mailFor: ["chairman"],
      sentFor: [],
    },
    {
      id: "m-draft-college",
      from: "Chairman Admin (CTE)",
      to: "College Admin (CTE)",
      subject: "Draft schedule — 2nd Semester AY 2025-2026 (non-conflict)",
      body:
        "The Evaluator draft for CTE has been finalized for conflict review at the chairman level. " +
        "Please open Schedule review, run conflict check, and finalize for CAS Admin.\n\n" +
        "Attached context: BSIT / BIT sections, room and faculty assignments as plotted in the Evaluator module.",
      status: "Unread",
      createdAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      workflowStage: "chairman_to_college",
      mailFor: ["college"],
      sentFor: ["chairman"],
    },
    {
      id: "m-college-cas",
      from: "College Admin (CTE)",
      to: "CAS Admin",
      subject: "Forwarded: College-validated draft schedule",
      body:
        "College-level review is complete. The draft is forwarded for GEC distribution and CAS validation per OptiCore workflow.",
      status: "Unread",
      createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
      workflowStage: "college_to_cas",
      mailFor: ["cas"],
      sentFor: ["college"],
    },
    {
      id: "m-cas-gec",
      from: "CAS Admin",
      to: "GEC Chairman (assigned)",
      subject: "GEC portion — vacant slots for insertion",
      body:
        "Please fill only vacant GEC time slots; do not alter non-GEC plotted courses. Return the GEC portion when complete.",
      status: "Unread",
      createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
      workflowStage: "cas_to_gec",
      mailFor: ["gec"],
      sentFor: ["cas"],
    },
    {
      id: "m-gec-cas",
      from: "GEC Chairman",
      to: "CAS Admin",
      subject: "Returned: GEC portion with vacant slots filled",
      body: "GEC vacant slots have been filled. Please validate and forward to DOI for final approval.",
      status: "Read",
      createdAt: new Date(now - 1000 * 60 * 10).toISOString(),
      workflowStage: "gec_to_cas",
      mailFor: ["cas"],
      sentFor: ["gec"],
    },
    {
      id: "m-cas-doi",
      from: "CAS Admin",
      to: "DOI / VPAA",
      subject: "Validated schedule — pending final publication",
      body: "Campus-wide draft is ready for DOI final review, policy check, and publication.",
      status: "Unread",
      createdAt: new Date(now - 1000 * 60 * 5).toISOString(),
      workflowStage: "cas_to_doi",
      mailFor: ["doi"],
      sentFor: ["cas"],
    },
  ];
}

function getStore(): InboxMessage[] {
  const g = globalThis as unknown as GlobalStore;
  if (!g.__opticore_inbox) {
    g.__opticore_inbox = seed();
  }
  return g.__opticore_inbox;
}

export function listMailTab(portal: PortalId): InboxMessage[] {
  return [...getStore()]
    .filter((m) => m.mailFor.includes(portal))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function listSentTab(portal: PortalId): InboxMessage[] {
  return [...getStore()]
    .filter((m) => m.sentFor.includes(portal))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** @deprecated use listMailTab / listSentTab */
export function listInboxMessages(): InboxMessage[] {
  return [...getStore()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function appendWorkflowMessage(input: {
  from: string;
  to: string;
  subject: string;
  body: string;
  mailFor: PortalId[];
  sentFor: PortalId[];
  workflowStage?: string;
  status?: "Unread" | "Read";
  payload?: unknown;
}) {
  const msg: InboxMessage = {
    id: `m_${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    status: input.status ?? "Unread",
    workflowStage: input.workflowStage,
    from: input.from,
    to: input.to,
    subject: input.subject,
    body: input.body,
    mailFor: input.mailFor,
    sentFor: input.sentFor,
    payload: input.payload,
  };
  getStore().unshift(msg);
  return msg;
}
