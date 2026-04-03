-- Fix PostgREST 500 on User / ScheduleEntry / etc.: RLS helper functions must not
-- recurse through "User" policies. Run this on existing databases (schema.sql includes the same).

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
