-- Infinite recursion: SELECT ScheduleEntry evaluated scheduleentry_select_student, which queried
-- StudentProfile under RLS; studentprofile_select_instructor_roster then queried ScheduleEntry again.
--
-- Fix (1): Student schedule policy applies only to student role (same visibility, no instructor subquery).
-- Fix (2): Instructor roster visibility uses SECURITY DEFINER so inner ScheduleEntry reads bypass RLS.

drop policy if exists scheduleentry_select_student on public."ScheduleEntry";
create policy scheduleentry_select_student on public."ScheduleEntry"
for select
to authenticated
using (
  public.current_user_role() = 'student'
  and exists (
    select 1
    from public."StudentProfile" sp
    where sp."userId" = auth.uid()::text
      and sp."sectionId" = "ScheduleEntry"."sectionId"
  )
);

create or replace function public.instructor_can_select_roster_student_profile(p_section_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select u.role = 'instructor'
      from public."User" u
      where u.id = auth.uid()::text
    ),
    false
  )
  and (
    exists (
      select 1
      from public."ScheduleEntry" se
      where se."instructorId" = auth.uid()::text
        and se."sectionId" = p_section_id
    )
    or exists (
      select 1
      from public."FacultyProfile" fp
      where fp."userId" = auth.uid()::text
        and fp."advisorySectionId" is not null
        and fp."advisorySectionId" = p_section_id
    )
  );
$$;

comment on function public.instructor_can_select_roster_student_profile(text) is
  'SECURITY DEFINER: true if the signed-in instructor teaches or advises p_section_id. Used by StudentProfile RLS to avoid ScheduleEntry↔StudentProfile policy recursion.';

revoke all on function public.instructor_can_select_roster_student_profile(text) from public;
grant execute on function public.instructor_can_select_roster_student_profile(text) to authenticated;

drop policy if exists studentprofile_select_instructor_roster on public."StudentProfile";
create policy studentprofile_select_instructor_roster on public."StudentProfile"
for select
to authenticated
using (
  public.current_user_role() = 'instructor'
  and public.instructor_can_select_roster_student_profile("StudentProfile"."sectionId")
);
