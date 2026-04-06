-- GEC Chairman scope: not tied to a single college in the org chart; routing for approvals uses COTE (CTE).
-- CAS Admin coordinates GEC policy; College Admin (COTE) approves vacant-slot access requests in OptiCore.
-- Also allow instructors to submit schedule-change requests into the chairman workflow inbox.

create or replace function public.gec_routing_college_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'col-tech-eng'::text;
$$;

grant execute on function public.gec_routing_college_id() to authenticated;

-- AccessRequest: GEC may insert with routing college when User.collegeId is null
drop policy if exists access_request_insert on public."AccessRequest";
create policy access_request_insert on public."AccessRequest"
for insert
to authenticated
with check (
  "requesterId" = auth.uid()::text
  and (
    (
      public.current_user_role() = 'cas_admin'
      and "collegeId" = public.current_user_college_id()
    )
    or (
      public.current_user_role() = 'gec_chairman'
      and "collegeId" = coalesce(
        nullif(trim(coalesce(public.current_user_college_id(), '')), ''),
        public.gec_routing_college_id()
      )
    )
  )
);

-- WorkflowInboxMessage: GEC visibility + instructor submit
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
    and "collegeId" = coalesce(
      nullif(trim(coalesce(public.current_user_college_id(), '')), ''),
      public.gec_routing_college_id()
    )
    and ('gec' = any("mailFor") or 'gec' = any("sentFor"))
  )
  or (
    public.current_user_role() = 'doi_admin'
    and ('doi' = any("mailFor") or 'doi' = any("sentFor"))
  )
  or (
    public.current_user_role() = 'instructor'
    and "senderId" = auth.uid()::text
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
      and "collegeId" = coalesce(
        nullif(trim(coalesce(public.current_user_college_id(), '')), ''),
        public.gec_routing_college_id()
      )
    )
    or (
      public.current_user_role() = 'instructor'
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
    and "collegeId" = coalesce(
      nullif(trim(coalesce(public.current_user_college_id(), '')), ''),
      public.gec_routing_college_id()
    )
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
    and "collegeId" = coalesce(
      nullif(trim(coalesce(public.current_user_college_id(), '')), ''),
      public.gec_routing_college_id()
    )
    and 'gec' = any("mailFor")
  )
  or (
    public.current_user_role() = 'doi_admin'
    and 'doi' = any("mailFor")
  )
);
