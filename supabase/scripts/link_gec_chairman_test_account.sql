-- Link auth user ↔ public."User" for GEC Chairman test email (fixes empty schedule / RLS if role is NULL).
--
-- 1) In Supabase Dashboard → Authentication → Users, copy the UUID for `gec.chairman.test@opticore.local`.
-- 2) Replace <AUTH_USER_UUID> below and run in SQL Editor.
--
-- If public."User".id does not match auth.users.id, current_user_role() is NULL and ScheduleEntry SELECT policies for gec_chairman will not apply.

insert into public."User" (id, "employeeId", email, name, role, "collegeId")
values (
  '<AUTH_USER_UUID>'::text,
  'GEC-CHAIR-TEST',
  'gec.chairman.test@opticore.local',
  'GEC Chairman (Test)',
  'gec_chairman',
  'col-tech-eng'
)
on conflict (id) do update set
  email = excluded.email,
  name = excluded.name,
  role = 'gec_chairman',
  "collegeId" = coalesce(public."User"."collegeId", excluded."collegeId");
