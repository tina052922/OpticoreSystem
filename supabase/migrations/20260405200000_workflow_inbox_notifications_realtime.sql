-- Persisted workflow inbox (cross-session); notification read; Supabase Realtime targets

create table if not exists public."WorkflowInboxMessage" (
  id text primary key default gen_random_uuid()::text,
  "senderId" text references public."User"(id) on delete set null,
  "collegeId" text not null references public."College"(id) on delete cascade,
  "fromLabel" text not null,
  "toLabel" text not null,
  subject text not null,
  body text not null,
  "workflowStage" text,
  "mailFor" text[] not null,
  "sentFor" text[] not null,
  status text not null default 'Unread' check (status in ('Unread', 'Read')),
  "createdAt" timestamptz not null default now()
);

create index if not exists workflow_inbox_college_created_idx
  on public."WorkflowInboxMessage" ("collegeId", "createdAt" desc);

alter table public."WorkflowInboxMessage" enable row level security;

drop policy if exists workflow_inbox_select on public."WorkflowInboxMessage";
create policy workflow_inbox_select on public."WorkflowInboxMessage"
for select
to authenticated
using (
  (
    public.is_chairman_admin()
    and "collegeId" = public.current_user_college_id()
    and ('chairman' = any("mailFor") or 'chairman' = any("sentFor"))
  )
  or (
    public.is_college_admin()
    and "collegeId" = public.current_user_college_id()
    and ('college' = any("mailFor") or 'college' = any("sentFor"))
  )
  or (
    public.current_user_role() = 'cas_admin'
    and coalesce("collegeId", '') = coalesce(public.current_user_college_id(), '')
    and ('cas' = any("mailFor") or 'cas' = any("sentFor"))
  )
  or (
    public.current_user_role() = 'gec_chairman'
    and "collegeId" = public.current_user_college_id()
    and ('gec' = any("mailFor") or 'gec' = any("sentFor"))
  )
  or (
    public.current_user_role() = 'doi_admin'
    and ('doi' = any("mailFor") or 'doi' = any("sentFor"))
  )
);

drop policy if exists workflow_inbox_insert on public."WorkflowInboxMessage";
create policy workflow_inbox_insert on public."WorkflowInboxMessage"
for insert
to authenticated
with check (
  "senderId" = auth.uid()::text
  and (
    (
      public.is_chairman_admin()
      and "collegeId" = public.current_user_college_id()
    )
    or (
      public.is_college_admin()
      and "collegeId" = public.current_user_college_id()
    )
    or (
      public.current_user_role() = 'cas_admin'
      and coalesce("collegeId", '') = coalesce(public.current_user_college_id(), '')
    )
    or (
      public.current_user_role() = 'gec_chairman'
      and "collegeId" = public.current_user_college_id()
    )
  )
);

drop policy if exists workflow_inbox_update_status on public."WorkflowInboxMessage";
create policy workflow_inbox_update_status on public."WorkflowInboxMessage"
for update
to authenticated
using (
  (
    public.is_chairman_admin()
    and "collegeId" = public.current_user_college_id()
    and 'chairman' = any("mailFor")
  )
  or (
    public.is_college_admin()
    and "collegeId" = public.current_user_college_id()
    and 'college' = any("mailFor")
  )
  or (
    public.current_user_role() = 'cas_admin'
    and coalesce("collegeId", '') = coalesce(public.current_user_college_id(), '')
    and 'cas' = any("mailFor")
  )
  or (
    public.current_user_role() = 'gec_chairman'
    and "collegeId" = public.current_user_college_id()
    and 'gec' = any("mailFor")
  )
  or (
    public.current_user_role() = 'doi_admin'
    and 'doi' = any("mailFor")
  )
)
with check (
  (
    public.is_chairman_admin()
    and "collegeId" = public.current_user_college_id()
    and 'chairman' = any("mailFor")
  )
  or (
    public.is_college_admin()
    and "collegeId" = public.current_user_college_id()
    and 'college' = any("mailFor")
  )
  or (
    public.current_user_role() = 'cas_admin'
    and coalesce("collegeId", '') = coalesce(public.current_user_college_id(), '')
    and 'cas' = any("mailFor")
  )
  or (
    public.current_user_role() = 'gec_chairman'
    and "collegeId" = public.current_user_college_id()
    and 'gec' = any("mailFor")
  )
  or (
    public.current_user_role() = 'doi_admin'
    and 'doi' = any("mailFor")
  )
);

-- Mark own notifications read
drop policy if exists notif_update_own on public."Notification";
create policy notif_update_own on public."Notification"
for update
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

-- Enable Realtime in Supabase Dashboard → Database → Replication for:
--   public."Notification", public."ScheduleEntry", public."WorkflowInboxMessage"
-- (CLI: alter publication supabase_realtime add table ... per Supabase docs.)
