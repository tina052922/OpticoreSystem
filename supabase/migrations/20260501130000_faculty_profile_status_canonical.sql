-- Canonical `FacultyProfile.status`: "Organic" | "Part-time" (matches app + load policy).
-- Rewrites legacy labels (e.g. Permanent, Part-Time) so storage matches the UI.

update public."FacultyProfile"
set status = 'Part-time'
where status is not null
  and lower(trim(status)) like '%part%'
  and status is distinct from 'Part-time';

update public."FacultyProfile"
set status = 'Organic'
where status is not null
  and lower(trim(status)) not like '%part%'
  and status is distinct from 'Organic';
