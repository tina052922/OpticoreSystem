-- Reset demo / test data for "Gwyneth Alberca" (typical QA employee IDs) so fresh environments do not
-- keep stale load-justification or duplicate test accounts that force policy modals.

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

  if old_uid is not null and new_uid is not null and old_uid <> new_uid then
    delete from public."ScheduleLoadJustification"
    where "facultyUserId" in (old_uid, new_uid);

    update public."ScheduleEntry"
    set "instructorId" = new_uid
    where "instructorId" = old_uid;

    update public."AuditLog" set "actorId" = new_uid where "actorId" = old_uid;

    delete from public."FacultyProfile" where "userId" = old_uid;
    delete from public."User" where id = old_uid;
  end if;

  delete from public."ScheduleLoadJustification"
  where "facultyUserId" in (
    select u.id
    from public."User" u
    where u.name ilike '%gwyneth%alberca%'
       or u."employeeId" in ('CTU-1234', 'CTU1234')
  );
end $$;
