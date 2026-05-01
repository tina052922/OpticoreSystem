-- Align CAFE college record with Central Hub (`lib/evaluator-central-hub.ts` collegeId `col-cafe`).
update public."College"
set name = 'College of Agriculture, Forestry, & Environmental Science'
where id = 'col-cafe';
