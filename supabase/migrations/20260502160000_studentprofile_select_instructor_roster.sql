-- Instructors may read StudentProfile rows for sections they teach (ScheduleEntry) or advise (FacultyProfile.advisorySectionId).
-- Without this, the faculty portal API returns zero students even when sections have enrollments (RLS blocked SELECT).

drop policy if exists studentprofile_select_instructor_roster on public."StudentProfile";
create policy studentprofile_select_instructor_roster on public."StudentProfile"
for select
to authenticated
using (
  public.current_user_role() = 'instructor'
  and (
    exists (
      select 1
      from public."ScheduleEntry" se
      where se."instructorId" = auth.uid()::text
        and se."sectionId" = "StudentProfile"."sectionId"
    )
    or exists (
      select 1
      from public."FacultyProfile" fp
      where fp."userId" = auth.uid()::text
        and fp."advisorySectionId" is not null
        and fp."advisorySectionId" = "StudentProfile"."sectionId"
    )
  )
);
