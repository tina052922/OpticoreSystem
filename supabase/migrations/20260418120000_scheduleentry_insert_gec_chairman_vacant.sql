-- GEC Chairman: allow INSERT for new vacant GEC slots (client "Add schedule row" uses upsert → INSERT for new ids).
-- Mirrors scheduleentry_update_gec_chairman_vacant: grant active, unlocked row, GEC/GEE subject, placeholder instructor only.

drop policy if exists scheduleentry_insert_gec_chairman_vacant on public."ScheduleEntry";
create policy scheduleentry_insert_gec_chairman_vacant on public."ScheduleEntry"
for insert
to authenticated
with check (
  public.current_user_role() = 'gec_chairman'
  and public.gec_has_active_vacant_slot_grant()
  and "ScheduleEntry"."lockedByDoiAt" is null
  and public.is_gec_curriculum_subject_id("ScheduleEntry"."subjectId")
  and "ScheduleEntry"."instructorId" = 'a0000000-0000-4000-8000-000000000099'::text
);
