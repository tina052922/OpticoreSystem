-- Realtime: College Admin + DOI sidebar badges refresh when justifications are submitted or VPAA decides.
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
      and pt.tablename = 'ScheduleLoadJustification'
  ) then
    return;
  end if;
  execute 'alter publication supabase_realtime add table public."ScheduleLoadJustification"';
end $$;
