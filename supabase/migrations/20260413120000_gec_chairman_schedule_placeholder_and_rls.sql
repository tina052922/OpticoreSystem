-- GEC Chairman: read schedules campus-wide; update only GEC/GEE vacant rows when College Admin approved gec_vacant_slots.
-- Placeholder instructor marks "vacant GEC slot" rows (must match NEXT_PUBLIC_GEC_VACANT_INSTRUCTOR_ID in web).

insert into public."User" (id, "employeeId", email, name, role, "collegeId")
values (
  'a0000000-0000-4000-8000-000000000099',
  'GEC-VACANT-TBD',
  'gec.vacant.placeholder@opticore.local',
  'GEC Vacant Slot (TBD)',
  'instructor',
  'col-tech-eng'
)
on conflict (id) do update set
  "employeeId" = excluded."employeeId",
  email = excluded.email,
  name = excluded.name,
  role = excluded.role,
  "collegeId" = excluded."collegeId";

create or replace function public.gec_has_active_vacant_slot_grant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."AccessRequest" ar
    where ar."requesterId" = auth.uid()::text
      and ar.status = 'approved'
      and ar."expiresAt" is not null
      and ar."expiresAt" > now()
      and 'gec_vacant_slots' = any(ar.scopes)
  );
$$;

grant execute on function public.gec_has_active_vacant_slot_grant() to authenticated;

create or replace function public.is_gec_curriculum_subject_id(p_subject_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."Subject" su
    where su.id = p_subject_id
      and (
        upper(trim(su.code)) like 'GEC-%'
        or upper(trim(su.code)) like 'GEE-%'
      )
  );
$$;

grant execute on function public.is_gec_curriculum_subject_id(text) to authenticated;

drop policy if exists scheduleentry_select_gec_chairman on public."ScheduleEntry";
create policy scheduleentry_select_gec_chairman on public."ScheduleEntry"
for select
to authenticated
using (public.current_user_role() = 'gec_chairman');

drop policy if exists scheduleentry_update_gec_chairman_vacant on public."ScheduleEntry";
create policy scheduleentry_update_gec_chairman_vacant on public."ScheduleEntry"
for update
to authenticated
using (
  public.current_user_role() = 'gec_chairman'
  and public.gec_has_active_vacant_slot_grant()
  and "ScheduleEntry"."lockedByDoiAt" is null
  and public.is_gec_curriculum_subject_id("ScheduleEntry"."subjectId")
  and "ScheduleEntry"."instructorId" = 'a0000000-0000-4000-8000-000000000099'::text
)
with check (
  public.current_user_role() = 'gec_chairman'
  and public.gec_has_active_vacant_slot_grant()
  and "ScheduleEntry"."lockedByDoiAt" is null
  and public.is_gec_curriculum_subject_id("ScheduleEntry"."subjectId")
);
