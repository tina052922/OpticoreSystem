-- Align seeded room `building` labels with CTU Argao campus names (evaluator Building → Room UX + INS).
update public."Room" set building = 'COED Building' where code = 'Room 201';
update public."Room" set building = 'Science and Technology Building' where code in ('Lab 301', 'IE Lab', 'IT LAB 1', 'IT LAB 2', 'IT LAB 3', 'IT LAB 4');
update public."Room" set building = 'COTE Building' where code in ('Elex Lab 1', 'Drafting Lab 1', 'Garments Lab 1');
update public."Room" set building = 'Agriculture Building' where code = 'Auto Shop A';

insert into public."Room" (id, code, building, floor, capacity, type, "collegeId")
values
  ('room-admin-conf', 'Admin Conf A', 'Admin Building', 1, 30, 'Conference', null),
  ('room-lib-101', 'Library 101', 'Library', 1, 50, 'Lecture', null),
  ('room-chapel-mp', 'Chapel — MP Hall', 'Chapel', 1, 120, 'Multi-purpose', null),
  ('room-mini-hotel-a', 'Mini Hotel — Training Room A', 'Mini Hotel', 1, 24, 'Lecture', null)
on conflict (code) do nothing;
