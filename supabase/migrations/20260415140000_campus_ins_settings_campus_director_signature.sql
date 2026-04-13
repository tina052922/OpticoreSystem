-- Campus Director INS signature is campus-wide (one per site), not per college.

create table if not exists public."CampusInsSettings" (
  id text primary key default 'default' check (id = 'default'),
  "campusDirectorSignatureImageUrl" text,
  "updatedAt" timestamptz not null default now()
);

comment on table public."CampusInsSettings" is
  'Singleton row (id = default): campus-wide INS assets such as Campus Director signature image.';
comment on column public."CampusInsSettings"."campusDirectorSignatureImageUrl" is
  'DOI-uploaded Campus Director image for all INS forms; applies to every college.';

insert into public."CampusInsSettings" (id) values ('default') on conflict (id) do nothing;

-- Preserve any existing per-college URL (first non-null) into the singleton before dropping the column.
update public."CampusInsSettings" s
set "campusDirectorSignatureImageUrl" = x.url
from (
  select "campusDirectorSignatureImageUrl" as url
  from public."College"
  where "campusDirectorSignatureImageUrl" is not null
  limit 1
) x
where s.id = 'default'
  and s."campusDirectorSignatureImageUrl" is null
  and x.url is not null;

alter table public."College" drop column if exists "campusDirectorSignatureImageUrl";

alter table public."CampusInsSettings" enable row level security;

drop policy if exists campus_ins_settings_select on public."CampusInsSettings";
create policy campus_ins_settings_select on public."CampusInsSettings"
for select to authenticated
using (true);

drop policy if exists campus_ins_settings_update_doi on public."CampusInsSettings";
create policy campus_ins_settings_update_doi on public."CampusInsSettings"
for update to authenticated
using (public.is_doi_admin())
with check (public.is_doi_admin());

drop policy if exists campus_ins_settings_insert_doi on public."CampusInsSettings";
create policy campus_ins_settings_insert_doi on public."CampusInsSettings"
for insert to authenticated
with check (public.is_doi_admin() and id = 'default');

drop trigger if exists trg_campus_ins_settings_updated_at on public."CampusInsSettings";
create trigger trg_campus_ins_settings_updated_at
before update on public."CampusInsSettings"
for each row execute function public.set_updated_at();
