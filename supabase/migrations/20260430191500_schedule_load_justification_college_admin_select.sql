-- Allow College Admins to view load-policy justifications within their own college.
-- This is a read-only visibility update; DOI/VPAA review columns are still restricted to DOI.

drop policy if exists schedule_load_justif_select on public."ScheduleLoadJustification";

create policy schedule_load_justif_select on public."ScheduleLoadJustification"
for select
to authenticated
using (
  public.is_doi_admin()
  or (
    (public.is_chairman_admin() or public.is_college_admin())
    and "collegeId" = public.current_user_college_id()
  )
);

