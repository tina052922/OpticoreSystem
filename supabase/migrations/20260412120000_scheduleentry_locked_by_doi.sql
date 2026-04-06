-- VPAA publication locks ScheduleEntry rows: chairman/college can no longer mutate plotted slots for that term.
-- DOI keeps scheduleentry_update_doi_final for administrative overrides if ever needed.

alter table public."ScheduleEntry"
  add column if not exists "lockedByDoiAt" timestamptz;

comment on column public."ScheduleEntry"."lockedByDoiAt" is
  'Set when DOI/VPAA publishes the master schedule for this academic period; RLS blocks chairman/college edits.';

-- Replace single FOR ALL policy so SELECT still returns locked rows while mutations are blocked.
drop policy if exists scheduleentry_crud on public."ScheduleEntry";

drop policy if exists scheduleentry_select_chairman on public."ScheduleEntry";
create policy scheduleentry_select_chairman on public."ScheduleEntry"
for select
to authenticated
using (
  public.is_chairman_admin()
  and exists (
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
);

drop policy if exists scheduleentry_insert_chairman on public."ScheduleEntry";
create policy scheduleentry_insert_chairman on public."ScheduleEntry"
for insert
to authenticated
with check (
  public.is_chairman_admin()
  and exists (
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
);

drop policy if exists scheduleentry_update_chairman on public."ScheduleEntry";
create policy scheduleentry_update_chairman on public."ScheduleEntry"
for update
to authenticated
using (
  public.is_chairman_admin()
  and "lockedByDoiAt" is null
  and exists (
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
)
with check (
  public.is_chairman_admin()
  and "lockedByDoiAt" is null
  and exists (
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
);

drop policy if exists scheduleentry_delete_chairman on public."ScheduleEntry";
create policy scheduleentry_delete_chairman on public."ScheduleEntry"
for delete
to authenticated
using (
  public.is_chairman_admin()
  and "lockedByDoiAt" is null
  and exists (
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
);

drop policy if exists scheduleentry_update_college_admin on public."ScheduleEntry";
create policy scheduleentry_update_college_admin on public."ScheduleEntry"
for update
to authenticated
using (
  public.is_college_admin()
  and "lockedByDoiAt" is null
  and exists (
    select 1
    from public."Section" s
    join public."Program" p on p.id = s."programId"
    where s.id = "ScheduleEntry"."sectionId"
      and p."collegeId" = public.current_user_college_id()
  )
)
with check (
  public.is_college_admin()
  and "lockedByDoiAt" is null
  and exists (
    select 1
    from public."Section" s
    join public."Program" p on p.id = s."programId"
    where s.id = "ScheduleEntry"."sectionId"
      and p."collegeId" = public.current_user_college_id()
  )
);
