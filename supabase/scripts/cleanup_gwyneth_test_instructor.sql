-- OptiCore data cleanup: test instructor "Gwyneth Alberca" (Employee ID CTU-1234) → reassign schedules to CTU1234, remove test user.
-- Run in Supabase SQL Editor after verifying IDs. Adjust names if your seed differs.
--
-- 1) Inspect candidates:
-- select id, name, "employeeId", email from public."User"
--   where "employeeId" in ('CTU-1234', 'CTU1234') or name ilike '%Gwyneth%Alberca%';

do $$
declare
  old_uid text;
  new_uid text;
begin
  select u.id into old_uid
  from public."User" u
  where u."employeeId" = 'CTU-1234'
  limit 1;

  select u.id into new_uid
  from public."User" u
  where u."employeeId" = 'CTU1234'
  limit 1;

  if old_uid is null then
    raise notice 'No User with employeeId CTU-1234 — nothing to migrate.';
    return;
  end if;
  if new_uid is null then
    raise exception 'Target User with employeeId CTU1234 not found. Create/link that account first.';
  end if;

  update public."ScheduleEntry"
  set "instructorId" = new_uid
  where "instructorId" = old_uid;

  update public."AuditLog" set "actorId" = new_uid where "actorId" = old_uid;

  delete from public."FacultyProfile" where "userId" = old_uid;

  delete from public."User" where id = old_uid;
end $$;
