-- OptiCore sample data — COTE prospectus-inspired (example only; not official / final curriculum).
--
-- Core admin accounts (seeded here): Program Chairman, College Admin, GEC Chairman, DOI Admin.
-- Additional roles (cas_admin, instructor, student, visitor) are not seeded — use reset_for_clean_e2e_testing.sql
-- and Supabase Auth for a clean QA environment. Real instructors self-register (Gmail) via /register/instructor.
--
-- System user (not seeded here): GEC vacant-slot placeholder instructor
--   id = a0000000-0000-4000-8000-000000000099 (see migration 20260413120000_gec_chairman_schedule_placeholder_and_rls.sql).
--
-- AUTH: public."User".id MUST equal auth.users.id (same UUID as Supabase Authentication → Users).
--
-- PASSWORD: set in Supabase Auth when you create each user (seed_auth.sql used OptiCore2026! if you ran it instead).
--
-- | Role           | Email                              | User.id (UUID)                              |
-- |----------------|------------------------------------|---------------------------------------------|
-- | chairman_admin | macalisangchristina@gmail.com      | 9a727fde-53b7-4463-8c36-fa7614945a7a        |
-- | college_admin  | college.admin@opticore.local       | 7f77000a-bf51-43ed-b52e-a27a3e8add6c        |
-- | gec_chairman   | gec.chairman@opticore.local        | 41288bb4-7b5e-49d0-b02a-b8d20c2d701e        |
-- | doi_admin      | doi.admin@opticore.local           | 3424c55e-d871-47a3-8134-1d339717e7ca        |

alter table public."User" add column if not exists "chairmanProgramId" text references public."Program"(id) on delete set null;

insert into public."College" (id, code, name)
values
  ('col-tech-eng', 'CTE', 'College of Technology and Engineering')
on conflict (code) do nothing;

insert into public."AcademicPeriod" (id, name, semester, "academicYear", "isCurrent", "startDate", "endDate")
values
  ('ap-2025-2', '2nd Semester, AY 2025-2026', '2nd Semester', '2025-2026', true, '2025-11-01', '2026-03-31')
on conflict (id) do nothing;

-- Programs (COTE): BIT majors + BSIT + BSIE (codes unique)
insert into public."Program" (id, code, name, "collegeId")
values
  ('prog-bit-elx', 'BIT-ELX', 'Bachelor of Industrial Technology — Electronics Technology', 'col-tech-eng'),
  ('prog-bit-dt', 'BIT-DT', 'Bachelor of Industrial Technology — Drafting Technology', 'col-tech-eng'),
  ('prog-bit-auto', 'BIT-AUTO', 'Bachelor of Industrial Technology — Automotive Technology', 'col-tech-eng'),
  ('prog-bit-gar', 'BIT-GAR', 'Bachelor of Industrial Technology — Garments Technology', 'col-tech-eng'),
  ('prog-bsit', 'BSIT', 'Bachelor of Science in Information Technology', 'col-tech-eng'),
  ('prog-bsie', 'BSIE', 'Bachelor of Science in Industrial Engineering', 'col-tech-eng')
on conflict (code) do nothing;

-- Sections (sample blocks for scheduling / conflict tests)
insert into public."Section" (id, "programId", name, "yearLevel", "studentCount")
values
  ('sec-bit-elx-1a', 'prog-bit-elx', 'BIT Elex 1A', 1, 35),
  ('sec-bit-elx-2a', 'prog-bit-elx', 'BIT Elex 2A', 2, 33),
  ('sec-bit-dt-1a', 'prog-bit-dt', 'BIT Draft 1A', 1, 32),
  ('sec-bit-auto-1a', 'prog-bit-auto', 'BIT Auto 1A', 1, 36),
  ('sec-bit-auto-2a', 'prog-bit-auto', 'BIT Auto 2A', 2, 34),
  ('sec-bit-gar-1a', 'prog-bit-gar', 'BIT Gar 1A', 1, 30),
  ('sec-bsie-1a', 'prog-bsie', 'BSIE 1A', 1, 38),
  ('sec-bsit-1a', 'prog-bsit', 'BSIT-1A', 1, 40),
  ('sec-bsit-1b', 'prog-bsit', 'BSIT-1B', 1, 38),
  ('sec-bsit-1c', 'prog-bsit', 'BSIT-1C', 1, 39),
  ('sec-bsit-2a', 'prog-bsit', 'BSIT-2A', 2, 40),
  ('sec-bsit-2b', 'prog-bsit', 'BSIT-2B', 2, 42),
  ('sec-bsit-3a', 'prog-bsit', 'BSIT-3A', 3, 36),
  ('sec-bsit-3b', 'prog-bsit', 'BSIT-3B', 3, 35),
  ('sec-bsit-4a', 'prog-bsit', 'BSIT-4A', 4, 34),
  ('sec-bsit-4b', 'prog-bsit', 'BSIT-4B', 4, 33)
on conflict (id) do nothing;

-- Rooms (expanded for optimization / conflict scenarios)
insert into public."Room" (id, code, building, floor, capacity, type, "collegeId")
values
  ('room-201', 'Room 201', 'Building A', 2, 45, 'Lecture', 'col-tech-eng'),
  ('lab-301', 'Lab 301', 'Building B', 3, 40, 'Computer Lab', 'col-tech-eng'),
  ('room-elx-1', 'Elex Lab 1', 'Building C', 1, 35, 'Electronics Lab', 'col-tech-eng'),
  ('room-auto-shop', 'Auto Shop A', 'Building D', 1, 30, 'Shop', 'col-tech-eng'),
  ('room-draft-1', 'Drafting Lab 1', 'Building A', 1, 32, 'Drafting Lab', 'col-tech-eng'),
  ('room-gar-1', 'Garments Lab 1', 'Building E', 1, 28, 'Workshop', 'col-tech-eng'),
  ('room-bsie-lab', 'IE Lab', 'Building B', 2, 36, 'Laboratory', 'col-tech-eng'),
  ('room-it-lab-1', 'IT LAB 1', 'Building B', 2, 40, 'Computer Lab', 'col-tech-eng'),
  ('room-it-lab-2', 'IT LAB 2', 'Building B', 2, 40, 'Computer Lab', 'col-tech-eng'),
  ('room-it-lab-3', 'IT LAB 3', 'Building B', 3, 40, 'Computer Lab', 'col-tech-eng'),
  ('room-it-lab-4', 'IT LAB 4', 'Building B', 3, 40, 'Computer Lab', 'col-tech-eng')
on conflict (code) do nothing;

-- Subjects: `code` must be UNIQUE globally — use program-scoped codes where titles repeat.
insert into public."Subject" (id, code, subcode, title, "lecUnits", "lecHours", "labUnits", "labHours", "programId", "yearLevel")
values
  ('sub-elx-111', 'ElxTech-111', null, 'Electronic Devices, Instruments and Circuits', 3, 3, 12, 12, 'prog-bit-elx', 1),
  ('sub-elx-122', 'ElxTech-122', null, 'Electronics Communication Systems', 3, 3, 12, 12, 'prog-bit-elx', 1),
  ('sub-elx-213', 'ElxTech-213', null, 'Digital Applications and Embedded Systems', 3, 3, 12, 12, 'prog-bit-elx', 2),
  ('sub-elx-224', 'ElxTech-224', null, 'Industrial Automation', 3, 3, 12, 12, 'prog-bit-elx', 2),
  ('sub-draw-111-elx', 'Draw-111-ELX', null, 'Fundamentals of Technical Drawing and Sketching', 1, 0, 3, 3, 'prog-bit-elx', 1),
  ('sub-ast-111-elx', 'AST-111-ELX', null, 'Fundamentals of Electrical and Electronics', 3, 3, 0, 0, 'prog-bit-elx', 1),
  ('sub-dtech-111', 'DTech-111', null, 'Fundamentals of Mechanical Drafting with CAD', 3, 3, 12, 12, 'prog-bit-dt', 1),
  ('sub-dtech-122', 'DTech-122', null, 'Principles of Design, Furniture Design, and Theories of Architectural Drafting with CAD', 3, 3, 12, 12, 'prog-bit-dt', 1),
  ('sub-draw-111-dt', 'Draw-111-DT', null, 'Fundamentals of Technical Drawing and Sketching', 1, 0, 3, 3, 'prog-bit-dt', 1),
  ('sub-auto-111', 'AutoTech-111', null, 'Fundamentals of Automotive Technology', 3, 3, 12, 12, 'prog-bit-auto', 1),
  ('sub-auto-122', 'AutoTech-122', null, 'Chassis Unit and Related Electro-Mechanical Systems', 3, 3, 12, 12, 'prog-bit-auto', 1),
  ('sub-auto-213', 'AutoTech-213', null, 'Power Trains and Automatic Transmission Operation and Servicing', 3, 3, 12, 12, 'prog-bit-auto', 2),
  ('sub-draw-111-auto', 'Draw-111-AUTO', null, 'Fundamentals of Technical Drawing and Sketching', 1, 0, 3, 3, 'prog-bit-auto', 1),
  ('sub-gar-111', 'GarTech-111', null, 'Garments Construction 1', 3, 3, 12, 12, 'prog-bit-gar', 1),
  ('sub-gar-122', 'GarTech-122', null, 'Garments Construction 2', 3, 3, 12, 12, 'prog-bit-gar', 1),
  ('sub-draw-111-gar', 'Draw-111-GAR', null, 'Fundamentals of Technical Drawing and Sketching', 1, 0, 3, 3, 'prog-bit-gar', 1),
  ('sub-cc-111', 'CC-111', null, 'Introduction to Computing', 3, 3, 0, 0, 'prog-bsit', 1),
  ('sub-cc-112', 'CC-112', null, 'Computer Programming 1 (Lec)', 2, 2, 0, 0, 'prog-bsit', 1),
  ('sub-cc-112l', 'CC-112L', null, 'Computer Programming 1 (Lab)', 0, 0, 3, 9, 'prog-bsit', 1),
  ('sub-cc-214', 'CC-214', null, 'Data Structures and Algorithms (Lec)', 2, 2, 0, 0, 'prog-bsit', 2),
  ('sub-cc-214l', 'CC-214L', null, 'Data Structures and Algorithms (Lab)', 0, 0, 3, 9, 'prog-bsit', 2),
  ('sub-pc-224', 'PC-224', null, 'Networking 1', 3, 3, 0, 0, 'prog-bsit', 2),
  ('sub-ie-ipc-111', 'IE-IPC-111', null, 'Introduction to Engineering', 2, 1, 3, 3, 'prog-bsie', 1),
  ('sub-ie-tech-111', 'IE-TECH-111', null, 'Pneumatics and Programmable Logic Controller', 3, 0, 9, 9, 'prog-bsie', 1),
  ('sub-emath-111', 'EMATH-111', null, 'Calculus 1', 5, 5, 0, 0, 'prog-bsie', 1),
  ('sub-ie-pc-121', 'IE-PC-121', null, 'Statistical Analysis for Industrial Engineering 1', 3, 3, 0, 0, 'prog-bsie', 1),
  ('sub-gec-pc-bit', 'GEC-PC-BIT', null, 'Purposive Communication', 3, 3, 0, 0, 'prog-bit-elx', 1)
on conflict (id) do update set
  code = excluded.code,
  subcode = excluded.subcode,
  title = excluded.title,
  "lecUnits" = excluded."lecUnits",
  "lecHours" = excluded."lecHours",
  "labUnits" = excluded."labUnits",
  "labHours" = excluded."labHours",
  "programId" = excluded."programId",
  "yearLevel" = excluded."yearLevel";

-- BSIT full prospectus (remaining courses; core CC/PC rows above). CMO 25 s. 2015 — A.Y. 2023–2024.
insert into public."Subject" (id, code, subcode, title, "lecUnits", "lecHours", "labUnits", "labHours", "programId", "yearLevel")
values
  ('sub-bsit-gec-rph', 'GEC-RPH', null, 'Readings in Philippine History', 3, 3, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-gec-mmw', 'GEC-MMW', null, 'Mathematics in the Modern World', 3, 3, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-gee-tem', 'GEE-TEM', null, 'The Entrepreneurial Mind', 3, 3, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-ap-1', 'AP-1', null, 'Multimedia', 3, 3, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-pathfit-1', 'PATHFIT-1', null, 'Physical Activities Towards Health and Fitness 1', 2, 2, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-nstp-1', 'NSTP-1', null, 'National Service Training Program 1', 3, 3, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-gec-pc', 'GEC-PC', null, 'Purposive Communication', 3, 3, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-gec-sts', 'GEC-STS', null, 'Science, Technology and Society', 3, 3, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-gec-us', 'GEC-US', null, 'Understanding the Self', 3, 3, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-gee-gsps', 'GEE-GSPS', null, 'Gender and Society with Peace Studies', 3, 3, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-cc-123', 'CC-123', null, 'Computer Programming 2 (Lec)', 2, 2, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-cc-123l', 'CC-123L', null, 'Computer Programming 2 (Lab)', 0, 0, 3, 9, 'prog-bsit', 1),
  ('sub-bsit-pc-121', 'PC-121', null, 'Discrete Mathematics', 3, 3, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-ap-2', 'AP-2', null, 'Digital Logic Design', 3, 3, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-pathfit-2', 'PATHFIT-2', null, 'Physical Activities Towards Health and Fitness 2', 2, 2, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-nstp-2', 'NSTP-2', null, 'National Service Training Program 2', 3, 3, 0, 0, 'prog-bsit', 1),
  ('sub-bsit-gec-e', 'GEC-E', null, 'Ethics', 3, 3, 0, 0, 'prog-bsit', 2),
  ('sub-bsit-gee-es', 'GEE-ES', null, 'Environmental Science', 3, 3, 0, 0, 'prog-bsit', 2),
  ('sub-bsit-gec-lwr', 'GEC-LWR', null, 'Life and Works of Rizal', 3, 3, 0, 0, 'prog-bsit', 2),
  ('sub-bsit-pc-212', 'PC-212', null, 'Quantitative Methods (Modeling & Simulation)', 3, 3, 0, 0, 'prog-bsit', 2),
  ('sub-bsit-p-elec-1', 'P-ELEC-1', null, 'Object-Oriented Programming', 3, 3, 0, 0, 'prog-bsit', 2),
  ('sub-bsit-p-elec-2', 'P-ELEC-2', null, 'Web Systems and Technologies', 3, 3, 0, 0, 'prog-bsit', 2),
  ('sub-bsit-pathfit-3', 'PATHFIT-3', null, 'Physical Activities Towards Health and Fitness 3', 2, 2, 0, 0, 'prog-bsit', 2),
  ('sub-bsit-gec-tcw', 'GEC-TCW', null, 'The Contemporary World', 3, 3, 0, 0, 'prog-bsit', 2),
  ('sub-bsit-pc-223', 'PC-223', null, 'Integrative Programming and Technologies 1', 3, 3, 0, 0, 'prog-bsit', 2),
  ('sub-bsit-cc-225', 'CC-225', null, 'Information Management (Lec)', 2, 2, 0, 0, 'prog-bsit', 2),
  ('sub-bsit-cc-225l', 'CC-225L', null, 'Information Management (Lab)', 0, 0, 3, 9, 'prog-bsit', 2),
  ('sub-bsit-p-elec-3', 'P-ELEC-3', null, 'Platform Technologies', 3, 3, 0, 0, 'prog-bsit', 2),
  ('sub-bsit-ap-3', 'AP-3', null, 'ASP.NET', 3, 3, 0, 0, 'prog-bsit', 2),
  ('sub-bsit-pathfit-4', 'PATHFIT-4', null, 'Physical Activities Towards Health and Fitness 4', 2, 2, 0, 0, 'prog-bsit', 2),
  ('sub-bsit-gee-fe', 'GEE-FE', null, 'Functional English', 3, 3, 0, 0, 'prog-bsit', 3),
  ('sub-bsit-pc-315', 'PC-315', null, 'Networking 2 (Lec)', 2, 2, 0, 0, 'prog-bsit', 3),
  ('sub-bsit-pc-315l', 'PC-315L', null, 'Networking 2 (Lab)', 0, 0, 3, 9, 'prog-bsit', 3),
  ('sub-bsit-pc-316', 'PC-316', null, 'Systems Integration and Architecture 1', 3, 3, 0, 0, 'prog-bsit', 3),
  ('sub-bsit-pc-317', 'PC-317', null, 'Introduction to Human Computer Interaction', 3, 3, 0, 0, 'prog-bsit', 3),
  ('sub-bsit-pc-3180', 'PC-3180', null, 'Database Management Systems', 3, 3, 0, 0, 'prog-bsit', 3),
  ('sub-bsit-cc-316', 'CC-316', null, 'Applications Development and Emerging Technologies', 3, 3, 0, 0, 'prog-bsit', 3),
  ('sub-bsit-gec-aa', 'GEC-AA', null, 'Art Appreciation', 3, 3, 0, 0, 'prog-bsit', 3),
  ('sub-bsit-gee-pee', 'GEE-PEE', null, 'People and the Earth''s Ecosystems', 3, 3, 0, 0, 'prog-bsit', 3),
  ('sub-bsit-pc-329', 'PC-329', null, 'Capstone Project and Research 1', 3, 3, 0, 0, 'prog-bsit', 3),
  ('sub-bsit-pc-3210', 'PC-3210', null, 'Social and Professional Issues', 3, 3, 0, 0, 'prog-bsit', 3),
  ('sub-bsit-pc-3211', 'PC-3211', null, 'Information Assurance and Security 1 (Lec)', 2, 2, 0, 0, 'prog-bsit', 3),
  ('sub-bsit-pc-3211l', 'PC-3211L', null, 'Information Assurance and Security 1 (Lab)', 0, 0, 3, 9, 'prog-bsit', 3),
  ('sub-bsit-ap-4', 'AP-4', null, 'iOS Mobile Application Development', 3, 3, 0, 0, 'prog-bsit', 3),
  ('sub-bsit-ap-5', 'AP-5', null, 'Technology and the Application of the Internet of Things', 3, 3, 0, 0, 'prog-bsit', 3),
  ('sub-bsit-pc-4112', 'PC-4112', null, 'Information Assurance and Security 2 (Lec)', 2, 2, 0, 0, 'prog-bsit', 4),
  ('sub-bsit-pc-4112l', 'PC-4112L', null, 'Information Assurance and Security 2 (Lab)', 0, 0, 3, 9, 'prog-bsit', 4),
  ('sub-bsit-pc-4113', 'PC-4113', null, 'Systems Administration and Maintenance', 3, 3, 0, 0, 'prog-bsit', 4),
  ('sub-bsit-pc-4114', 'PC-4114', null, 'Capstone Project and Research 2', 3, 3, 0, 0, 'prog-bsit', 4),
  ('sub-bsit-p-elec-4', 'P-ELEC-4', null, 'Systems Integration and Architecture 2', 3, 3, 0, 0, 'prog-bsit', 4),
  ('sub-bsit-ap-6', 'AP-6', null, 'Cross-Platform Script Development Technology', 3, 3, 0, 0, 'prog-bsit', 4),
  ('sub-bsit-pc-4215', 'PC-4215', null, 'On-the-Job Training (OJT)', 0, 0, 9, 27, 'prog-bsit', 4)
on conflict (id) do update set
  code = excluded.code,
  subcode = excluded.subcode,
  title = excluded.title,
  "lecUnits" = excluded."lecUnits",
  "lecHours" = excluded."lecHours",
  "labUnits" = excluded."labUnits",
  "labHours" = excluded."labHours",
  "programId" = excluded."programId",
  "yearLevel" = excluded."yearLevel";

-- Four admin rows (id = auth.users.id from Supabase Authentication)
insert into public."User" (id, "employeeId", email, name, role, "collegeId", "chairmanProgramId")
values
  ('9a727fde-53b7-4463-8c36-fa7614945a7a', 'CTU-ARG-CHAIR', 'macalisangchristina@gmail.com', 'Justine Shene Cariman', 'chairman_admin', 'col-tech-eng', 'prog-bsit'),
  ('7f77000a-bf51-43ed-b52e-a27a3e8add6c', 'CTU-ARG-COLL', 'college.admin@opticore.local', 'Vilia Crestene M. Gelaga', 'college_admin', 'col-tech-eng', null),
  ('41288bb4-7b5e-49d0-b02a-b8d20c2d701e', 'CTU-ARG-GEC', 'gec.chairman@opticore.local', 'Christina Joan M. Gelbolingo', 'gec_chairman', 'col-tech-eng', null),
  ('3424c55e-d871-47a3-8134-1d339717e7ca', 'CTU-ARG-DOI', 'doi.admin@opticore.local', 'Dr. Maria Elena Reyes', 'doi_admin', null, null)
on conflict (id) do update set
  "employeeId" = excluded."employeeId",
  email = excluded.email,
  name = excluded.name,
  role = excluded.role,
  "collegeId" = excluded."collegeId",
  "chairmanProgramId" = excluded."chairmanProgramId";

-- CTU Argao: CAFE / BS Environmental Science + campus rooms (requires migration 20260501120000_* for semester, imagePath, SLJ columns).

insert into public."College" (id, code, name)
values ('col-cafe', 'CAFE', 'College of Agriculture, Forestry, & Environmental Science')
on conflict (code) do nothing;
insert into public."Program" (id, code, name, "collegeId") values ('prog-bs-envsci', 'BSENVS', 'Bachelor of Science in Environmental Science', 'col-cafe') on conflict (code) do nothing;
insert into public."Section" (id, "programId", name, "yearLevel", "studentCount") values ('sec-bsenvs-1a', 'prog-bs-envsci', 'BSENVS-1A', 1, 32) on conflict (id) do nothing;
insert into public."Section" (id, "programId", name, "yearLevel", "studentCount") values ('sec-bsenvs-1b', 'prog-bs-envsci', 'BSENVS-1B', 1, 32) on conflict (id) do nothing;
insert into public."Section" (id, "programId", name, "yearLevel", "studentCount") values ('sec-bsenvs-2a', 'prog-bs-envsci', 'BSENVS-2A', 2, 32) on conflict (id) do nothing;
insert into public."Section" (id, "programId", name, "yearLevel", "studentCount") values ('sec-bsenvs-2b', 'prog-bs-envsci', 'BSENVS-2B', 2, 32) on conflict (id) do nothing;
insert into public."Section" (id, "programId", name, "yearLevel", "studentCount") values ('sec-bsenvs-3a', 'prog-bs-envsci', 'BSENVS-3A', 3, 32) on conflict (id) do nothing;
insert into public."Section" (id, "programId", name, "yearLevel", "studentCount") values ('sec-bsenvs-4a', 'prog-bs-envsci', 'BSENVS-4A', 4, 32) on conflict (id) do nothing;
insert into public."Subject" (id, code, subcode, title, "lecUnits", "lecHours", "labUnits", "labHours", "programId", "yearLevel", semester) values
  ('sub-bsenvs-encsc111', 'BSENVS-ENCSC111', null, 'Inorganic Chemistry (Lec)', 3, 3, 0, 0, 'prog-bs-envsci', 1, 1),
  ('sub-bsenvs-encsc111l', 'BSENVS-ENCSC111L', null, 'Inorganic Chemistry (Lab)', 2, 0, 0, 6, 'prog-bs-envsci', 1, 1),
  ('sub-bsenvs-gec-mmw', 'BSENVS-GEC-MMW', null, 'Mathematics in the Modern World', 3, 3, 0, 0, 'prog-bs-envsci', 1, 1),
  ('sub-bsenvs-gec-us', 'BSENVS-GEC-US', null, 'Understanding the Self', 3, 3, 0, 0, 'prog-bs-envsci', 1, 1),
  ('sub-bsenvs-gec-pc', 'BSENVS-GEC-PC', null, 'Purposive Communication', 3, 3, 0, 0, 'prog-bs-envsci', 1, 1),
  ('sub-bsenvs-gec-rph', 'BSENVS-GEC-RPH', null, 'Readings in Philippine History', 3, 3, 0, 0, 'prog-bs-envsci', 1, 1),
  ('sub-bsenvs-pathfit-1', 'BSENVS-PATHFIT-1', null, 'Physical Activities Towards Health and Fitness 1', 2, 2, 0, 0, 'prog-bs-envsci', 1, 1),
  ('sub-bsenvs-nstp-1', 'BSENVS-NSTP-1', null, 'National Service Training Program 1', 3, 3, 0, 0, 'prog-bs-envsci', 1, 1),
  ('sub-bsenvs-encsc122', 'BSENVS-ENCSC122', null, 'Organic Chemistry (Lec)', 3, 3, 0, 0, 'prog-bs-envsci', 1, 2),
  ('sub-bsenvs-encsc122l', 'BSENVS-ENCSC122L', null, 'Organic Chemistry (Lab)', 2, 0, 0, 6, 'prog-bs-envsci', 1, 2),
  ('sub-bsenvs-encsm123', 'BSENVS-ENCSM123', null, 'College Algebra', 3, 3, 0, 0, 'prog-bs-envsci', 1, 2),
  ('sub-bsenvs-gec-sts', 'BSENVS-GEC-STS', null, 'Science, Technology and Society', 3, 3, 0, 0, 'prog-bs-envsci', 1, 2),
  ('sub-bsenvs-gec-aa', 'BSENVS-GEC-AA', null, 'Art Appreciation', 3, 3, 0, 0, 'prog-bs-envsci', 1, 2),
  ('sub-bsenvs-gec-lie', 'BSENVS-GEC-LIE', null, 'Living in the IT Era', 3, 3, 0, 0, 'prog-bs-envsci', 1, 2),
  ('sub-bsenvs-gec-tcw', 'BSENVS-GEC-TCW', null, 'The Contemporary World', 3, 3, 0, 0, 'prog-bs-envsci', 1, 2),
  ('sub-bsenvs-pathfit-2', 'BSENVS-PATHFIT-2', null, 'Physical Activities Towards Health and Fitness 2', 2, 2, 0, 0, 'prog-bs-envsci', 1, 2),
  ('sub-bsenvs-nstp-2', 'BSENVS-NSTP-2', null, 'National Service Training Program 2', 3, 3, 0, 0, 'prog-bs-envsci', 1, 2),
  ('sub-bsenvs-encsc214', 'BSENVS-ENCSC214', null, 'Analytical Chemistry (Lec)', 3, 3, 0, 0, 'prog-bs-envsci', 2, 1),
  ('sub-bsenvs-encsc214l', 'BSENVS-ENCSC214L', null, 'Analytical Chemistry (Lab)', 2, 0, 0, 6, 'prog-bs-envsci', 2, 1),
  ('sub-bsenvs-encsm215', 'BSENVS-ENCSM215', null, 'Trigonometry', 3, 3, 0, 0, 'prog-bs-envsci', 2, 1),
  ('sub-bsenvs-gec-e', 'BSENVS-GEC-E', null, 'Ethics', 3, 3, 0, 0, 'prog-bs-envsci', 2, 1),
  ('sub-bsenvs-gee-pic', 'BSENVS-GEE-PIC', null, 'Philippine Indigenous Communities', 3, 3, 0, 0, 'prog-bs-envsci', 2, 1),
  ('sub-bsenvs-gee-gsps', 'BSENVS-GEE-GSPS', null, 'Gender & Society with Peace Studies', 3, 3, 0, 0, 'prog-bs-envsci', 2, 1),
  ('sub-bsenvs-gec-lwr', 'BSENVS-GEC-LWR', null, 'Life and Works of Rizal', 3, 3, 0, 0, 'prog-bs-envsci', 2, 1),
  ('sub-bsenvs-pathfit-3', 'BSENVS-PATHFIT-3', null, 'Physical Activities Towards Health and Fitness 3', 2, 2, 0, 0, 'prog-bs-envsci', 2, 1),
  ('sub-bsenvs-encsb227', 'BSENVS-ENCSB227', null, 'General Biology (Lec)', 3, 3, 0, 0, 'prog-bs-envsci', 2, 2),
  ('sub-bsenvs-encsb227l', 'BSENVS-ENCSB227L', null, 'General Biology (Lab)', 2, 0, 0, 6, 'prog-bs-envsci', 2, 2),
  ('sub-bsenvs-encsm228', 'BSENVS-ENCSM228', null, 'Calculus', 3, 3, 0, 0, 'prog-bs-envsci', 2, 2),
  ('sub-bsenvs-encse229', 'BSENVS-ENCSE229', null, 'Geology and Soil Science', 3, 3, 0, 0, 'prog-bs-envsci', 2, 2),
  ('sub-bsenvs-encsp2210', 'BSENVS-ENCSP2210', null, 'Mechanics and Thermodynamics (Lec)', 3, 3, 0, 0, 'prog-bs-envsci', 2, 2),
  ('sub-bsenvs-encsp2210l', 'BSENVS-ENCSP2210L', null, 'Mechanics and Thermodynamics (Lab)', 2, 0, 0, 6, 'prog-bs-envsci', 2, 2),
  ('sub-bsenvs-enm221', 'BSENVS-ENM221', null, 'Waste Management', 3, 3, 0, 0, 'prog-bs-envsci', 2, 2),
  ('sub-bsenvs-gee-pee', 'BSENVS-GEE-PEE', null, 'People and the Earth''s Ecosystem', 3, 3, 0, 0, 'prog-bs-envsci', 2, 2),
  ('sub-bsenvs-pathfit-4', 'BSENVS-PATHFIT-4', null, 'Physical Activities Towards Health and Fitness 4', 2, 2, 0, 0, 'prog-bs-envsci', 2, 2),
  ('sub-bsenvs-encsb3111', 'BSENVS-ENCSB3111', null, 'Genetics (Lec)', 3, 3, 0, 0, 'prog-bs-envsci', 3, 1),
  ('sub-bsenvs-encsb3111l', 'BSENVS-ENCSB3111L', null, 'Genetics (Lab)', 2, 0, 0, 6, 'prog-bs-envsci', 3, 1),
  ('sub-bsenvs-encsm3112', 'BSENVS-ENCSM3112', null, 'Environmental Statistics (Lec)', 2, 2, 0, 0, 'prog-bs-envsci', 3, 1),
  ('sub-bsenvs-encsm3112l', 'BSENVS-ENCSM3112L', null, 'Environmental Statistics (Lab)', 1, 0, 0, 3, 'prog-bs-envsci', 3, 1),
  ('sub-bsenvs-encse3113', 'BSENVS-ENCSE3113', null, 'Freshwater Resources Management (Lec)', 2, 2, 0, 0, 'prog-bs-envsci', 3, 1),
  ('sub-bsenvs-encse3113l', 'BSENVS-ENCSE3113L', null, 'Freshwater Resources Management (Lab)', 1, 0, 0, 3, 'prog-bs-envsci', 3, 1),
  ('sub-bsenvs-ens312', 'BSENVS-ENS312', null, 'Biodiversity Conservation (Lec)', 2, 2, 0, 0, 'prog-bs-envsci', 3, 1),
  ('sub-bsenvs-ens312l', 'BSENVS-ENS312L', null, 'Biodiversity Conservation (Lab)', 1, 0, 0, 3, 'prog-bs-envsci', 3, 1),
  ('sub-bsenvs-ens313', 'BSENVS-ENS313', null, 'Soil and Water Conservation (Lec)', 2, 2, 0, 0, 'prog-bs-envsci', 3, 1),
  ('sub-bsenvs-ens313l', 'BSENVS-ENS313L', null, 'Soil and Water Conservation (Lab)', 1, 0, 0, 3, 'prog-bs-envsci', 3, 1),
  ('sub-bsenvs-encsb3214', 'BSENVS-ENCSB3214', null, 'General Ecology (Lec)', 3, 3, 0, 0, 'prog-bs-envsci', 3, 2),
  ('sub-bsenvs-encsb3214l', 'BSENVS-ENCSB3214L', null, 'General Ecology (Lab)', 2, 0, 0, 6, 'prog-bs-envsci', 3, 2),
  ('sub-bsenvs-enm323', 'BSENVS-ENM323', null, 'Watershed Management (Lec)', 2, 2, 0, 0, 'prog-bs-envsci', 3, 2),
  ('sub-bsenvs-enm323l', 'BSENVS-ENM323L', null, 'Watershed Management (Lab)', 1, 0, 0, 3, 'prog-bs-envsci', 3, 2),
  ('sub-bsenvs-enm324', 'BSENVS-ENM324', null, 'Coastal and Marine Management (Lec)', 2, 2, 0, 0, 'prog-bs-envsci', 3, 2),
  ('sub-bsenvs-enm324l', 'BSENVS-ENM324L', null, 'Coastal and Marine Management (Lab)', 1, 0, 0, 3, 'prog-bs-envsci', 3, 2),
  ('sub-bsenvs-ens315', 'BSENVS-ENS315', null, 'Environmental Chemistry (Lec)', 2, 2, 0, 0, 'prog-bs-envsci', 3, 2),
  ('sub-bsenvs-ens315l', 'BSENVS-ENS315L', null, 'Environmental Chemistry (Lab)', 1, 0, 0, 3, 'prog-bs-envsci', 3, 2),
  ('sub-bsenvs-ens316', 'BSENVS-ENS316', null, 'Research Methods with GIS', 3, 3, 0, 0, 'prog-bs-envsci', 3, 2),
  ('sub-bsenvs-eia', 'BSENVS-EIA', null, 'The EIA System (Lec)', 2, 2, 0, 0, 'prog-bs-envsci', 4, 1),
  ('sub-bsenvs-eial', 'BSENVS-EIAL', null, 'The EIA System (Lab)', 1, 0, 0, 3, 'prog-bs-envsci', 4, 1),
  ('sub-bsenvs-enm415', 'BSENVS-ENM415', null, 'Environmental Auditing (Lec)', 2, 2, 0, 0, 'prog-bs-envsci', 4, 1),
  ('sub-bsenvs-enm415l', 'BSENVS-ENM415L', null, 'Environmental Auditing (Lab)', 1, 0, 0, 3, 'prog-bs-envsci', 4, 1),
  ('sub-bsenvs-thesis1', 'BSENVS-THESIS1', null, 'Thesis Proposal', 3, 3, 0, 0, 'prog-bs-envsci', 4, 1),
  ('sub-bsenvs-ens428', 'BSENVS-ENS428', null, 'Environmental Monitoring (Lec)', 3, 3, 0, 0, 'prog-bs-envsci', 4, 2),
  ('sub-bsenvs-ens428l', 'BSENVS-ENS428L', null, 'Environmental Monitoring (Lab)', 2, 0, 0, 6, 'prog-bs-envsci', 4, 2),
  ('sub-bsenvs-thesis2', 'BSENVS-THESIS2', null, 'Thesis Writing 2', 3, 3, 0, 0, 'prog-bs-envsci', 4, 2)
on conflict (code) do update set title = excluded.title, "lecUnits" = excluded."lecUnits", "lecHours" = excluded."lecHours", "labUnits" = excluded."labUnits", "labHours" = excluded."labHours", "programId" = excluded."programId", "yearLevel" = excluded."yearLevel", semester = excluded.semester;
-- CTU Argao campus navigation: buildings as Room.building + imagePath (place under public/campus/navigation/).
-- collegeId is null so all colleges can schedule; chairman RLS still allows SELECT campus-wide.

insert into public."Room" (id, code, building, floor, capacity, type, "collegeId", "imagePath", "displayName")
values
  ('room-ssf-01', 'Room 01', 'Shared Service Facility for Handbloom Weaving', 1, 20, 'Showroom', null, 'campus/navigation/ShowRoom.HEIC', 'Show Room'),
  ('room-ssf-02', 'Room 02', 'Shared Service Facility for Handbloom Weaving', 1, 15, 'Workshop', null, 'campus/navigation/Embroidery.HEIC', 'Embroidery'),
  ('room-ssf-03', 'Room 03', 'Shared Service Facility for Handbloom Weaving', 2, 24, 'Conference', null, 'campus/navigation/ConferenceRoom.HEIC', 'Conference Room'),
  ('room-ssf-04', 'Room 04', 'Shared Service Facility for Handbloom Weaving', 2, 20, 'Workshop', null, 'campus/navigation/IMG_4473.HEIC', 'Garments Room'),
  ('room-ssf-05', 'Room 05', 'Shared Service Facility for Handbloom Weaving', 2, 12, 'Storage', null, 'campus/navigation/ThreadRoom.HEIC', 'Thread Room'),
  ('room-ssf-06', 'Room 06', 'Shared Service Facility for Handbloom Weaving', 3, 20, 'Studio', null, 'campus/navigation/StudioRoom.HEIC', 'Studio Room'),
  ('room-ssf-07', 'Room 07', 'Shared Service Facility for Handbloom Weaving', 3, 18, 'Laboratory', null, 'campus/navigation/FoodLab.HEIC', 'Food Laboratory'),
  ('room-mini-01', 'Mini Hotel 101', 'Mini Hotel', 1, 10, 'Facility', null, 'campus/navigation/MiniHotel.HEIC', null),
  ('room-mini-02', 'Mini Hotel 201', 'Mini Hotel', 2, 10, 'Facility', null, 'campus/navigation/MiniHotel.HEIC', null),
  ('room-hm-dept', 'HM Department', 'HM Department', 1, 30, 'Office', null, 'campus/navigation/HMDepartment.HEIC', null),
  ('room-chapel-01', 'Chapel', 'Chapel', 1, 200, 'Chapel', null, 'campus/navigation/Chapel.HEIC', null),
  ('room-cote-101', 'COTE 101', 'COTE Building', 1, 8, 'Office', null, 'campus/navigation/COTEDean''sOffice.HEIC', 'COTE Dean''s Office'),
  ('room-cote-102', 'COTE 102', 'COTE Building', 1, 24, 'Laboratory', null, 'campus/navigation/FABLab.HEIC', 'FAB Lab'),
  ('room-cote-103', 'COTE 103', 'COTE Building', 1, 24, 'Laboratory', null, 'campus/navigation/W.S.M.&ErgonomicsLab.HEIC', 'W.S.M. & Ergonomics Lab'),
  ('room-cote-104', 'COTE 104', 'COTE Building', 1, 24, 'Laboratory', null, 'campus/navigation/GTLab2.HEIC', 'GT Lab 2'),
  ('room-cote-105', 'COTE 105', 'COTE Building', 1, 24, 'Laboratory', null, 'campus/navigation/GTLab1.HEIC', 'GT Lab 1'),
  ('room-cote-201', 'COTE 201', 'COTE Building', 2, 12, 'Office', null, 'campus/navigation/BITFacultyRoom.HEIC', 'BIT Faculty Office'),
  ('room-cote-202', 'COTE 202', 'COTE Building', 2, 24, 'Laboratory', null, 'campus/navigation/ETLab1.HEIC', 'ET Lab 01 Automation Lab'),
  ('room-cote-203', 'COTE 203', 'COTE Building', 2, 24, 'Laboratory', null, 'campus/navigation/ETLab2.HEIC', 'ET Lab 02'),
  ('room-cote-204', 'COTE 204', 'COTE Building', 2, 24, 'Laboratory', null, 'campus/navigation/ETLab3.HEIC', 'ET Lab 03 Digital Communication Lab'),
  ('room-cote-205', 'COTE 205', 'COTE Building', 2, 24, 'Laboratory', null, 'campus/navigation/DTLab1.HEIC', 'DT Lab 01 (CAD)'),
  ('room-cote-206', 'COTE 206', 'COTE Building', 2, 24, 'Laboratory', null, 'campus/navigation/DTLab2.HEIC', 'DT Lab 02'),
  ('room-cote-207', 'COTE 207', 'COTE Building', 2, 24, 'Laboratory', null, 'campus/navigation/DTLab3.HEIC', 'DT Lab 03'),
  ('room-cote-301', 'COTE 301', 'COTE Building', 3, 12, 'Office', null, 'campus/navigation/BSITFaculty.HEIC', 'BSIT Faculty Office'),
  ('room-cote-302', 'COTE 302', 'COTE Building', 3, 40, 'Computer Lab', null, 'campus/navigation/ITLab4.HEIC', 'IT Lab 04'),
  ('room-cote-303', 'COTE 303', 'COTE Building', 3, 40, 'Computer Lab', null, 'campus/navigation/ITLab3.HEIC', 'IT Lab 03'),
  ('room-cote-304', 'COTE 304', 'COTE Building', 3, 40, 'Computer Lab', null, 'campus/navigation/IT Lab2.HEIC', 'IT Lab 02'),
  ('room-cote-305', 'COTE 305', 'COTE Building', 3, 40, 'Computer Lab', null, 'campus/navigation/ITLab1.HEIC', 'IT Lab 01'),
  ('room-cote-306', 'COTE 306', 'COTE Building', 3, 30, 'Laboratory', null, 'campus/navigation/CTLab2.HEIC', 'CT Lab 02'),
  ('room-cote-307', 'COTE 307', 'COTE Building', 3, 30, 'Laboratory', null, 'campus/navigation/CTLab1.HEIC', 'CT Lab 01'),
  ('room-cote-401', 'COTE 401', 'COTE Building', 4, 12, 'Office', null, 'campus/navigation/CAFEFaculty.HEIC', 'CAFE Faculty'),
  ('room-cote-402', 'COTE 402', 'COTE Building', 4, 24, 'Laboratory', null, 'campus/navigation/Forestry.HEIC', 'Forestry Lab 1'),
  ('room-cote-403', 'COTE 403', 'COTE Building', 4, 24, 'Laboratory', null, 'campus/navigation/Forestry.HEIC', 'Forestry Lab 2'),
  ('room-cote-404', 'COTE 404', 'COTE Building', 4, 24, 'Laboratory', null, 'campus/navigation/ForestryLab3.HEIC', 'Forestry Lab 3'),
  ('room-cote-405', 'COTE 405', 'COTE Building', 4, 24, 'Laboratory', null, 'campus/navigation/Forestry.HEIC', 'Forestry Lab 4'),
  ('room-cote-406', 'COTE 406', 'COTE Building', 4, 30, 'Laboratory', null, 'campus/navigation/CTLab4.HEIC', 'CT Lab 04'),
  ('room-cote-407', 'COTE 407', 'COTE Building', 4, 30, 'Laboratory', null, 'campus/navigation/CTLab3.HEIC', 'CT Lab 03'),
  ('room-coed-101', 'Room 101', 'COED Building', 1, 30, 'Office', null, 'campus/navigation/AccreditationRoom.HEIC', 'Accreditation Room'),
  ('room-coed-102', 'Room 102', 'COED Building', 1, 30, 'Laboratory', null, 'campus/navigation/COEDLab1.HEIC', 'COED Lab 1'),
  ('room-coed-103', 'Room 103', 'COED Building', 1, 30, 'Laboratory', null, 'campus/navigation/COEDLab2.HEIC', 'COED Lab 2'),
  ('room-coed-104', 'Room 104', 'COED Building', 1, 30, 'Laboratory', null, 'campus/navigation/COEDLab3.HEIC', 'COED Lab 3'),
  ('room-coed-200', 'Room 200', 'COED Building', 2, 8, 'Office', null, 'campus/navigation/TempFacultyRoom.HEIC', 'Temp Faculty Room'),
  ('room-coed-201', 'Room 201', 'COED Building', 2, 40, 'Lecture', null, 'campus/navigation/2ndFloor.HEIC', null),
  ('room-coed-300', 'Room 300', 'COED Building', 3, 12, 'Office', null, 'campus/navigation/EDUCFaculty.HEIC', 'EDUC Faculty'),
  ('room-coed-400', 'Room 400', 'COED Building', 4, 12, 'Office', null, 'campus/navigation/CASBAELFaculty.HEIC', 'CAS / BAEL Faculty Room'),
  ('room-ab-01', 'AB 01', 'Admin Building', 1, 6, 'Office', null, 'campus/navigation/Cashier''sOffice.JPG', 'Cashier Office'),
  ('room-ab-02', 'AB 02', 'Admin Building', 1, 8, 'Office', null, 'campus/navigation/Accounting&BudgetOffice.JPG', 'Accounting and Budget Office'),
  ('room-ab-04', 'AB 04', 'Admin Building', 1, 10, 'Office', null, 'campus/navigation/Registrar.JPG', 'Registrar'),
  ('room-ab-05', 'AB 05', 'Admin Building', 1, 8, 'Office', null, 'campus/navigation/MISOffice.JPG', 'MIS Office'),
  ('room-ab-07', 'AB 07', 'Admin Building', 2, 8, 'Office', null, 'campus/navigation/HRMO.JPG', 'HRMO'),
  ('room-ab-08', 'AB 08', 'Admin Building', 2, 8, 'Office', null, 'campus/navigation/DOI.JPG', 'Procurement / DOI Office'),
  ('room-st-201', 'ST 201', 'Science and Technology Building', 2, 30, 'Laboratory', null, 'campus/navigation/ST201.JPG', 'LAB ST 201 Biology'),
  ('room-st-202', 'ST 202', 'Science and Technology Building', 2, 30, 'Laboratory', null, 'campus/navigation/ST202.JPG', 'LAB ST 202 Chemistry'),
  ('room-st-203', 'ST 203', 'Science and Technology Building', 2, 30, 'Laboratory', null, 'campus/navigation/ST203.JPG', 'LAB ST 203 Physics'),
  ('room-ag-ca1', 'Room CA 1', 'Agriculture Building', 1, 40, 'Lecture', null, 'campus/navigation/CA-1.JPG', null),
  ('room-ag-ca2', 'Room CA 2', 'Agriculture Building', 1, 40, 'Lecture', null, 'campus/navigation/CA2(CropProtectionClassroom).JPG', 'CA 2 Crop Protection'),
  ('room-lib-01', 'Library L1', 'Library', 1, 80, 'Library', null, 'campus/navigation/Library1.JPG', null),
  ('room-acad-01', 'ACAD 01', 'ACAD Bldg. Pres. Diosdado Macapagal Academic', 1, 50, 'Lecture', null, 'campus/navigation/ACAD.JPG', null),
  ('room-bio-01', 'Biodiversity 101', 'Biodiversity', 1, 30, 'Laboratory', null, 'campus/navigation/Biodiversity.HEIC', null)
on conflict (code) do update set
  building = excluded.building,
  floor = excluded.floor,
  capacity = excluded.capacity,
  type = excluded.type,
  "collegeId" = excluded."collegeId",
  "imagePath" = excluded."imagePath",
  "displayName" = excluded."displayName";
