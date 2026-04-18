-- Program Chairman saves already persist to public."ScheduleEntry". College Admin SELECT RLS joins
-- Section→Program so rows for that college are visible without a separate transfer table.
-- Supabase Realtime must include this table or useScheduleEntryCrossReload only works after manual
-- refresh. Add idempotently (safe if Dashboard already added the table).

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  if exists (
    select 1
    from pg_publication_tables pt
    where pt.pubname = 'supabase_realtime'
      and pt.schemaname = 'public'
      and pt.tablename = 'ScheduleEntry'
  ) then
    return;
  end if;
  execute 'alter publication supabase_realtime add table public."ScheduleEntry"';
end $$;
