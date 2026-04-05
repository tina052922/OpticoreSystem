-- Allow Chairman / College Admin to register instructor User rows (Faculty Profile) in their college.
-- Requires matching collegeId; role must be instructor.

drop policy if exists user_insert_chairman_or_college_instructor on public."User";
create policy user_insert_chairman_or_college_instructor on public."User"
for insert
to authenticated
with check (
  role = 'instructor'
  and coalesce("collegeId", '') = coalesce(public.current_user_college_id(), '')
  and (
    public.is_chairman_admin()
    or public.is_college_admin()
  )
);

-- College Admin can manage FacultyProfile for users in their college (same as Chairman).
drop policy if exists facultyprofile_crud on public."FacultyProfile";
create policy facultyprofile_crud on public."FacultyProfile"
for all
to authenticated
using (
  (
    public.is_chairman_admin()
    or public.is_college_admin()
  )
  and exists (
    select 1
    from public."User" u
    where u.id = "FacultyProfile"."userId"
      and u."collegeId" is not null
      and u."collegeId" = public.current_user_college_id()
  )
)
with check (
  (
    public.is_chairman_admin()
    or public.is_college_admin()
  )
  and exists (
    select 1
    from public."User" u
    where u.id = "FacultyProfile"."userId"
      and u."collegeId" is not null
      and u."collegeId" = public.current_user_college_id()
  )
);

-- Subject: allow College Admin to CRUD subjects under programs in their college (Chairman rules unchanged).
drop policy if exists subject_crud on public."Subject";
create policy subject_crud on public."Subject"
for all
to authenticated
using (
  exists (
    select 1 from public."Program" p
    where p.id = "Subject"."programId"
      and p."collegeId" is not null
      and p."collegeId" = public.current_user_college_id()
  )
  and (
    (
      public.is_chairman_admin()
      and (
        public.current_user_chairman_program_id() is null
        or "Subject"."programId" = public.current_user_chairman_program_id()
      )
    )
    or public.is_college_admin()
  )
)
with check (
  exists (
    select 1 from public."Program" p
    where p.id = "Subject"."programId"
      and p."collegeId" is not null
      and p."collegeId" = public.current_user_college_id()
  )
  and (
    (
      public.is_chairman_admin()
      and (
        public.current_user_chairman_program_id() is null
        or "Subject"."programId" = public.current_user_chairman_program_id()
      )
    )
    or public.is_college_admin()
  )
);
