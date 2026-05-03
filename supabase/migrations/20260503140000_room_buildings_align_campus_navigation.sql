-- Align legacy college IT lab rows with campus navigation: those labs are walked under COTE Building
-- (same image suite as room-cote-302 … room-cote-305). Evaluator/GEC group by `Room.building`.
update public."Room"
set building = 'COTE Building'
where id in ('room-it-lab-1', 'room-it-lab-2', 'room-it-lab-3', 'room-it-lab-4');

comment on column public."Room".building is
  'Campus map / navigation grouping (e.g. COTE Building, Science and Technology Building). IT labs: prefer COTE rows room-cote-302…305; legacy IT LAB 1–4 rows reference the same suite and use the same building label.';
