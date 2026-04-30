-- Faculty Profile: store advisory (assigned section) on the profile row.
-- This enables consistent display across Evaluator and INS views.

alter table public."FacultyProfile"
  add column if not exists "advisorySectionId" text references public."Section"(id) on delete set null;

