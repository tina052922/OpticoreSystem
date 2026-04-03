-- Run once in Supabase SQL Editor (same project as the app).
-- Lets middleware read the signed-in user's row without RLS blocking the lookup.
-- Returns JSON null (jsonb) when no User row matches auth.uid() — e.g. seed not applied or User.id ≠ Auth UUID.

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
