-- =============================================================================
-- Diagnose: Supabase Auth users vs public."User" (OptiCore requires id = auth.uid())
-- Run in Supabase → SQL Editor. Needs access to auth schema (default for project owner).
-- =============================================================================

-- 1) Chairman accounts: match Auth UUID to public."User" and show program
select
  au.id as auth_user_id,
  au.email as auth_email,
  au.created_at as auth_created,
  pu.id as public_user_id,
  pu.role as public_role,
  pu."collegeId",
  pu."chairmanProgramId",
  pr.code as program_code
from auth.users au
left join public."User" pu on pu.id = au.id::text
left join public."Program" pr on pr.id = pu."chairmanProgramId"
where au.email in (
  'macalisangchristina@gmail.com',
  'gelbolingochristina2229@gmail.com',
  'demo-chairman@local.invalid'
)
   or pu.role = 'chairman_admin'
order by au.email nulls last;

-- 2) All chairman_admin in public."User" with or without matching auth user
select
  pu.id,
  pu.email,
  pu.role,
  pu."chairmanProgramId",
  case when au.id is null then 'NO auth.users row — login will not find this id' else 'OK' end as auth_match
from public."User" pu
left join auth.users au on au.id::text = pu.id
where pu.role = 'chairman_admin';

-- 3) Auth users with no public."User" row (will get null from auth_get_my_user_row)
select
  au.id,
  au.email,
  'missing public.User row' as issue
from auth.users au
where not exists (select 1 from public."User" pu where pu.id = au.id::text);

-- =============================================================================
-- Fix: assign BSIT to the chairman you actually log in with (pick ONE email)
-- Replace email if yours differs. prog-bsit must exist in public."Program".
-- =============================================================================
-- update public."User"
-- set "chairmanProgramId" = 'prog-bsit'
-- where id = (select id::text from auth.users where email = 'gelbolingochristina2229@gmail.com')
--   and role = 'chairman_admin';

-- Or by explicit UUID from auth.users:
-- update public."User"
-- set "chairmanProgramId" = 'prog-bsit'
-- where id = 'cb76746d-dc1f-4826-993f-4594b2191036'
--   and role = 'chairman_admin';
