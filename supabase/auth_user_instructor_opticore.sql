-- Run in Supabase SQL Editor AFTER public."User" row exists from seed.sql.
-- Creates auth.users + identity for instructor@opticore.local with the SAME id as seed.sql
-- so login + auth_get_my_user_row() work.
--
-- Password: OptiCore2026!
-- Remove any duplicate auth rows for this email first.

delete from auth.identities
where user_id in (select id from auth.users where email = 'instructor@opticore.local');
delete from auth.users where email = 'instructor@opticore.local';

do $$
declare
  v_pw text := crypt('OptiCore2026!', gen_salt('bf'));
  v_id uuid := '2913ec86-b6c3-4663-a969-1557c46835bd'::uuid;
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    v_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'instructor@opticore.local',
    v_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_id,
    v_id,
    jsonb_build_object('sub', v_id::text, 'email', 'instructor@opticore.local'),
    'email',
    v_id::text,
    now(),
    now(),
    now()
  );
end $$;
