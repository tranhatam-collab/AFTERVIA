-- WO12-02: biên nhận của record_billing_event nói thêm trạng thái TRƯỚC đó.
--
-- Máy trạng thái (packages/domain/src/entitlement.ts) cần biết cả hai đầu của bước chuyển để nhận ra một
-- bước lạ (ví dụ refunded -> trial). Trước bản này, bên gọi chỉ biết trạng thái sau, nên không thể phân
-- biệt "active -> active" với "refunded -> active".
--
-- Bước lạ KHÔNG bị từ chối: nhà cung cấp là nguồn đúng. Nó được ghi nhận rồi báo cho người vận hành.
-- Phần thân còn lại giữ nguyên như 0031.

create or replace function public.record_billing_event(
  p_provider text,
  p_event_id text,
  p_user uuid,
  p_event_type text,
  p_provider_state text,
  p_effective_at timestamptz,
  p_provider_seq bigint,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id text := btrim(coalesce(p_event_id, ''));
  v_inserted bigint;
  v_current public.entitlements%rowtype;
  v_changed boolean := false;
  v_state text;
  v_previous text;
begin
  perform public.assert_server_caller();
  if p_provider is null or p_user is null or p_effective_at is null then
    raise exception 'provider, user and effective_at are required' using errcode = '22023';
  end if;
  if char_length(v_event_id) not between 1 and 200 then
    raise exception 'event id out of range' using errcode = '22023';
  end if;
  if p_payload is null then
    raise exception 'payload is required' using errcode = '22023';
  end if;

  select * into v_current from public.entitlements where user_id = p_user for update;
  v_previous := v_current.state;

  insert into public.billing_events (provider, event_id, subject_user_id, event_type, provider_state, effective_at, provider_seq, payload)
  values (p_provider, v_event_id, p_user, p_event_type, p_provider_state, p_effective_at, p_provider_seq, p_payload)
  on conflict (provider, event_id) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    select state into v_state from public.entitlements where user_id = p_user;
    return jsonb_build_object(
      'recorded', false,
      'duplicate', true,
      'entitlement_changed', false,
      'previous_state', v_previous,
      'state', v_state
    );
  end if;

  if v_current.user_id is null then
    insert into public.entitlements (user_id, provider, state, effective_at, provider_seq, source_event_id)
    values (p_user, p_provider, p_provider_state, p_effective_at, p_provider_seq, v_event_id);
    v_changed := true;
    v_state := p_provider_state;
  elsif public.billing_event_is_newer(p_effective_at, p_provider_seq, v_current.effective_at, v_current.provider_seq) then
    update public.entitlements
       set provider = p_provider,
           state = p_provider_state,
           effective_at = p_effective_at,
           provider_seq = p_provider_seq,
           source_event_id = v_event_id,
           updated_at = now()
     where user_id = p_user;
    v_changed := true;
    v_state := p_provider_state;
  else
    v_state := v_current.state;
  end if;

  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
  values (
    null,
    null,
    'billing.event_recorded',
    'billing_event',
    v_event_id,
    jsonb_build_object(
      'provider', p_provider,
      'event_type', p_event_type,
      'entitlement_changed', v_changed,
      'previous_state', v_previous,
      'state', v_state
    )
  );

  return jsonb_build_object(
    'recorded', true,
    'duplicate', false,
    'entitlement_changed', v_changed,
    'previous_state', v_previous,
    'state', v_state
  );
end;
$$;

revoke all on function public.record_billing_event(text, text, uuid, text, text, timestamptz, bigint, jsonb) from public, anon, authenticated;
