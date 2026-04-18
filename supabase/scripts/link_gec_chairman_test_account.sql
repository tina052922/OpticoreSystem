-- Link auth user ↔ public."User" for GEC Chairman test (fixes empty schedule / RLS when role is NULL).
-- Auth UID for gec.chairman.test@opticore.local — run once in Supabase SQL Editor.
--
-- If public."User".id does not match auth.users.id, current_user_role() is NULL and ScheduleEntry policies for gec_chairman fail.

insert into public."User" (id, "employeeId", email, name, role, "collegeId")
values (
  '13df0eb6-19cc-451a-bcc1-4f7b1c59b8c0'::text,
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
