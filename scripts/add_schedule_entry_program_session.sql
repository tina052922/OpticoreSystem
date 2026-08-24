-- Night vs Day program on plotted meetings.
-- Apply in the Supabase SQL editor (or CLI) so Night rows persist across users.
-- Until applied, OptiCore still tags rows in the browser overlay.

ALTER TABLE "ScheduleEntry"
  ADD COLUMN IF NOT EXISTS "programSession" text;

UPDATE "ScheduleEntry"
SET "programSession" = 'day'
WHERE "programSession" IS NULL;

ALTER TABLE "ScheduleEntry"
  DROP CONSTRAINT IF EXISTS scheduleentry_programsession_check;

ALTER TABLE "ScheduleEntry"
  ADD CONSTRAINT scheduleentry_programsession_check
  CHECK ("programSession" IS NULL OR "programSession" IN ('day', 'night'));

COMMENT ON COLUMN "ScheduleEntry"."programSession" IS 'day = weekday 7AM-5PM evaluator; night = Mon-Sun night grid (weekday 4PM-10PM, weekend 7AM-10PM).';
