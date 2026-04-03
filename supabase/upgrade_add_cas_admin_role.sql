-- Run once on an existing database that was created before cas_admin was added to public."User".role.
-- Safe to re-run if constraint already matches (may error if duplicate).

do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'User'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%role%';
  if cname is not null then
    execute format('alter table public."User" drop constraint %I', cname);
  end if;
end $$;

alter table public."User" add constraint "User_role_check" check (role in (
  'chairman_admin','college_admin','cas_admin','gec_chairman','doi_admin',
  'instructor','student','visitor'
));
