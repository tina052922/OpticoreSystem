-- OptiCore: create Supabase Auth users matching public."User" rows in seed.sql.
-- Run in SQL Editor AFTER seed.sql. Password for every account: OptiCore2026!
-- Requires: pgcrypto (see schema.sql: create extension if not exists pgcrypto).
--
-- Dev-only cleanup so you can re-run: removes these fixed UUIDs from auth.
delete from auth.identities
where user_id in (
  'a0000001-0000-4000-8000-000000000001'::uuid,
  'a0000001-0000-4000-8000-000000000002'::uuid,
  'a0000001-0000-4000-8000-000000000003'::uuid,
  'a0000001-0000-4000-8000-000000000004'::uuid,
  'a0000001-0000-4000-8000-000000000005'::uuid,
  'a0000001-0000-4000-8000-000000000006'::uuid,
  'a0000001-0000-4000-8000-000000000007'::uuid,
  'a0000001-0000-4000-8000-000000000008'::uuid
);
delete from auth.users
where id in (
  'a0000001-0000-4000-8000-000000000001'::uuid,
  'a0000001-0000-4000-8000-000000000002'::uuid,
  'a0000001-0000-4000-8000-000000000003'::uuid,
  'a0000001-0000-4000-8000-000000000004'::uuid,
  'a0000001-0000-4000-8000-000000000005'::uuid,
  'a0000001-0000-4000-8000-000000000006'::uuid,
  'a0000001-0000-4000-8000-000000000007'::uuid,
  'a0000001-0000-4000-8000-000000000008'::uuid
);

-- Shared password hash (plain: OptiCore2026!)
do $$
declare
  v_pw text := crypt('OptiCore2026!', gen_salt('bf'));
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
  ) values
    (
      'a0000001-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      'chairman.admin@opticore.local',
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
    ),
    (
      'a0000001-0000-4000-8000-000000000002'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      'college.admin@opticore.local',
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
    ),
    (
      'a0000001-0000-4000-8000-000000000003'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      'cas.admin@opticore.local',
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
    ),
    (
      'a0000001-0000-4000-8000-000000000004'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      'gec.chairman@opticore.local',
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
    ),
    (
      'a0000001-0000-4000-8000-000000000005'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      'doi.admin@opticore.local',
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
    ),
    (
      'a0000001-0000-4000-8000-000000000006'::uuid,
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
    ),
    (
      'a0000001-0000-4000-8000-000000000007'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      'student@opticore.local',
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
    ),
    (
      'a0000001-0000-4000-8000-000000000008'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      'visitor@opticore.local',
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
  ) values
    (
      'a0000001-0000-4000-8000-000000000001'::uuid,
      'a0000001-0000-4000-8000-000000000001'::uuid,
      jsonb_build_object(
        'sub', 'a0000001-0000-4000-8000-000000000001',
        'email', 'chairman.admin@opticore.local'
      ),
      'email',
      'a0000001-0000-4000-8000-000000000001'::uuid,
      now(),
      now(),
      now()
    ),
    (
      'a0000001-0000-4000-8000-000000000002'::uuid,
      'a0000001-0000-4000-8000-000000000002'::uuid,
      jsonb_build_object(
        'sub', 'a0000001-0000-4000-8000-000000000002',
        'email', 'college.admin@opticore.local'
      ),
      'email',
      'a0000001-0000-4000-8000-000000000002'::uuid,
      now(),
      now(),
      now()
    ),
    (
      'a0000001-0000-4000-8000-000000000003'::uuid,
      'a0000001-0000-4000-8000-000000000003'::uuid,
      jsonb_build_object(
        'sub', 'a0000001-0000-4000-8000-000000000003',
        'email', 'cas.admin@opticore.local'
      ),
      'email',
      'a0000001-0000-4000-8000-000000000003'::uuid,
      now(),
      now(),
      now()
    ),
    (
      'a0000001-0000-4000-8000-000000000004'::uuid,
      'a0000001-0000-4000-8000-000000000004'::uuid,
      jsonb_build_object(
        'sub', 'a0000001-0000-4000-8000-000000000004',
        'email', 'gec.chairman@opticore.local'
      ),
      'email',
      'a0000001-0000-4000-8000-000000000004'::uuid,
      now(),
      now(),
      now()
    ),
    (
      'a0000001-0000-4000-8000-000000000005'::uuid,
      'a0000001-0000-4000-8000-000000000005'::uuid,
      jsonb_build_object(
        'sub', 'a0000001-0000-4000-8000-000000000005',
        'email', 'doi.admin@opticore.local'
      ),
      'email',
      'a0000001-0000-4000-8000-000000000005'::uuid,
      now(),
      now(),
      now()
    ),
    (
      'a0000001-0000-4000-8000-000000000006'::uuid,
      'a0000001-0000-4000-8000-000000000006'::uuid,
      jsonb_build_object(
        'sub', 'a0000001-0000-4000-8000-000000000006',
        'email', 'instructor@opticore.local'
      ),
      'email',
      'a0000001-0000-4000-8000-000000000006'::uuid,
      now(),
      now(),
      now()
    ),
    (
      'a0000001-0000-4000-8000-000000000007'::uuid,
      'a0000001-0000-4000-8000-000000000007'::uuid,
      jsonb_build_object(
        'sub', 'a0000001-0000-4000-8000-000000000007',
        'email', 'student@opticore.local'
      ),
      'email',
      'a0000001-0000-4000-8000-000000000007'::uuid,
      now(),
      now(),
      now()
    ),
    (
      'a0000001-0000-4000-8000-000000000008'::uuid,
      'a0000001-0000-4000-8000-000000000008'::uuid,
      jsonb_build_object(
        'sub', 'a0000001-0000-4000-8000-000000000008',
        'email', 'visitor@opticore.local'
      ),
      'email',
      'a0000001-0000-4000-8000-000000000008'::uuid,
      now(),
      now(),
      now()
    );
end $$;
