-- Campus-wide scheduling / policy defaults (editable by DOI + College Admin via RLS).

alter table public."CampusInsSettings"
  add column if not exists "schedulingPolicy" jsonb;

comment on column public."CampusInsSettings"."schedulingPolicy" is
  'Campus-wide teaching load limits and scheduler defaults; merged with app fallbacks when null.';

-- College Admin may update campus policy alongside DOI (System Configuration page).
drop policy if exists campus_ins_settings_update_doi on public."CampusInsSettings";
create policy campus_ins_settings_update_admins on public."CampusInsSettings"
for update to authenticated
using (public.is_doi_admin() or public.is_college_admin())
with check (public.is_doi_admin() or public.is_college_admin());

-- Academic period catalog maintenance (current term, new semesters).
drop policy if exists ap_insert_admin on public."AcademicPeriod";
create policy ap_insert_admin on public."AcademicPeriod"
for insert to authenticated
with check (public.is_doi_admin() or public.is_college_admin());

drop policy if exists ap_update_admin on public."AcademicPeriod";
create policy ap_update_admin on public."AcademicPeriod"
for update to authenticated
using (public.is_doi_admin() or public.is_college_admin())
with check (public.is_doi_admin() or public.is_college_admin());
