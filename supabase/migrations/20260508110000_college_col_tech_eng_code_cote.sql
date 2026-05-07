-- Registration dropdown shows College.code + name (see /api/public/colleges). Use COTE not CTE.
update public."College"
set
  code = 'COTE',
  name = 'College of Technology and Engineering'
where id = 'col-tech-eng';
