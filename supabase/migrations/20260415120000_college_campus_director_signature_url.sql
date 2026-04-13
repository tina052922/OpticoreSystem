-- DOI-managed Campus Director signature image for INS (By Section), separate from linked User profile.
alter table public."College" add column if not exists "campusDirectorSignatureImageUrl" text;

comment on column public."College"."campusDirectorSignatureImageUrl" is
  'Public URL (Storage) for Campus Director line on INS Form 5B; set by DOI admin only via API.';
