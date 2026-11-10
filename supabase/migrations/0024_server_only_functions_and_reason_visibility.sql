-- Security fixes from the audit of commit 06e9cc0 (AV-DB-01, AV-DB-02, AV-DB-03, API-F03, AV-DB-04).
-- Earlier migrations revoked EXECUTE only from PUBLIC. On Supabase, default privileges also grant EXECUTE on new
-- functions in public to anon and authenticated, so the server-only functions below were callable by any client.
-- This migration revokes EXECUTE from public, anon and authenticated explicitly, grants it only to service_role,
-- and adds a check inside each server-only function that refuses a client role even if a grant comes back later.
-- It also restores read access to case event reasons for active case participants (same rule as case_events, 0010).
-- Earlier migrations are not edited; functions are replaced with create or replace and keep their signatures.

-- Refuses the call when the session runs as a client role. A security definer function keeps the caller's
-- `role` setting (SET ROLE as done by PostgREST), so this sees anon or authenticated even inside a definer function.
-- The JWT role claim is checked too. service_role and a direct database owner connection pass.
create function public.assert_server_caller()
returns void
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if current_setting('role', true) in ('anon', 'authenticated')
     or coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'server only' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.assert_server_caller() from public, anon, authenticated;

-- AV-DB-01: set_kill_switch. Body as in 0017, plus the caller check.
create or replace function public.set_kill_switch(p_key text, p_enabled boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_server_caller();
  if p_enabled is null then
    raise exception 'enabled is required' using errcode = '22023';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'reason is required' using errcode = '22023';
  end if;
  update public.kill_switches
     set enabled = p_enabled, reason = btrim(p_reason), updated_at = now()
   where switch_key = p_key;
  if not found then
    raise exception 'unknown switch' using errcode = '22023';
  end if;
  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
  values (null, null, 'kill_switch.changed', 'kill_switch', p_key, jsonb_build_object('enabled', p_enabled));
end;
$$;

revoke all on function public.set_kill_switch(text, boolean, text) from public, anon, authenticated;
grant execute on function public.set_kill_switch(text, boolean, text) to service_role;

-- AV-DB-03: reapply_account_tombstones. Body as in 0020, plus the caller check.
create or replace function public.reapply_account_tombstones()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tomb record;
  v_count integer := 0;
  v_revoked integer;
  v_memberships integer := 0;
  v_orphans integer;
begin
  perform public.assert_server_caller();
  for v_tomb in select user_id from public.account_tombstones loop
    update public.case_document_grants
       set revoked_at = now(), revoked_by = v_tomb.user_id
     where (recipient_id = v_tomb.user_id or granted_by = v_tomb.user_id) and revoked_at is null;
    update public.case_participants
       set revoked_at = now(), revoked_by = v_tomb.user_id
     where (actor_id = v_tomb.user_id or invited_by = v_tomb.user_id) and revoked_at is null;
    with revoked as (
      update public.organization_members
         set status = 'REVOKED', revoked_at = now()
       where user_id = v_tomb.user_id and status = 'ACTIVE'
      returning id
    )
    select count(*)::integer into v_revoked from revoked;
    v_memberships := v_memberships + v_revoked;
    update public.profiles
       set deletion_status = 'PENDING_DELETION', updated_at = now()
     where id = v_tomb.user_id and deletion_status = 'ACTIVE';
    v_count := v_count + 1;
  end loop;

  select count(*)::integer into v_orphans
    from public.organizations o
   where not exists (
     select 1
       from public.organization_members m
      where m.org_id = o.id and m.role = 'owner' and m.status = 'ACTIVE'
   );

  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
  values (
    null, null, 'account.tombstone.reapplied', 'account_tombstones', 'batch',
    jsonb_build_object(
      'tombstones', v_count,
      'memberships_revoked', v_memberships,
      'organizations_without_active_owner', v_orphans
    )
  );
  return v_count;
end;
$$;

revoke all on function public.reapply_account_tombstones() from public, anon, authenticated;
grant execute on function public.reapply_account_tombstones() to service_role;

-- AV-DB-02: write_audit takes an arbitrary org id. It is only called from other security definer functions
-- (which run as the owner), so no client role needs EXECUTE.
revoke all on function public.write_audit(uuid, text, text, text, jsonb) from public, anon, authenticated;

-- API-F03: record_field_confirmation cannot check that the extraction belongs to the caller, because there is no
-- extraction table yet (0006, 0022). Until there is, only the server may call it: the server checks ownership
-- and passes the user's claims (sub) so the actor still comes from auth.uid(). Body as in 0022, plus the caller check.
create or replace function public.record_field_confirmation(
  p_extraction_id uuid,
  p_field_path text,
  p_old_value jsonb,
  p_new_value jsonb,
  p_new_absent_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_new uuid;
begin
  perform public.assert_server_caller();
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_extraction_id is null then
    raise exception 'extraction is required' using errcode = '22023';
  end if;
  if p_field_path is null or char_length(p_field_path) not between 1 and 120
     or p_field_path !~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$' then
    raise exception 'invalid field path' using errcode = '22023';
  end if;
  if p_old_value is not null and (jsonb_typeof(p_old_value) = 'null' or octet_length(p_old_value::text) > 8192) then
    raise exception 'invalid old value' using errcode = '22023';
  end if;
  if p_new_value is not null and (jsonb_typeof(p_new_value) = 'null' or octet_length(p_new_value::text) > 8192) then
    raise exception 'invalid new value' using errcode = '22023';
  end if;
  if p_new_value is null and p_new_absent_reason is distinct from 'confirmed_absent' then
    raise exception 'an absent value needs the confirmed_absent reason' using errcode = '22023';
  end if;
  if p_new_value is not null and p_new_absent_reason is not null then
    raise exception 'a present value cannot carry an absence reason' using errcode = '22023';
  end if;

  insert into public.field_confirmations (extraction_id, field_path, new_absent_reason, actor_user_id)
  values (p_extraction_id, p_field_path, p_new_absent_reason, v_uid)
  returning id into v_new;

  insert into public.field_confirmation_values (confirmation_id, old_value, new_value)
  values (v_new, p_old_value, p_new_value);

  perform public.write_audit(null, 'field.confirm', 'field_confirmation', v_new::text,
    jsonb_build_object('extraction', p_extraction_id, 'field_path', p_field_path));
  return v_new;
end;
$$;

revoke all on function public.record_field_confirmation(uuid, text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.record_field_confirmation(uuid, text, jsonb, jsonb, text) to service_role;

-- AV-DB-04: case event reasons follow the same visibility rule as case_events (0010): the case creator, an active
-- member of the case's organization, or an active (not revoked, not expired) participant of the case.
drop policy case_event_reasons_select_visible on public.case_event_reasons;
create policy case_event_reasons_select_visible on public.case_event_reasons
  for select to authenticated
  using (exists (
    select 1
      from public.case_events e
     where e.id = case_event_reasons.event_id
       and (
         exists (
           select 1 from public.cases c
            where c.id = e.case_id and (c.created_by = auth.uid() or public.is_org_member(c.org_id))
         )
         or exists (
           select 1 from public.case_participants p
            where p.case_id = e.case_id and p.actor_id = auth.uid()
              and p.revoked_at is null and p.expires_at > now()
         )
       )
  ));
