-- Speeds up term-scoped ScheduleEntry loads (evaluator hubs, INS, DOI conflict API).
create index if not exists "ScheduleEntry_academicPeriodId_idx" on public."ScheduleEntry" ("academicPeriodId");
