-- OptiCore — reset app data for clean end-to-end testing (Chairman → College → GEC → Instructor → DOI)
-- After running, see docs/QA_TESTING_GUIDE.md for account list and step-by-step QA.
--
-- Keeps catalog data: College, Program, Section, Room, Subject, AcademicPeriod.
-- Keeps exactly these public."User" rows:
--   • Four admin accounts (DOI, College, GEC Chairman, Program Chairman)
--   • System GEC vacant placeholder (instructor id a0000000-0000-4000-8000-000000000099; not a login account)
--
-- Removes: CAS admin, seed instructor, student, visitor, all schedules, workflow, notifications,
-- access requests, audit rows, faculty/student profiles for removed users.
--
-- Run in Supabase SQL Editor (or psql) as a role that can modify public tables.
-- After this script, delete matching users from Supabase Authentication (see bottom) so Auth stays in sync.

begin;

-- Canonical ids (must match seed.sql + migration gec placeholder)
-- Chairman (BSIT):     9a727fde-53b7-4463-8c36-fa7614945a7a
-- College admin:       7f77000a-bf51-43ed-b52e-a27a3e8add6c
-- GEC chairman:        41288bb4-7b5e-49d0-b02a-b8d20c2d701e
-- DOI admin:           3424c55e-d871-47a3-8134-1d339717e7ca
-- GEC vacant placeholder (system): a0000000-0000-4000-8000-000000000099

-- Clear college signer pointers so nothing references users we remove
update public."College"
set
  "campusDirectorUserId" = null,
  "contractSignerUserId" = null;

delete from public."WorkflowInboxMessage";
delete from public."Notification";
delete from public."AuditLog";
delete from public."AccessRequest";

-- ScheduleChangeRequest references ScheduleEntry — removed when entries are deleted (ON DELETE CASCADE)
delete from public."ScheduleEntry";

delete from public."DoiScheduleFinalization";
delete from public."ScheduleLoadJustification";

-- Profiles (fresh instructor profiles come from registration / faculty workspace)
delete from public."FacultyProfile";
delete from public."StudentProfile";

delete from public."User"
where id not in (
  '9a727fde-53b7-4463-8c36-fa7614945a7a',
  '7f77000a-bf51-43ed-b52e-a27a3e8add6c',
  '41288bb4-7b5e-49d0-b02a-b8d20c2d701e',
  '3424c55e-d871-47a3-8134-1d339717e7ca',
  'a0000000-0000-4000-8000-000000000099'
);

commit;

-- -----------------------------------------------------------------------------
-- Supabase Auth (manual step — public."User".id must equal auth.users.id)
-- -----------------------------------------------------------------------------
-- In Dashboard → Authentication → Users, delete users whose UUIDs are no longer in public."User",
-- typically the former seed accounts, for example:
--   c35393fb-940c-455d-8809-9bafdab7f103  (cas_admin)
--   2913ec86-b6c3-4663-a969-1557c46835bd  (seed instructor)
--   225962fc-8cc1-41d7-8378-cb36ef1aed14  (student)
--   d2b1447e-a32b-4c30-9c96-b765700f12c0  (visitor)
--
-- Optional SQL (only if your project allows direct auth schema edits; often Dashboard is safer):
--   delete from auth.identities where user_id in ('c35393fb-940c-455d-8809-9bafdab7f103', ...);
--   delete from auth.users where id in ('c35393fb-940c-455d-8809-9bafdab7f103', ...);
