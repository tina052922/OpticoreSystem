-- College Admin may request evaluator access to another college (approved by that college's College Admin).

drop policy if exists access_request_insert on public."AccessRequest";
create policy access_request_insert on public."AccessRequest"
for insert
to authenticated
with check (
  "requesterId" = auth.uid()::text
  and (
    (
      public.current_user_role() = 'cas_admin'
      and "collegeId" = public.current_user_college_id()
    )
    or (
      public.current_user_role() = 'gec_chairman'
      and "collegeId" = coalesce(
        nullif(trim(coalesce(public.current_user_college_id(), '')), ''),
        public.gec_routing_college_id()
      )
    )
    or (
      public.current_user_role() = 'college_admin'
      and "collegeId" is not null
      and coalesce(nullif(trim(public.current_user_college_id()), ''), '') <> ''
      and "collegeId" <> public.current_user_college_id()
    )
  )
);
