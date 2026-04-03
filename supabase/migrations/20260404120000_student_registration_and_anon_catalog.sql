-- Student self-registration: anon can read catalog for dropdowns; authenticated new users complete profile via RPC.

-- Public read of catalog for registration form (anon + authenticated)
drop policy if exists college_select_anon on public."College";
create policy college_select_anon on public."College"
for select to anon
using (true);

drop policy if exists program_select_anon on public."Program";
create policy program_select_anon on public."Program"
for select to anon
using (true);

drop policy if exists section_select_anon on public."Section";
create policy section_select_anon on public."Section"
for select to anon
using (true);

-- Completes User + StudentProfile after supabase.auth.signUp (session must exist; email must match auth.users)
create or replace function public.complete_student_registration(
  p_full_name text,
  p_program_id text,
  p_section_id text,
  p_year_level int,
  p_student_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_college_id text;
  v_sid text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  if exists (select 1 from public."User" u where u.id = v_uid::text) then
    return jsonb_build_object('ok', false, 'error', 'Profile already exists for this account');
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null or length(trim(v_email)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Could not read account email');
  end if;

  select p."collegeId" into v_college_id
  from public."Section" s
  join public."Program" p on p.id = s."programId"
  where s.id = p_section_id
    and s."programId" = p_program_id
    and s."yearLevel" = p_year_level;

  if v_college_id is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid program, section, or year level');
  end if;

  v_sid := nullif(trim(coalesce(p_student_id, '')), '');

  insert into public."User" (id, email, name, role, "collegeId", "employeeId")
  values (
    v_uid::text,
    trim(v_email),
    trim(p_full_name),
    'student',
    v_college_id,
    v_sid
  );

  insert into public."StudentProfile" ("userId", "programId", "sectionId", "yearLevel")
  values (v_uid::text, p_program_id, p_section_id, p_year_level);

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'That student ID or email is already registered');
  when others then
    return jsonb_build_object('ok', false, 'error', 'Registration could not be completed. Try again or contact support.');
end;
$$;

grant execute on function public.complete_student_registration(text, text, text, int, text) to authenticated;
