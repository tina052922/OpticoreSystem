-- INS print: optional per-college + campus-wide overrides for signature strip labels/names.
-- Profile / signature images: raise storage bucket limit (was 2 MiB).

alter table public."College" add column if not exists "insSignerDisplay" jsonb;

comment on column public."College"."insSignerDisplay" is
  'Optional JSON map keyed by INS signature slot id (approved, campus, review, contract, prepared) with { signerName, lineSubtitle } for printed forms.';

alter table public."CampusInsSettings" add column if not exists "insSignerDisplay" jsonb;

comment on column public."CampusInsSettings"."insSignerDisplay" is
  'Optional JSON overrides for campus-wide INS signatures (DOI), typically the approved / VPAA line.';

update storage.buckets
set file_size_limit = 10485760
where id = 'signatures';
