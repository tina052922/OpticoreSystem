-- Publication timestamp for VPAA-approved master schedules (distinct from signature time if needed).
alter table public."DoiScheduleFinalization"
  add column if not exists "publishedAt" timestamptz;

comment on column public."DoiScheduleFinalization"."publishedAt" is
  'Set when DOI approves: master timetable is published for the term; mirrors operational go-live after signature.';
