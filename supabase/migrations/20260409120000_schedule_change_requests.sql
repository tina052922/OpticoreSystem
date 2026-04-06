-- Instructor schedule change requests → College Admin review; notifications on decision.
-- ScheduleEntry may be updated by College Admin when approving (same college as section’s program).

create table if not exists public."ScheduleChangeRequest" (
  id text primary key default gen_random_uuid()::text,
  "academicPeriodId" text not null references public."AcademicPeriod"(id) on delete restrict,
  "scheduleEntryId" text not null references public."ScheduleEntry"(id) on delete cascade,
  "instructorId" text not null references public."User"(id) on delete cascade,
  "collegeId" text not null references public."College"(id) on delete restrict,
  "requestedDay" text not null,
  "requestedStartTime" text not null,
  "requestedEndTime" text not null,
  reason text not null,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'approved_with_solution')
  ),
  "conflictSeverity" text check ("conflictSeverity" in ('none', 'small', 'large')),
  "conflictDetails" jsonb,
  "adminSuggestion" text,
  "reviewedById" text references public."User"(id) on delete set null,
  "reviewedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists schedulechangerequest_college_status_idx
  on public."ScheduleChangeRequest" ("collegeId", status);
create index if not exists schedulechangerequest_instructor_idx
  on public."ScheduleChangeRequest" ("instructorId");

drop trigger if exists trg_schedulechangerequest_updated_at on public."ScheduleChangeRequest";
create trigger trg_schedulechangerequest_updated_at
before update on public."ScheduleChangeRequest"
for each row execute function public.set_updated_at();

alter table public."ScheduleChangeRequest" enable row level security;

drop policy if exists schedulechangerequest_select on public."ScheduleChangeRequest";
create policy schedulechangerequest_select on public."ScheduleChangeRequest"
for select
to authenticated
using (
  "instructorId" = auth.uid()::text
  or (
    public.is_college_admin()
    and "collegeId" = public.current_user_college_id()
  )
);

drop policy if exists schedulechangerequest_insert_instructor on public."ScheduleChangeRequest";
create policy schedulechangerequest_insert_instructor on public."ScheduleChangeRequest"
for insert
to authenticated
with check (
  public.current_user_role() = 'instructor'
  and "instructorId" = auth.uid()::text
  and "collegeId" = public.current_user_college_id()
);

drop policy if exists schedulechangerequest_update_college on public."ScheduleChangeRequest";
create policy schedulechangerequest_update_college on public."ScheduleChangeRequest"
for update
to authenticated
using (
  public.is_college_admin()
  and "collegeId" = public.current_user_college_id()
)
with check (
  public.is_college_admin()
  and "collegeId" = public.current_user_college_id()
);

-- College Admin may update schedule rows in their college (approval applies requested slot).
drop policy if exists scheduleentry_update_college_admin on public."ScheduleEntry";
create policy scheduleentry_update_college_admin on public."ScheduleEntry"
for update
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
)
with check (
  public.is_college_admin()
  and exists (
    select 1
    from public."Section" s
    join public."Program" p on p.id = s."programId"
    where s.id = "ScheduleEntry"."sectionId"
      and p."collegeId" = public.current_user_college_id()
  )
);

-- Notifications: College Admin can notify instructors in their college (same as chairman pattern).
drop policy if exists notif_insert_college_admin on public."Notification";
create policy notif_insert_college_admin on public."Notification"
for insert
to authenticated
with check (
  public.is_college_admin()
  and exists (
    select 1
    from public."User" u
    where u.id = "Notification"."userId"
      and u."collegeId" = public.current_user_college_id()
  )
);
