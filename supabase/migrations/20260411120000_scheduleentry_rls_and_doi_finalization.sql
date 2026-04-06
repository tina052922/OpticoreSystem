-- College Admin could not SELECT ScheduleEntry (only chairman had ALL; instructors own rows).
-- This caused "Schedule entry missing" in schedule-change APIs and empty subject/section in the UI.
-- DOI Admin needs campus-wide read + ability to mark schedules final.

drop policy if exists scheduleentry_select_college_admin on public."ScheduleEntry";
create policy scheduleentry_select_college_admin on public."ScheduleEntry"
for select
to authenticated
using (
  public.is_college_admin()
  and exists (
    select 1
    from public."Section" s
    join public."Program" p on p.id = s."programId"
    where s.id = "ScheduleEntry"."sectionId"
      and p."collegeId" = public.current_user_college_id()
  )
);

drop policy if exists scheduleentry_select_doi_admin on public."ScheduleEntry";
create policy scheduleentry_select_doi_admin on public."ScheduleEntry"
for select
to authenticated
using (public.is_doi_admin());

drop policy if exists scheduleentry_update_doi_final on public."ScheduleEntry";
create policy scheduleentry_update_doi_final on public."ScheduleEntry"
for update
to authenticated
using (public.is_doi_admin())
with check (public.is_doi_admin());

-- Campus-wide DOI decision per term (VPAA signature + approve/reject).
create table if not exists public."DoiScheduleFinalization" (
  id text primary key default gen_random_uuid()::text,
  "academicPeriodId" text not null references public."AcademicPeriod"(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  "signedByName" text,
  "signedAt" timestamptz,
  "signedAcknowledged" boolean not null default false,
  "decidedById" text references public."User"(id) on delete set null,
  "decidedAt" timestamptz,
  notes text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("academicPeriodId")
);

drop trigger if exists trg_doischedulefinalization_updated_at on public."DoiScheduleFinalization";
create trigger trg_doischedulefinalization_updated_at
before update on public."DoiScheduleFinalization"
for each row execute function public.set_updated_at();

alter table public."DoiScheduleFinalization" enable row level security;

drop policy if exists doischedulefinalization_select on public."DoiScheduleFinalization";
create policy doischedulefinalization_select on public."DoiScheduleFinalization"
for select
to authenticated
using (public.is_doi_admin());

drop policy if exists doischedulefinalization_all on public."DoiScheduleFinalization";
create policy doischedulefinalization_all on public."DoiScheduleFinalization"
for all
to authenticated
using (public.is_doi_admin())
with check (public.is_doi_admin());
