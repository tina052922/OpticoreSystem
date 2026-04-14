-- OptiCore — reset one term to draft for end-to-end scheduling retests
--
-- Run in Supabase SQL Editor when a database was previously VPAA-published and you need
-- Chairman / College / GEC flows testable again (no locked ScheduleEntry rows).
--
-- 1. Replace 'ap-2025-2' with your test period id (from public."AcademicPeriod").
-- 2. Execute the transaction.
--
-- This does not remove the DOI approval UI; it only clears publication state so you can retest.

begin;

update public."ScheduleEntry"
set
  status = case
    when status = 'final' then 'draft'
    else status
  end,
  "lockedByDoiAt" = null
where "academicPeriodId" = 'ap-2025-2';

delete from public."DoiScheduleFinalization"
where "academicPeriodId" = 'ap-2025-2';

commit;
