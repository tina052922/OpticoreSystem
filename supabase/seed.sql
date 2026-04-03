-- OptiCore sample data — COTE prospectus-inspired (example only; not official / final curriculum).
-- Exactly ONE public."User" per role (chairman_admin, college_admin, cas_admin, gec_chairman, doi_admin, instructor, student, visitor).
--
-- AUTH: public."User".id MUST equal auth.users.id (same UUID as Supabase Authentication → Users).
--
-- If you see ERROR 23514 on cas_admin: your DB had an old User.role CHECK without cas_admin.
-- Run the block at the END of schema.sql (User_role_check refresh), or run upgrade_add_cas_admin_role.sql, then re-run this seed.
--
-- IDs below match Supabase Auth UIDs (Dashboard). Chairman + visitor use the two Gmail accounts shown there;
-- the six @opticore.local accounts use their Auth UIDs.
--
-- PASSWORD: set in Supabase Auth when you created each user (seed_auth.sql used OptiCore2026! if you ran it instead).
--
-- | Role           | Email                              | User.id (UUID)                              |
-- |----------------|------------------------------------|---------------------------------------------|
-- | chairman_admin | macalisangchristina@gmail.com      | 9a727fde-53b7-4463-8c36-fa7614945a7a        |
-- | college_admin  | college.admin@opticore.local       | 7f77000a-bf51-43ed-b52e-a27a3e8add6c        |
-- | cas_admin      | cas.admin@opticore.local           | c35393fb-940c-455d-8809-9bafdab7f103        |
-- | gec_chairman   | gec.chairman@opticore.local        | 41288bb4-7b5e-49d0-b02a-b8d20c2d701e        |
-- | doi_admin      | doi.admin@opticore.local           | 3424c55e-d871-47a3-8134-1d339717e7ca        |
-- | instructor     | instructor@opticore.local          | 2913ec86-b6c3-4663-a969-1557c46835bd        |
-- | student        | student@opticore.local             | 225962fc-8cc1-41d7-8378-cb36ef1aed14        |
-- | visitor        | galbolingachristina2229@gmail.com  | d2b1447e-a32b-4c30-9c96-b765700f12c0        |

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

-- One row per role (id = auth.users.id from Supabase Authentication)
insert into public."User" (id, "employeeId", email, name, role, "collegeId", "chairmanProgramId")
values
  ('9a727fde-53b7-4463-8c36-fa7614945a7a', 'CTU-ARG-CHAIR', 'macalisangchristina@gmail.com', 'Justine Shene Cariman', 'chairman_admin', 'col-tech-eng', 'prog-bsit'),
  ('7f77000a-bf51-43ed-b52e-a27a3e8add6c', 'CTU-ARG-COLL', 'college.admin@opticore.local', 'Vilia Crestene M. Gelaga', 'college_admin', 'col-tech-eng', null),
  ('c35393fb-940c-455d-8809-9bafdab7f103', 'CTU-ARG-CAS', 'cas.admin@opticore.local', 'Carla Primitiva C. Pontanan', 'cas_admin', 'col-tech-eng', null),
  ('41288bb4-7b5e-49d0-b02a-b8d20c2d701e', 'CTU-ARG-GEC', 'gec.chairman@opticore.local', 'Christina Joan M. Gelbolingo', 'gec_chairman', 'col-tech-eng', null),
  ('3424c55e-d871-47a3-8134-1d339717e7ca', 'CTU-ARG-DOI', 'doi.admin@opticore.local', 'Dr. Maria Elena Reyes', 'doi_admin', null, null),
  ('2913ec86-b6c3-4663-a969-1557c46835bd', 'CTU-ARG-FAC', 'instructor@opticore.local', 'Prof. Ramon Santos', 'instructor', 'col-tech-eng', null),
  ('225962fc-8cc1-41d7-8378-cb36ef1aed14', null, 'student@opticore.local', 'John Michael Reyes', 'student', 'col-tech-eng', null),
  ('d2b1447e-a32b-4c30-9c96-b765700f12c0', null, 'galbolingachristina2229@gmail.com', 'Campus Visitor (demo)', 'visitor', null, null)
on conflict (id) do update set
  "employeeId" = excluded."employeeId",
  email = excluded.email,
  name = excluded.name,
  role = excluded.role,
  "collegeId" = excluded."collegeId",
  "chairmanProgramId" = excluded."chairmanProgramId";

insert into public."FacultyProfile" (id, "userId", "fullName", aka, "bsDegree", status, designation, "ratePerHour")
values
  ('fp-inst-1', '2913ec86-b6c3-4663-a969-1557c46835bd', 'Prof. Ramon Santos', 'Ramon', 'BS Information Technology', 'Organic', 'Instructor I', 250)
on conflict ("userId") do update set
  "fullName" = excluded."fullName",
  aka = excluded.aka,
  "bsDegree" = excluded."bsDegree",
  status = excluded.status,
  designation = excluded.designation,
  "ratePerHour" = excluded."ratePerHour";

insert into public."StudentProfile" (id, "userId", "programId", "sectionId", "yearLevel")
values
  ('sp-stu-1', '225962fc-8cc1-41d7-8378-cb36ef1aed14', 'prog-bsit', 'sec-bsit-2a', 2)
on conflict ("userId") do update set
  "programId" = excluded."programId",
  "sectionId" = excluded."sectionId",
  "yearLevel" = excluded."yearLevel";

-- Schedule entries: single instructor (006); demos conflicts + overload justification
insert into public."ScheduleEntry" (id, "academicPeriodId", "subjectId", "instructorId", "sectionId", "roomId", day, "startTime", "endTime", status)
values
  ('sch-1', 'ap-2025-2', 'sub-pc-224', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2a', 'room-it-lab-1', 'Monday', '07:00', '09:00', 'draft'),
  ('sch-2', 'ap-2025-2', 'sub-cc-111', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2b', 'room-201', 'Tuesday', '09:00', '11:00', 'draft'),
  ('sch-3', 'ap-2025-2', 'sub-elx-111', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bit-elx-1a', 'room-elx-1', 'Monday', '07:00', '09:00', 'draft'),
  ('sch-4', 'ap-2025-2', 'sub-auto-111', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bit-auto-1a', 'room-elx-1', 'Monday', '07:00', '09:00', 'conflicted'),
  ('sch-5', 'ap-2025-2', 'sub-cc-214', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2b', 'lab-301', 'Monday', '07:00', '09:00', 'conflicted'),
  ('sch-6', 'ap-2025-2', 'sub-ie-tech-111', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsie-1a', 'room-bsie-lab', 'Wednesday', '13:00', '15:00', 'draft'),
  ('sch-7', 'ap-2025-2', 'sub-dtech-111', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bit-dt-1a', 'room-draft-1', 'Thursday', '09:00', '11:00', 'draft'),
  ('sch-8', 'ap-2025-2', 'sub-cc-112', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2a', 'room-201', 'Wednesday', '07:00', '09:00', 'draft'),
  ('sch-9', 'ap-2025-2', 'sub-bsit-gec-pc', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2a', 'lab-301', 'Wednesday', '09:00', '11:00', 'draft'),
  ('sch-10', 'ap-2025-2', 'sub-cc-111', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2a', 'room-201', 'Wednesday', '13:00', '15:00', 'draft'),
  ('sch-11', 'ap-2025-2', 'sub-cc-112', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2a', 'lab-301', 'Thursday', '07:00', '09:00', 'draft'),
  ('sch-12', 'ap-2025-2', 'sub-bsit-gec-pc', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2a', 'room-201', 'Thursday', '09:00', '11:00', 'draft'),
  ('sch-13', 'ap-2025-2', 'sub-cc-111', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2a', 'lab-301', 'Thursday', '13:00', '15:00', 'draft'),
  ('sch-14', 'ap-2025-2', 'sub-cc-112', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2a', 'room-201', 'Friday', '07:00', '09:00', 'draft'),
  ('sch-15', 'ap-2025-2', 'sub-bsit-gec-pc', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2a', 'lab-301', 'Friday', '09:00', '11:00', 'draft'),
  ('sch-16', 'ap-2025-2', 'sub-cc-111', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2a', 'room-201', 'Friday', '13:00', '15:00', 'draft'),
  ('sch-17', 'ap-2025-2', 'sub-cc-112', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2a', 'lab-301', 'Saturday', '07:00', '09:00', 'draft'),
  ('sch-18', 'ap-2025-2', 'sub-bsit-gec-pc', '2913ec86-b6c3-4663-a969-1557c46835bd', 'sec-bsit-2a', 'room-201', 'Saturday', '09:00', '11:00', 'draft')
on conflict (id) do nothing;

insert into public."ScheduleLoadJustification" (id, "academicPeriodId", "collegeId", "authorUserId", "authorName", "authorEmail", justification, "violationsSnapshot")
values
  (
    'slj-demo-1',
    'ap-2025-2',
    'col-tech-eng',
    '9a727fde-53b7-4463-8c36-fa7614945a7a',
    'Justine Shene Cariman',
    'macalisangchristina@gmail.com',
    'Example: shortage of qualified faculty this term; consolidated sections; overload approved in principle pending VPAA signature.',
    '{"summary":"Prof. Ramon Santos: weekly contact exceeds standard 24h (demo seed)."}'::jsonb
  )
on conflict ("academicPeriodId", "collegeId") do update set
  "authorUserId" = excluded."authorUserId",
  "authorName" = excluded."authorName",
  "authorEmail" = excluded."authorEmail",
  justification = excluded.justification,
  "violationsSnapshot" = excluded."violationsSnapshot";
