-- Instructors may read all schedule rows for the active term where the section belongs to their home college.
-- Enables INS Form (Faculty / Section / Room) browse + search parity with college staff; updates remain blocked
-- by existing INSERT/UPDATE policies. Rows where the instructor teaches outside their college are still visible
-- via scheduleentry_select_instructor (instructorId = auth.uid()).

drop policy if exists scheduleentry_select_instructor_college_schedule on public."ScheduleEntry";
create policy scheduleentry_select_instructor_college_schedule on public."ScheduleEntry"
for select
to authenticated
using (
  public.current_user_role() = 'instructor'
  and nullif(trim(coalesce(public.current_user_college_id(), '')), '') is not null
  and exists (
    select 1
    from public."Section" s
    join public."Program" p on p.id = s."programId"
    where s.id = "ScheduleEntry"."sectionId"
      and p."collegeId" = public.current_user_college_id()
  )
);
