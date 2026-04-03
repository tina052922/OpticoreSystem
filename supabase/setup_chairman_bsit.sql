-- =============================================================================
-- OptiCore: BSIT Chairman — database setup (Supabase SQL Editor)
-- Run sections as needed. Safe to re-run: uses IF NOT EXISTS / idempotent inserts.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Column: chairman assigned program (FK to Program)
-- -----------------------------------------------------------------------------
alter table public."User"
  add column if not exists "chairmanProgramId" text references public."Program"(id) on delete set null;

-- -----------------------------------------------------------------------------
-- 2) Ensure BSIT program exists (seed id — must match app / RLS)
-- -----------------------------------------------------------------------------
insert into public."Program" (id, code, name, "collegeId")
values (
  'prog-bsit',
  'BSIT',
  'Bachelor of Science in Information Technology',
  'col-tech-eng'
)
on conflict (code) do update set
  name = excluded.name,
  "collegeId" = excluded."collegeId";

-- If your College row uses a different id, fix collegeId above or insert College first:
-- insert into public."College" (id, code, name) values ('col-tech-eng', 'CTE', 'College of Technology and Engineering')
-- on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 3) Assign BSIT program to the chairman user
--    Option A — seed chairman UUID (macalisangchristina@gmail.com in sample seed):
-- -----------------------------------------------------------------------------
update public."User"
set "chairmanProgramId" = 'prog-bsit'
where id = '9a727fde-53b7-4463-8c36-fa7614945a7a'
  and role = 'chairman_admin';

--    Option B — by email (use YOUR chairman email if different):
-- -----------------------------------------------------------------------------
-- update public."User"
-- set "chairmanProgramId" = 'prog-bsit'
-- where email = 'macalisangchristina@gmail.com'
--   and role = 'chairman_admin';

--    Option C — current Supabase Auth user (run while logged in as chairman in SQL Editor
--    only if your project allows auth.uid() in SQL — often you use A or B instead):
-- -----------------------------------------------------------------------------
-- update public."User"
-- set "chairmanProgramId" = 'prog-bsit'
-- where id = auth.uid()::text
--   and role = 'chairman_admin';

-- -----------------------------------------------------------------------------
-- 4) RPC: auth profile for app + middleware (returns chairmanProgramId + program code/name)
--    Skip if you already applied supabase/auth_get_my_user_row.sql successfully.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5) RLS helper for chairman program scope (skip if migration already applied)
-- -----------------------------------------------------------------------------
create or replace function public.current_user_chairman_program_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u."chairmanProgramId" from public."User" u where u.id = auth.uid()::text
$$;

grant execute on function public.current_user_chairman_program_id() to authenticated;

-- -----------------------------------------------------------------------------
-- 6) Verification queries
-- -----------------------------------------------------------------------------
-- Chairman row + program
select
  u.id,
  u.email,
  u.role,
  u."collegeId",
  u."chairmanProgramId",
  p.code as program_code,
  p.name as program_name
from public."User" u
left join public."Program" p on p.id = u."chairmanProgramId"
where u.role = 'chairman_admin';

-- RPC result as the app sees it (run in SQL Editor while impersonating user is not always available;
--    use Supabase Dashboard → Authentication → copy user id and compare to public."User".id)
select public.auth_get_my_user_row();
