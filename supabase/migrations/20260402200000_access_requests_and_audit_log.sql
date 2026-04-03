-- Access requests (GEC/CAS → College Admin approval) + campus audit log

create table if not exists public."AccessRequest" (
  id text primary key default gen_random_uuid()::text,
  "requesterId" text not null references public."User"(id) on delete cascade,
  "collegeId" text not null references public."College"(id) on delete restrict,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  scopes text[] not null check (
    cardinality(scopes) > 0
    and scopes <@ array['evaluator', 'ins_forms', 'gec_vacant_slots']::text[]
  ),
  note text,
  "reviewedById" text references public."User"(id) on delete set null,
  "reviewedAt" timestamptz,
  "expiresAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create unique index if not exists access_request_one_pending_per_user_college
  on public."AccessRequest" ("requesterId", "collegeId")
  where status = 'pending';

create index if not exists access_request_college_status_idx
  on public."AccessRequest" ("collegeId", status);

drop trigger if exists trg_accessrequest_updated_at on public."AccessRequest";
create trigger trg_accessrequest_updated_at
before update on public."AccessRequest"
for each row execute function public.set_updated_at();

create table if not exists public."AuditLog" (
  id text primary key default gen_random_uuid()::text,
  "actorId" text not null references public."User"(id) on delete cascade,
  "collegeId" text references public."College"(id) on delete set null,
  action text not null,
  "entityType" text not null,
  "entityId" text,
  details jsonb,
  "createdAt" timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx on public."AuditLog" ("createdAt" desc);
create index if not exists audit_log_college_created_idx on public."AuditLog" ("collegeId", "createdAt" desc);

-- RLS helpers
create or replace function public.is_college_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role = 'college_admin' from public."User" u where u.id = auth.uid()::text),
    false
  )
$$;

grant execute on function public.is_college_admin() to authenticated;

-- College / CAS admins need to read peer User rows for access-request review and audit name resolution.
drop policy if exists user_select_college_peers on public."User";
create policy user_select_college_peers on public."User"
for select
to authenticated
using (
  public.is_college_admin()
  and coalesce("collegeId", '') = coalesce(public.current_user_college_id(), '')
);

drop policy if exists user_select_cas_admin on public."User";
create policy user_select_cas_admin on public."User"
for select
to authenticated
using (public.current_user_role() = 'cas_admin');

alter table public."AccessRequest" enable row level security;
alter table public."AuditLog" enable row level security;

drop policy if exists access_request_select on public."AccessRequest";
create policy access_request_select on public."AccessRequest"
for select
to authenticated
using (
  "requesterId" = auth.uid()::text
  or (
    public.is_college_admin()
    and "collegeId" = public.current_user_college_id()
  )
  or public.current_user_role() in ('cas_admin', 'doi_admin')
);

drop policy if exists access_request_insert on public."AccessRequest";
create policy access_request_insert on public."AccessRequest"
for insert
to authenticated
with check (
  "requesterId" = auth.uid()::text
  and public.current_user_role() in ('gec_chairman', 'cas_admin')
  and "collegeId" = public.current_user_college_id()
);

drop policy if exists access_request_update_college on public."AccessRequest";
create policy access_request_update_college on public."AccessRequest"
for update
to authenticated
using (
  public.is_college_admin()
  and "collegeId" = public.current_user_college_id()
)
with check (
  public.is_college_admin()
  and "collegeId" = public.current_user_college_id()
);

drop policy if exists audit_log_insert_own on public."AuditLog";
create policy audit_log_insert_own on public."AuditLog"
for insert
to authenticated
with check ("actorId" = auth.uid()::text);

drop policy if exists audit_log_select on public."AuditLog";
create policy audit_log_select on public."AuditLog"
for select
to authenticated
using (
  (
    public.is_college_admin()
    and coalesce("collegeId", '') = coalesce(public.current_user_college_id(), '')
  )
  or (
    public.is_chairman_admin()
    and coalesce("collegeId", '') = coalesce(public.current_user_college_id(), '')
  )
  or public.current_user_role() in ('cas_admin', 'doi_admin')
);
