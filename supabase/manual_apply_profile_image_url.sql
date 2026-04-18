-- If you see "Could not find the function public.set_my_profile_image_url(p_url) in the schema cache",
-- run this entire script in Supabase Dashboard → SQL Editor (same as migration 20260418120000_user_profile_image_url.sql).

alter table public."User" add column if not exists "profileImageUrl" text;

comment on column public."User"."profileImageUrl" is
  'Public URL (e.g. Supabase Storage) for profile / header avatar.';

create or replace function public.set_my_profile_image_url(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public."User"
  set "profileImageUrl" = nullif(trim(p_url), '')
  where id = auth.uid()::text;
end;
$$;

grant execute on function public.set_my_profile_image_url(text) to authenticated;

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
        'chairmanProgramName', pr.name,
        'signatureImageUrl', u."signatureImageUrl",
        'employeeId', u."employeeId",
        'profileImageUrl', u."profileImageUrl"
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

notify pgrst, 'reload schema';
