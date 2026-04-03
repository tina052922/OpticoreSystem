-- =============================================================================
-- RUN THIS IN SUPABASE → SQL EDITOR (fixes REST 500 on User, ScheduleEntry, etc.)
-- Without SECURITY DEFINER helpers, RLS on "User" recurses → PostgREST 500.
-- Safe to run multiple times (idempotent).
-- =============================================================================

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.role from public."User" u where u.id = auth.uid()::text
$$;

create or replace function public.current_user_college_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u."collegeId" from public."User" u where u.id = auth.uid()::text
$$;

create or replace function public.is_chairman_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role = 'chairman_admin' from public."User" u where u.id = auth.uid()::text),
    false
  )
$$;

create or replace function public.is_doi_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role = 'doi_admin' from public."User" u where u.id = auth.uid()::text),
    false
  )
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_college_id() to authenticated;
grant execute on function public.is_chairman_admin() to authenticated;
grant execute on function public.is_doi_admin() to authenticated;

-- Chairman program scope (optional; full policies + column: run migrations/20260403100000_chairman_program_scope.sql)
create or replace function public.current_user_chairman_program_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u."chairmanProgramId" from public."User" u where u.id = auth.uid()::text
$$;

grant execute on function public.current_user_chairman_program_id() to authenticated;

-- Avoid invoker subqueries on "User" inside the User SELECT policy (same helper as above).
drop policy if exists user_select_self_or_college on public."User";
create policy user_select_self_or_college on public."User"
for select
to authenticated
using (
  id = auth.uid()::text
  or (
    public.is_chairman_admin()
    and "collegeId" is not null
    and "collegeId" = public.current_user_college_id()
  )
  or (public.current_user_role() = 'doi_admin')
  or (
    public.current_user_role() = 'student'
    and role in ('instructor', 'chairman_admin')
    and coalesce("collegeId", '') = coalesce(public.current_user_college_id(), '')
  )
  or (
    public.current_user_role() = 'instructor'
    and role = 'student'
    and coalesce("collegeId", '') = coalesce(public.current_user_college_id(), '')
  )
);
