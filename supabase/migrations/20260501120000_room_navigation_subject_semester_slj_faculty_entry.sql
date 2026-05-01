-- CTU Argao: campus navigation fields on Room, semester/prerequisites on Subject,
-- and faculty + schedule-entry linkage on ScheduleLoadJustification for VPAA policy reviews.

-- ---------------------------------------------------------------------------
-- Room: optional image path (under /public/campus/...) and display label
-- ---------------------------------------------------------------------------
alter table public."Room" add column if not exists "imagePath" text;
alter table public."Room" add column if not exists "displayName" text;

comment on column public."Room"."imagePath" is
  'Optional filename or path segment for campus navigation (e.g. FABLab.HEIC under public/campus).';
comment on column public."Room"."displayName" is
  'Optional human-readable room/office title when different from code (e.g. Dean''s Office).';

-- ---------------------------------------------------------------------------
-- Subject: semester (1|2) and prerequisite note for curriculum seeds / UI
-- ---------------------------------------------------------------------------
alter table public."Subject" add column if not exists semester smallint;
alter table public."Subject" add column if not exists "prerequisiteNote" text;

comment on column public."Subject".semester is 'Official prospectus semester (1 or 2) when applicable.';
comment on column public."Subject"."prerequisiteNote" is
  'Free-text prerequisite line from the curriculum table (mirrors catalog; evaluator may use prospectus TS).';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'Subject_semester_check'
      and conrelid = 'public."Subject"'::regclass
  ) then
    alter table public."Subject"
      add constraint "Subject_semester_check"
      check (semester is null or semester in (1, 2));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- ScheduleLoadJustification: link overload narrative to faculty + sample entry
-- ---------------------------------------------------------------------------
alter table public."ScheduleLoadJustification" add column if not exists "facultyUserId" text
  references public."User"(id) on delete set null;
alter table public."ScheduleLoadJustification" add column if not exists "scheduleEntryId" text
  references public."ScheduleEntry"(id) on delete set null;

comment on column public."ScheduleLoadJustification"."facultyUserId" is
  'Instructor whose plotted load exceeded policy when this justification was filed (nullable for legacy college-wide rows).';
comment on column public."ScheduleLoadJustification"."scheduleEntryId" is
  'Representative ScheduleEntry row tied to this review (nullable; violationsSnapshot may list more ids).';

-- Replace single college+period uniqueness with partial indexes (legacy vs per-faculty).
alter table public."ScheduleLoadJustification"
  drop constraint if exists "ScheduleLoadJustification_academicPeriodId_collegeId_key";

drop index if exists schedule_load_justif_legacy_period_college;
create unique index schedule_load_justif_legacy_period_college
  on public."ScheduleLoadJustification" ("academicPeriodId", "collegeId")
  where "facultyUserId" is null and "scheduleEntryId" is null;

drop index if exists schedule_load_justif_period_college_faculty;
create unique index schedule_load_justif_period_college_faculty
  on public."ScheduleLoadJustification" ("academicPeriodId", "collegeId", "facultyUserId")
  where "facultyUserId" is not null;
