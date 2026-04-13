-- Repair: some projects never applied 20260411200000; PostgREST then errors on publishedAt.
alter table public."DoiScheduleFinalization"
  add column if not exists "publishedAt" timestamptz;

comment on column public."DoiScheduleFinalization"."publishedAt" is
  'Set when DOI approves: master timetable is published for the term; mirrors operational go-live after signature.';
