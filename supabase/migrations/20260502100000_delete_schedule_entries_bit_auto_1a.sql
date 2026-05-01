-- Remove all plotted schedule rows for section "BIT Auto 1A" (seed id `sec-bit-auto-1a`).
-- ScheduleChangeRequest rows referencing these entries cascade on delete.

delete from public."ScheduleEntry"
where "sectionId" = 'sec-bit-auto-1a';
