-- GEC Chairman: read college peers; manage FacultyProfile + Subject rows for GEC/GEE curriculum only (same college routing as COTE).

create or replace function public.is_gec_chairman()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role = 'gec_chairman' from public."User" u where u.id = auth.uid()::text),
    false
  );
$$;

grant execute on function public.is_gec_chairman() to authenticated;

-- Peer instructors / users for Faculty Profile lists (mirror college_admin peers).
drop policy if exists user_select_gec_peers on public."User";
create policy user_select_gec_peers on public."User"
for select
to authenticated
using (
  public.is_gec_chairman()
  and coalesce("collegeId", '') = coalesce(
    nullif(trim(coalesce(public.current_user_college_id(), '')), ''),
    public.gec_routing_college_id()
  )
);

-- FacultyProfile: Chairman / College Admin unchanged; add GEC Chairman for instructors in routed college.
drop policy if exists facultyprofile_crud on public."FacultyProfile";
create policy facultyprofile_crud on public."FacultyProfile"
for all
to authenticated
using (
  (
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
  or (
    public.is_gec_chairman()
    and exists (
      select 1
      from public."User" u
      where u.id = "FacultyProfile"."userId"
        and u.role = 'instructor'
        and coalesce(u."collegeId", public.gec_routing_college_id()) = coalesce(
          nullif(trim(coalesce(public.current_user_college_id(), '')), ''),
          public.gec_routing_college_id()
        )
    )
  )
)
with check (
  (
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
  or (
    public.is_gec_chairman()
    and exists (
      select 1
      from public."User" u
      where u.id = "FacultyProfile"."userId"
        and u.role = 'instructor'
        and coalesce(u."collegeId", public.gec_routing_college_id()) = coalesce(
          nullif(trim(coalesce(public.current_user_college_id(), '')), ''),
          public.gec_routing_college_id()
        )
    )
  )
);

-- Allow GEC Chairman to insert placeholder instructor rows (COTE routing college) for GEC staffing.
drop policy if exists user_insert_chairman_or_college_instructor on public."User";
create policy user_insert_chairman_or_college_instructor on public."User"
for insert
to authenticated
with check (
  role = 'instructor'
  and (
    (
      coalesce("collegeId", '') = coalesce(public.current_user_college_id(), '')
      and (
        public.is_chairman_admin()
        or public.is_college_admin()
      )
    )
    or (
      public.is_gec_chairman()
      and coalesce("collegeId", public.gec_routing_college_id()) = coalesce(
        nullif(trim(coalesce(public.current_user_college_id(), '')), ''),
        public.gec_routing_college_id()
      )
    )
  )
);

-- Subject CRUD: preserve Chairman / College Admin rules; add GEC Chairman for GEC-% / GEE-% only.
drop policy if exists subject_crud on public."Subject";
create policy subject_crud on public."Subject"
for all
to authenticated
using (
  (
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
  or (
    public.is_gec_chairman()
    and (
      upper(trim("Subject".code)) like 'GEC-%'
      or upper(trim("Subject".code)) like 'GEE-%'
    )
    and exists (
      select 1 from public."Program" p
      where p.id = "Subject"."programId"
        and p."collegeId" is not null
        and p."collegeId" = coalesce(
          nullif(trim(coalesce(public.current_user_college_id(), '')), ''),
          public.gec_routing_college_id()
        )
    )
  )
)
with check (
  (
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
  or (
    public.is_gec_chairman()
    and (
      upper(trim("Subject".code)) like 'GEC-%'
      or upper(trim("Subject".code)) like 'GEE-%'
    )
    and exists (
      select 1 from public."Program" p
      where p.id = "Subject"."programId"
        and p."collegeId" is not null
        and p."collegeId" = coalesce(
          nullif(trim(coalesce(public.current_user_college_id(), '')), ''),
          public.gec_routing_college_id()
        )
    )
  )
);
