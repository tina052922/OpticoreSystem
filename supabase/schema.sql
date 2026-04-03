-- OptiCore: Campus Intelligence System – CTU Argao
-- Schema + basic RLS (Chairman restricted to their College)
--
-- Notes:
-- - Uses TEXT ids (uuid-as-text) to align with "string" schema requirement.
-- - Assumes "User".id == auth.uid()::text for authenticated users.

create extension if not exists pgcrypto;

-- Tables
create table if not exists public."AcademicPeriod" (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  semester text not null,
  "academicYear" text not null,
  "isCurrent" boolean not null default false,
  "startDate" date,
  "endDate" date
);

create table if not exists public."College" (
  id text primary key default gen_random_uuid()::text,
  code text not null unique,
  name text not null
);

create table if not exists public."Program" (
  id text primary key default gen_random_uuid()::text,
  code text not null unique,
  name text not null,
  "collegeId" text not null references public."College"(id) on delete restrict
);

create table if not exists public."Section" (
  id text primary key default gen_random_uuid()::text,
  "programId" text not null references public."Program"(id) on delete restrict,
  name text not null,
  "yearLevel" int not null,
  "studentCount" int not null default 0
);

create table if not exists public."User" (
  id text primary key,
  "employeeId" text unique,
  email text not null unique,
  name text not null,
  role text not null check (role in ('chairman_admin','college_admin','cas_admin','gec_chairman','doi_admin','instructor','student','visitor')),
  "collegeId" text references public."College"(id) on delete set null,
  "chairmanProgramId" text references public."Program"(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."FacultyProfile" (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null unique references public."User"(id) on delete cascade,
  "fullName" text not null,
  aka text,
  "bsDegree" text,
  "msDegree" text,
  "doctoralDegree" text,
  major1 text,
  major2 text,
  major3 text,
  minor1 text,
  minor2 text,
  minor3 text,
  research text,
  extension text,
  production text,
  "specialTraining" text,
  status text,
  designation text,
  "ratePerHour" double precision
);

create table if not exists public."Subject" (
  id text primary key default gen_random_uuid()::text,
  code text not null unique,
  subcode text,
  title text not null,
  "lecUnits" double precision not null default 0,
  "lecHours" double precision not null default 0,
  "labUnits" double precision not null default 0,
  "labHours" double precision not null default 0,
  "programId" text not null references public."Program"(id) on delete restrict,
  "yearLevel" int not null
);

-- Expanded slightly to support chairman college scoping
create table if not exists public."Room" (
  id text primary key default gen_random_uuid()::text,
  code text not null unique,
  building text,
  floor int,
  capacity int,
  type text,
  "collegeId" text references public."College"(id) on delete set null
);

create table if not exists public."ScheduleEntry" (
  id text primary key default gen_random_uuid()::text,
  "academicPeriodId" text not null references public."AcademicPeriod"(id) on delete restrict,
  "subjectId" text not null references public."Subject"(id) on delete restrict,
  "instructorId" text not null references public."User"(id) on delete restrict,
  "sectionId" text not null references public."Section"(id) on delete restrict,
  "roomId" text not null references public."Room"(id) on delete restrict,
  day text not null,
  "startTime" text not null,
  "endTime" text not null,
  status text not null check (status in ('draft','final','conflicted'))
);

create table if not exists public."Notification" (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null references public."User"(id) on delete cascade,
  message text not null,
  "isRead" boolean not null default false,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."StudentProfile" (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null unique references public."User"(id) on delete cascade,
  "programId" text not null references public."Program"(id) on delete restrict,
  "sectionId" text not null references public."Section"(id) on delete restrict,
  "yearLevel" int not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- updatedAt trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

drop trigger if exists trg_user_updated_at on public."User";
create trigger trg_user_updated_at
before update on public."User"
for each row
execute function public.set_updated_at();

drop trigger if exists trg_studentprofile_updated_at on public."StudentProfile";
create trigger trg_studentprofile_updated_at
before update on public."StudentProfile"
for each row
execute function public.set_updated_at();

-- Upgrade path: older DBs created before chairmanProgramId
alter table public."User" add column if not exists "chairmanProgramId" text references public."Program"(id) on delete set null;

-- Helpers for RLS (SECURITY DEFINER avoids infinite recursion: invoker policies on "User"
-- must not re-enter RLS while evaluating is_chairman_admin / current_user_*).
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

create or replace function public.current_user_chairman_program_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u."chairmanProgramId" from public."User" u where u.id = auth.uid()::text
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_college_id() to authenticated;
grant execute on function public.is_chairman_admin() to authenticated;
grant execute on function public.current_user_chairman_program_id() to authenticated;

-- Enable RLS
alter table public."AcademicPeriod" enable row level security;
alter table public."College" enable row level security;
alter table public."Program" enable row level security;
alter table public."Section" enable row level security;
alter table public."User" enable row level security;
alter table public."FacultyProfile" enable row level security;
alter table public."Subject" enable row level security;
alter table public."Room" enable row level security;
alter table public."ScheduleEntry" enable row level security;
alter table public."Notification" enable row level security;
alter table public."StudentProfile" enable row level security;

-- Policies
-- AcademicPeriod: readable by authenticated users (chairman needs current period)
drop policy if exists ap_select on public."AcademicPeriod";
create policy ap_select on public."AcademicPeriod"
for select
to authenticated
using (true);

-- College: readable by authenticated users
drop policy if exists college_select on public."College";
create policy college_select on public."College"
for select
to authenticated
using (true);

-- User: self; college peers; DOI campus-wide; students see faculty names; instructors see students in same college
drop policy if exists user_select_self_or_college on public."User";
create policy user_select_self_or_college on public."User"
for select
to authenticated
using (
  id = auth.uid()::text
  or (
    public.is_chairman_admin()
    and "collegeId" is not null
    and "collegeId" = public.current_user_college_id()
  )
  or (public.current_user_role() = 'doi_admin')
  or (
    public.current_user_role() = 'student'
    and role in ('instructor', 'chairman_admin')
    and coalesce("collegeId", '') = coalesce(public.current_user_college_id(), '')
  )
  or (
    public.current_user_role() = 'instructor'
    and role = 'student'
    and coalesce("collegeId", '') = coalesce(public.current_user_college_id(), '')
  )
);

-- FacultyProfile: chairman can manage profiles tied to their college
drop policy if exists facultyprofile_crud on public."FacultyProfile";
create policy facultyprofile_crud on public."FacultyProfile"
for all
to authenticated
using (
  public.is_chairman_admin()
  and exists (
    select 1
    from public."User" u
    where u.id = "FacultyProfile"."userId"
      and u."collegeId" = public.current_user_college_id()
  )
)
with check (
  public.is_chairman_admin()
  and exists (
    select 1
    from public."User" u
    where u.id = "FacultyProfile"."userId"
      and u."collegeId" = public.current_user_college_id()
  )
);

drop policy if exists facultyprofile_select_own on public."FacultyProfile";
create policy facultyprofile_select_own on public."FacultyProfile"
for select
to authenticated
using ("userId" = auth.uid()::text);

-- Program: chairman can manage programs in their college (one program when chairmanProgramId is set)
drop policy if exists program_crud on public."Program";
create policy program_crud on public."Program"
for all
to authenticated
using (
  public.is_chairman_admin()
  and "collegeId" = public.current_user_college_id()
  and (
    public.current_user_chairman_program_id() is null
    or id = public.current_user_chairman_program_id()
  )
)
with check (
  public.is_chairman_admin()
  and "collegeId" = public.current_user_college_id()
  and (
    public.current_user_chairman_program_id() is null
    or id = public.current_user_chairman_program_id()
  )
);

drop policy if exists program_select_auth on public."Program";
create policy program_select_auth on public."Program"
for select
to authenticated
using (
  public.current_user_role() <> 'chairman_admin'
  or (
    public.current_user_chairman_program_id() is not null
    and id = public.current_user_chairman_program_id()
  )
  or (
    public.current_user_chairman_program_id() is null
    and "collegeId" = public.current_user_college_id()
  )
);

-- Section: chairman can manage sections under programs in their college / assigned program
drop policy if exists section_crud on public."Section";
create policy section_crud on public."Section"
for all
to authenticated
using (
  public.is_chairman_admin()
  and exists (
    select 1 from public."Program" p
    where p.id = "Section"."programId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
)
with check (
  public.is_chairman_admin()
  and exists (
    select 1 from public."Program" p
    where p.id = "Section"."programId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
);

drop policy if exists section_select_auth on public."Section";
create policy section_select_auth on public."Section"
for select
to authenticated
using (
  public.current_user_role() <> 'chairman_admin'
  or (
    public.current_user_chairman_program_id() is not null
    and "programId" = public.current_user_chairman_program_id()
  )
  or (
    public.current_user_chairman_program_id() is null
    and exists (
      select 1 from public."Program" p
      where p.id = "Section"."programId"
        and p."collegeId" = public.current_user_college_id()
    )
  )
);

-- Subject: chairman can manage subjects under programs in their college / assigned program
drop policy if exists subject_crud on public."Subject";
create policy subject_crud on public."Subject"
for all
to authenticated
using (
  public.is_chairman_admin()
  and exists (
    select 1 from public."Program" p
    where p.id = "Subject"."programId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
)
with check (
  public.is_chairman_admin()
  and exists (
    select 1 from public."Program" p
    where p.id = "Subject"."programId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
);

drop policy if exists subject_select_auth on public."Subject";
create policy subject_select_auth on public."Subject"
for select
to authenticated
using (
  public.current_user_role() <> 'chairman_admin'
  or (
    public.current_user_chairman_program_id() is not null
    and "programId" = public.current_user_chairman_program_id()
  )
  or (
    public.current_user_chairman_program_id() is null
    and exists (
      select 1 from public."Program" p
      where p.id = "Subject"."programId"
        and p."collegeId" = public.current_user_college_id()
    )
  )
);

-- Room: chairman can manage rooms scoped to their college
drop policy if exists room_crud on public."Room";
create policy room_crud on public."Room"
for all
to authenticated
using (
  public.is_chairman_admin()
  and coalesce("collegeId",'') = coalesce(public.current_user_college_id(),'')
)
with check (
  public.is_chairman_admin()
  and coalesce("collegeId",'') = coalesce(public.current_user_college_id(),'')
);

drop policy if exists room_select_auth on public."Room";
create policy room_select_auth on public."Room"
for select
to authenticated
using (true);

-- ScheduleEntry: chairman can manage schedules if section belongs to their college / assigned program
drop policy if exists scheduleentry_crud on public."ScheduleEntry";
create policy scheduleentry_crud on public."ScheduleEntry"
for all
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
)
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

drop policy if exists scheduleentry_select_student on public."ScheduleEntry";
create policy scheduleentry_select_student on public."ScheduleEntry"
for select
to authenticated
using (
  exists (
    select 1
    from public."StudentProfile" sp
    where sp."userId" = auth.uid()::text
      and sp."sectionId" = "ScheduleEntry"."sectionId"
  )
);

drop policy if exists scheduleentry_select_instructor on public."ScheduleEntry";
create policy scheduleentry_select_instructor on public."ScheduleEntry"
for select
to authenticated
using ("instructorId" = auth.uid()::text);

-- Notification: users can read their own; chairman can create notifications for users in their college
drop policy if exists notif_select_own on public."Notification";
create policy notif_select_own on public."Notification"
for select
to authenticated
using ("userId" = auth.uid()::text);

drop policy if exists notif_insert_chairman on public."Notification";
create policy notif_insert_chairman on public."Notification"
for insert
to authenticated
with check (
  public.is_chairman_admin()
  and exists (
    select 1
    from public."User" u
    where u.id = "Notification"."userId"
      and u."collegeId" = public.current_user_college_id()
  )
);

-- StudentProfile: own row; chairman CRUD for students in their college programs
drop policy if exists studentprofile_select_own on public."StudentProfile";
create policy studentprofile_select_own on public."StudentProfile"
for select
to authenticated
using ("userId" = auth.uid()::text);

drop policy if exists studentprofile_all_chairman on public."StudentProfile";
create policy studentprofile_all_chairman on public."StudentProfile"
for all
to authenticated
using (
  public.is_chairman_admin()
  and exists (
    select 1
    from public."Program" p
    where p.id = "StudentProfile"."programId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
)
with check (
  public.is_chairman_admin()
  and exists (
    select 1
    from public."Program" p
    where p.id = "StudentProfile"."programId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
);

-- Middleware / server: read own User row (SECURITY DEFINER; filters auth.uid() only)
create or replace function public.auth_get_my_user_row()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'name', u.name,
        'role', u.role,
        'collegeId', u."collegeId",
        'chairmanProgramId', u."chairmanProgramId",
        'chairmanProgramCode', pr.code,
        'chairmanProgramName', pr.name
      )
      from public."User" u
      left join public."Program" pr on pr.id = u."chairmanProgramId"
      where u.id = auth.uid()::text
      limit 1
    ),
    'null'::jsonb
  );
$$;

grant execute on function public.auth_get_my_user_row() to authenticated;

-- ---------------------------------------------------------------------------
-- Faculty load policy justifications (chairman documents overloads; DOI reviews)
-- ---------------------------------------------------------------------------
create table if not exists public."ScheduleLoadJustification" (
  id text primary key default gen_random_uuid()::text,
  "academicPeriodId" text not null references public."AcademicPeriod"(id) on delete cascade,
  "collegeId" text not null references public."College"(id) on delete cascade,
  "authorUserId" text not null references public."User"(id) on delete restrict,
  "authorName" text not null,
  "authorEmail" text,
  justification text not null,
  "violationsSnapshot" jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("academicPeriodId", "collegeId")
);

drop trigger if exists trg_schedule_load_justif_updated_at on public."ScheduleLoadJustification";
create trigger trg_schedule_load_justif_updated_at
before update on public."ScheduleLoadJustification"
for each row execute function public.set_updated_at();

alter table public."ScheduleLoadJustification" enable row level security;

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

grant execute on function public.is_doi_admin() to authenticated;

drop policy if exists schedule_load_justif_select on public."ScheduleLoadJustification";
create policy schedule_load_justif_select on public."ScheduleLoadJustification"
for select
to authenticated
using (
  public.is_doi_admin()
  or (
    public.is_chairman_admin()
    and "collegeId" = public.current_user_college_id()
  )
);

drop policy if exists schedule_load_justif_insert on public."ScheduleLoadJustification";
create policy schedule_load_justif_insert on public."ScheduleLoadJustification"
for insert
to authenticated
with check (
  public.is_chairman_admin()
  and "collegeId" = public.current_user_college_id()
  and "authorUserId" = auth.uid()::text
);

drop policy if exists schedule_load_justif_update on public."ScheduleLoadJustification";
create policy schedule_load_justif_update on public."ScheduleLoadJustification"
for update
to authenticated
using (
  public.is_chairman_admin()
  and "collegeId" = public.current_user_college_id()
)
with check (
  public.is_chairman_admin()
  and "collegeId" = public.current_user_college_id()
  and "authorUserId" = auth.uid()::text
);

drop policy if exists schedule_load_justif_delete on public."ScheduleLoadJustification";
create policy schedule_load_justif_delete on public."ScheduleLoadJustification"
for delete
to authenticated
using (
  public.is_chairman_admin()
  and "collegeId" = public.current_user_college_id()
);

-- ---------------------------------------------------------------------------
-- Ensure public."User".role CHECK includes cas_admin (idempotent).
-- Older databases may still have a pre-cas_admin constraint; CREATE TABLE IF NOT EXISTS
-- does not upgrade it, which causes seed inserts with role = cas_admin to fail (23514).
-- ---------------------------------------------------------------------------
alter table public."User" drop constraint if exists "User_role_check";

do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'User'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%role%';
  if cname is not null then
    execute format('alter table public."User" drop constraint %I', cname);
  end if;
end $$;

alter table public."User" add constraint "User_role_check" check (role in (
  'chairman_admin','college_admin','cas_admin','gec_chairman','doi_admin',
  'instructor','student','visitor'
));

