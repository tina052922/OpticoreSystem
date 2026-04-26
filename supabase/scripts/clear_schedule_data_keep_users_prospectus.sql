-- OptiCore — remove all plotted schedule data; keep users, prospectus/catalog, and academic periods.
--
-- Deletes:
--   • ScheduleEntry (ScheduleChangeRequest rows cascade)
--   • ScheduleLoadJustification (chairman load-policy notes per term/college)
--   • DoiScheduleFinalization (DOI publish / signature state per term)
--
-- Preserves:
--   • public."User", FacultyProfile, StudentProfile
--   • College, Program, Section, Subject, Room, AcademicPeriod
--
-- Run in Supabase → SQL Editor (or psql) as a role that can DELETE on these tables.

begin;

delete from public."ScheduleLoadJustification";
delete from public."DoiScheduleFinalization";
delete from public."ScheduleEntry";

commit;

-- Verify (optional):
-- select count(*) from public."ScheduleEntry";
-- select count(*) from public."ScheduleLoadJustification";
-- select count(*) from public."DoiScheduleFinalization";
