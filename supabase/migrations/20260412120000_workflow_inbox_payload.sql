-- Workflow handoff: attach structured INS + Evaluator schedule bundle to inbox rows

alter table public."WorkflowInboxMessage"
  add column if not exists payload jsonb;

comment on column public."WorkflowInboxMessage".payload is
  'Structured workflow bundle (INS + Evaluator drafts) for College Admin download and Central Hub import.';
