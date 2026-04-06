-- Dedicated row for manual QA of Faculty → Request schedule change → College Admin review.
-- Depends on seed (or prior data): College col-tech-eng, AcademicPeriod ap-2025-2, instructor 2913ec86-b6c3-4663-a969-1557c46835bd (instructor@opticore.local).

insert into public."ScheduleEntry" (id, "academicPeriodId", "subjectId", "instructorId", "sectionId", "roomId", day, "startTime", "endTime", status)
values
  (
    'sch-qa-schedule-change-demo',
    'ap-2025-2',
    'sub-cc-111',
    '2913ec86-b6c3-4663-a969-1557c46835bd',
    'sec-bsit-1a',
    'room-it-lab-2',
    'Tuesday',
    '14:00',
    '16:00',
    'draft'
  )
on conflict (id) do update set
  "academicPeriodId" = excluded."academicPeriodId",
  "subjectId" = excluded."subjectId",
  "instructorId" = excluded."instructorId",
  "sectionId" = excluded."sectionId",
  "roomId" = excluded."roomId",
  day = excluded.day,
  "startTime" = excluded."startTime",
  "endTime" = excluded."endTime",
  status = excluded.status;
