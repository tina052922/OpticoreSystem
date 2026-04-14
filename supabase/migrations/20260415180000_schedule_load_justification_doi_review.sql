-- VPAA/DOI review of chairman-submitted faculty load justifications (one row per academic period + college).

alter table public."ScheduleLoadJustification"
  add column if not exists "doiDecision" text,
  add column if not exists "doiReviewedAt" timestamptz,
  add column if not exists "doiReviewedById" text references public."User"(id) on delete set null,
  add column if not exists "doiReviewNote" text;

alter table public."ScheduleLoadJustification"
  drop constraint if exists "ScheduleLoadJustification_doiDecision_check";

alter table public."ScheduleLoadJustification"
  add constraint "ScheduleLoadJustification_doiDecision_check"
  check ("doiDecision" is null or "doiDecision" in ('accepted', 'rejected', 'pending'));

comment on column public."ScheduleLoadJustification"."doiDecision" is
  'VPAA decision: null = not reviewed; accepted/rejected after review in DOI Policy reviews.';

-- DOI may update review columns (and read all rows via existing SELECT policy).
drop policy if exists schedule_load_justif_doi_update on public."ScheduleLoadJustification";
create policy schedule_load_justif_doi_update on public."ScheduleLoadJustification"
for update
to authenticated
using (public.is_doi_admin())
with check (public.is_doi_admin());
