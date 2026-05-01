-- Program chairs and college admins must see every ScheduleEntry row for instructors employed in their
-- college, not only rows whose section belongs to a program in scope. Otherwise INS Form 5A (and print)
-- under-count hours vs the instructor portal, which selects all rows where instructorId = self.

drop policy if exists scheduleentry_select_chairman on public."ScheduleEntry";
create policy scheduleentry_select_chairman on public."ScheduleEntry"
for select
to authenticated
using (
  public.is_chairman_admin()
  and (
    exists (
      select 1
      from public."Section" s
      join public."Program" p on p.id = s."programId"
      where s.id = "ScheduleEntry"."sectionId"
        and p."collegeId" = public.current_user_college_id()
        and (
          public.current_user_chairman_program_id() is null
          or p.id = public.current_user_chairman_program_id()
        )
    )
    or exists (
      select 1
      from public."User" u
      where u.id = "ScheduleEntry"."instructorId"
        and u."collegeId" = public.current_user_college_id()
    )
  )
);

drop policy if exists scheduleentry_select_college_admin on public."ScheduleEntry";
create policy scheduleentry_select_college_admin on public."ScheduleEntry"
for select
to authenticated
using (
  public.is_college_admin()
  and (
    exists (
      select 1
      from public."Section" s
      join public."Program" p on p.id = s."programId"
      where s.id = "ScheduleEntry"."sectionId"
        and p."collegeId" = public.current_user_college_id()
    )
    or exists (
      select 1
      from public."User" u
      where u.id = "ScheduleEntry"."instructorId"
        and u."collegeId" = public.current_user_college_id()
    )
  )
);
