-- Chairman Admin: scope to a single program via User.chairmanProgramId (e.g. BSIT).
-- Idempotent: safe to re-run.

alter table public."User" add column if not exists "chairmanProgramId" text references public."Program"(id) on delete set null;

create or replace function public.current_user_chairman_program_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u."chairmanProgramId" from public."User" u where u.id = auth.uid()::text
$$;

grant execute on function public.current_user_chairman_program_id() to authenticated;

-- Program SELECT: chairmen see only their program when assigned; else programs in their college.
drop policy if exists program_select_auth on public."Program";
create policy program_select_auth on public."Program"
for select
to authenticated
using (
  public.current_user_role() <> 'chairman_admin'
  or (
    public.current_user_chairman_program_id() is not null
    and id = public.current_user_chairman_program_id()
  )
  or (
    public.current_user_chairman_program_id() is null
    and "collegeId" = public.current_user_college_id()
  )
);

-- Program CRUD: chairmen only touch their assigned program row when set.
drop policy if exists program_crud on public."Program";
create policy program_crud on public."Program"
for all
to authenticated
using (
  public.is_chairman_admin()
  and "collegeId" = public.current_user_college_id()
  and (
    public.current_user_chairman_program_id() is null
    or id = public.current_user_chairman_program_id()
  )
)
with check (
  public.is_chairman_admin()
  and "collegeId" = public.current_user_college_id()
  and (
    public.current_user_chairman_program_id() is null
    or id = public.current_user_chairman_program_id()
  )
);

-- Section SELECT / CRUD
drop policy if exists section_select_auth on public."Section";
create policy section_select_auth on public."Section"
for select
to authenticated
using (
  public.current_user_role() <> 'chairman_admin'
  or (
    public.current_user_chairman_program_id() is not null
    and "programId" = public.current_user_chairman_program_id()
  )
  or (
    public.current_user_chairman_program_id() is null
    and exists (
      select 1 from public."Program" p
      where p.id = "Section"."programId"
        and p."collegeId" = public.current_user_college_id()
    )
  )
);

drop policy if exists section_crud on public."Section";
create policy section_crud on public."Section"
for all
to authenticated
using (
  public.is_chairman_admin()
  and exists (
    select 1 from public."Program" p
    where p.id = "Section"."programId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
)
with check (
  public.is_chairman_admin()
  and exists (
    select 1 from public."Program" p
    where p.id = "Section"."programId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
);

-- Subject SELECT / CRUD
drop policy if exists subject_select_auth on public."Subject";
create policy subject_select_auth on public."Subject"
for select
to authenticated
using (
  public.current_user_role() <> 'chairman_admin'
  or (
    public.current_user_chairman_program_id() is not null
    and "programId" = public.current_user_chairman_program_id()
  )
  or (
    public.current_user_chairman_program_id() is null
    and exists (
      select 1 from public."Program" p
      where p.id = "Subject"."programId"
        and p."collegeId" = public.current_user_college_id()
    )
  )
);

drop policy if exists subject_crud on public."Subject";
create policy subject_crud on public."Subject"
for all
to authenticated
using (
  public.is_chairman_admin()
  and exists (
    select 1 from public."Program" p
    where p.id = "Subject"."programId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
)
with check (
  public.is_chairman_admin()
  and exists (
    select 1 from public."Program" p
    where p.id = "Subject"."programId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
);

-- ScheduleEntry CRUD
drop policy if exists scheduleentry_crud on public."ScheduleEntry";
create policy scheduleentry_crud on public."ScheduleEntry"
for all
to authenticated
using (
  public.is_chairman_admin()
  and exists (
    select 1
    from public."Section" s
    join public."Program" p on p.id = s."programId"
    where s.id = "ScheduleEntry"."sectionId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
)
with check (
  public.is_chairman_admin()
  and exists (
    select 1
    from public."Section" s
    join public."Program" p on p.id = s."programId"
    where s.id = "ScheduleEntry"."sectionId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
);

-- StudentProfile: chairman only for students in their program when assigned.
drop policy if exists studentprofile_all_chairman on public."StudentProfile";
create policy studentprofile_all_chairman on public."StudentProfile"
for all
to authenticated
using (
  public.is_chairman_admin()
  and exists (
    select 1 from public."Program" p
    where p.id = "StudentProfile"."programId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
)
with check (
  public.is_chairman_admin()
  and exists (
    select 1 from public."Program" p
    where p.id = "StudentProfile"."programId"
      and p."collegeId" = public.current_user_college_id()
      and (
        public.current_user_chairman_program_id() is null
        or p.id = public.current_user_chairman_program_id()
      )
  )
);

-- RPC: expose chairman program to the app
create or replace function public.auth_get_my_user_row()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'name', u.name,
        'role', u.role,
        'collegeId', u."collegeId",
        'chairmanProgramId', u."chairmanProgramId",
        'chairmanProgramCode', pr.code,
        'chairmanProgramName', pr.name
      )
      from public."User" u
      left join public."Program" pr on pr.id = u."chairmanProgramId"
      where u.id = auth.uid()::text
      limit 1
    ),
    'null'::jsonb
  );
$$;

grant execute on function public.auth_get_my_user_row() to authenticated;
