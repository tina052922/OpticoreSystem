-- Reliable notifications when an instructor creates a ScheduleChangeRequest:
--   • DB trigger (SECURITY DEFINER) so inserts succeed even if app client RLS differed.
--   • RLS policy so API routes may still insert when appropriate.
-- Enable Supabase Realtime on public."ScheduleChangeRequest" (Database → Replication) for instant sidebar badges.

-- ---------------------------------------------------------------------------
-- RLS: instructor may insert in-app notifications for own college admins + self
-- ---------------------------------------------------------------------------
drop policy if exists notif_insert_instructor on public."Notification";
create policy notif_insert_instructor on public."Notification"
for insert
to authenticated
with check (
  public.current_user_role() = 'instructor'
  and public.current_user_college_id() is not null
  and (
    "Notification"."userId" = auth.uid()::text
    or exists (
      select 1
      from public."User" u
      where u.id = "Notification"."userId"
        and u.role = 'college_admin'
        and u."collegeId" = public.current_user_college_id()
    )
  )
);

-- ---------------------------------------------------------------------------
-- Trigger: notify all college admins + submitting instructor (atomic with SCR insert)
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_schedule_change_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_section text;
  v_instructor text;
  v_admin_msg text;
  v_self_msg text;
begin
  select coalesce(s.code, '—')
    into v_code
  from public."ScheduleEntry" se
  left join public."Subject" s on s.id = se."subjectId"
  where se.id = new."scheduleEntryId"
  limit 1;

  select coalesce(sec.name, '—')
    into v_section
  from public."ScheduleEntry" se
  left join public."Section" sec on sec.id = se."sectionId"
  where se.id = new."scheduleEntryId"
  limit 1;

  select coalesce(u.name, 'An instructor')
    into v_instructor
  from public."User" u
  where u.id = new."instructorId"
  limit 1;

  v_admin_msg := format(
    'New schedule change request: %s (%s). %s asked to move this class — open Schedule change requests to review.',
    coalesce(v_code, '—'),
    coalesce(v_section, '—'),
    coalesce(v_instructor, 'Instructor')
  );

  v_self_msg := format(
    'Your schedule change request for %s (%s) was sent to College Admin. You will get another notification when it is approved or rejected.',
    coalesce(v_code, '—'),
    coalesce(v_section, '—')
  );

  insert into public."Notification" ("userId", message, "isRead")
  select u.id, v_admin_msg, false
  from public."User" u
  where u.role = 'college_admin'
    and u."collegeId" = new."collegeId";

  insert into public."Notification" ("userId", message, "isRead")
  values (new."instructorId", v_self_msg, false);

  return new;
end;
$$;

drop trigger if exists trg_schedule_change_request_notify_insert on public."ScheduleChangeRequest";
create trigger trg_schedule_change_request_notify_insert
after insert on public."ScheduleChangeRequest"
for each row
execute function public.notify_on_schedule_change_request_insert();

comment on function public.notify_on_schedule_change_request_insert() is
  'Notifies all college_admin users in the request college and confirms to the instructor (bypasses Notification RLS).';
