-- Digital signature images (User) + optional Campus Director / Contract assignees per College.
-- Storage bucket `signatures` for uploads under `{userId}/...`

alter table public."User" add column if not exists "signatureImageUrl" text;

comment on column public."User"."signatureImageUrl" is
  'Public URL (e.g. Supabase Storage) for INS form / PDF signature image.';

alter table public."College" add column if not exists "campusDirectorUserId" text references public."User"(id) on delete set null;
alter table public."College" add column if not exists "contractSignerUserId" text references public."User"(id) on delete set null;

comment on column public."College"."campusDirectorUserId" is
  'User whose signature appears as Campus Director on INS when the term is approved.';
comment on column public."College"."contractSignerUserId" is
  'User whose signature appears on the Contract line on INS when the term is approved.';

-- Safe self-service: only this column, only own row (SECURITY DEFINER bypasses RLS safely).
create or replace function public.set_my_signature_image_url(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public."User"
  set "signatureImageUrl" = nullif(trim(p_url), '')
  where id = auth.uid()::text;
end;
$$;

grant execute on function public.set_my_signature_image_url(text) to authenticated;

-- Storage: public bucket for signature images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signatures',
  'signatures',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "signatures_insert_own_folder" on storage.objects;
create policy "signatures_insert_own_folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'signatures'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "signatures_update_own_folder" on storage.objects;
create policy "signatures_update_own_folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'signatures'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'signatures'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "signatures_delete_own_folder" on storage.objects;
create policy "signatures_delete_own_folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'signatures'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "signatures_select_public" on storage.objects;
create policy "signatures_select_public"
on storage.objects for select to public
using (bucket_id = 'signatures');

-- College Admin may assign Campus Director / Contract signers for their college; DOI may edit any college.
drop policy if exists college_update_signers_college_admin on public."College";
create policy college_update_signers_college_admin on public."College"
for update to authenticated
using (
  public.is_college_admin()
  and id = public.current_user_college_id()
)
with check (
  public.is_college_admin()
  and id = public.current_user_college_id()
);

drop policy if exists college_update_signers_doi on public."College";
create policy college_update_signers_doi on public."College"
for update to authenticated
using (public.is_doi_admin())
with check (public.is_doi_admin());
