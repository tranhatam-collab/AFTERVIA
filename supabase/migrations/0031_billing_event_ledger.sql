-- WO12-01: sổ sự kiện thanh toán (T27, T28). Chỉ sandbox: không có khóa live, không có nhà cung cấp thật.
--
-- Theo engineering/11_BILLING_AND_ENTITLEMENTS.md, luồng là:
--   kiểm chữ ký + timestamp -> khử trùng theo (provider, event_id) -> ghi sự kiện bất biến
--   -> cập nhật entitlement trong cùng transaction -> ghi nhật ký.
-- Migration này làm ba việc giữa: khử trùng, sổ bất biến, và quy tắc thứ tự. Phần kiểm chữ ký nằm ở
-- services/api (cần HMAC), còn máy trạng thái entitlement đầy đủ thuộc WO12-02.
--
-- Hai quy tắc được ép ở tầng cơ sở dữ liệu, không để mã gọi tự nhớ:
--   1. unique (provider, event_id): gửi lại đúng sự kiện cũ KHÔNG tạo hàng thứ hai và KHÔNG đổi entitlement.
--   2. Sự kiện cũ hơn trạng thái hiện tại vẫn được GHI (nó đã xảy ra) nhưng KHÔNG ghi đè entitlement.
--      Thứ tự so theo (effective_at, provider_seq): nhà cung cấp là nguồn đúng, không phải giờ nhận.

create table public.billing_events (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('sandbox_b2b', 'sandbox_app_store', 'sandbox_play')),
  event_id text not null check (char_length(btrim(event_id)) between 1 and 200),
  subject_user_id uuid not null references public.profiles (id),
  event_type text not null check (event_type in ('purchase', 'renew', 'cancel', 'expire', 'refund', 'dispute')),
  -- Trạng thái do nhà cung cấp tuyên bố. Máy trạng thái đầy đủ là WO12-02; ở đây chỉ lưu đúng điều họ nói.
  provider_state text not null
    check (provider_state in ('trial', 'active', 'grace', 'past_due', 'canceled_at_period_end', 'expired', 'refunded', 'disputed')),
  effective_at timestamptz not null,
  -- Số thứ tự của nhà cung cấp khi họ có. Không có thì null và chỉ so theo effective_at.
  provider_seq bigint null check (provider_seq is null or provider_seq >= 0),
  payload jsonb not null,
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index billing_events_subject_idx on public.billing_events (subject_user_id, effective_at);

-- Sổ chỉ được thêm: một sự kiện đã nhận không được sửa lại cho khớp với kết quả mong muốn.
create trigger billing_events_append_only
  before update or delete on public.billing_events
  for each row execute function public.forbid_append_only_mutation();
create trigger billing_events_no_truncate
  before truncate on public.billing_events
  for each statement execute function public.forbid_append_only_mutation();

alter table public.billing_events enable row level security;
revoke all on table public.billing_events from public, anon, authenticated;

-- Entitlement hiện tại của một người. Bảng này SỬA ĐƯỢC (khác sổ), nhưng chỉ qua hàm bên dưới.
create table public.entitlements (
  user_id uuid primary key references public.profiles (id),
  provider text not null check (provider in ('sandbox_b2b', 'sandbox_app_store', 'sandbox_play')),
  state text not null
    check (state in ('trial', 'active', 'grace', 'past_due', 'canceled_at_period_end', 'expired', 'refunded', 'disputed')),
  -- Mốc của sự kiện đã tạo ra trạng thái này. Dùng để từ chối sự kiện đến muộn nhưng cũ hơn.
  effective_at timestamptz not null,
  provider_seq bigint null check (provider_seq is null or provider_seq >= 0),
  source_event_id text not null,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;
revoke all on table public.entitlements from public, anon, authenticated;

-- Chủ tài khoản đọc được entitlement của chính mình (giao diện cần hiện gói đang dùng). Không ghi được.
grant select on table public.entitlements to authenticated;
create policy entitlements_select_own on public.entitlements
  for select to authenticated
  using (user_id = auth.uid());

-- Sự kiện mới hơn trạng thái đang có hay không. Null seq coi như chỉ so mốc thời gian.
-- Bằng nhau là KHÔNG mới hơn: hai sự kiện cùng mốc thì giữ cái đã ghi, không lật qua lật lại.
create function public.billing_event_is_newer(
  p_new_at timestamptz,
  p_new_seq bigint,
  p_old_at timestamptz,
  p_old_seq bigint
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_new_at > p_old_at then true
    when p_new_at < p_old_at then false
    when p_new_seq is null or p_old_seq is null then false
    else p_new_seq > p_old_seq
  end;
$$;

revoke all on function public.billing_event_is_newer(timestamptz, bigint, timestamptz, bigint) from public, anon, authenticated;

-- Ghi một sự kiện đã được xác minh chữ ký. Chỉ máy chủ gọi được: webhook không bao giờ đến từ trình duyệt.
-- Trả về biên nhận để bên gọi biết chuyện gì đã xảy ra, thay vì đoán:
--   recorded: sự kiện có được ghi mới không (false nghĩa là đã có từ trước)
--   entitlement_changed: trạng thái có đổi không (false khi sự kiện cũ hơn, hoặc khi lặp)
--   state: trạng thái sau cùng
create function public.record_billing_event(
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

  -- Khóa hàng entitlement trước, để hai webhook cùng lúc cho một người được xử lý tuần tự.
  select * into v_current from public.entitlements where user_id = p_user for update;

  insert into public.billing_events (provider, event_id, subject_user_id, event_type, provider_state, effective_at, provider_seq, payload)
  values (p_provider, v_event_id, p_user, p_event_type, p_provider_state, p_effective_at, p_provider_seq, p_payload)
  on conflict (provider, event_id) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    -- Lặp lại: sổ đã có hàng này. Không đụng vào entitlement, không ghi nhật ký lần hai.
    select state into v_state from public.entitlements where user_id = p_user;
    return jsonb_build_object(
      'recorded', false,
      'duplicate', true,
      'entitlement_changed', false,
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
    -- Đến muộn nhưng cũ hơn (ví dụ cancel của kỳ trước tới sau purchase mới). Sổ vẫn giữ, trạng thái không lùi.
    v_state := v_current.state;
  end if;

  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
  values (
    null,
    null,
    'billing.event_recorded',
    'billing_event',
    v_event_id,
    jsonb_build_object('provider', p_provider, 'event_type', p_event_type, 'entitlement_changed', v_changed, 'state', v_state)
  );

  return jsonb_build_object(
    'recorded', true,
    'duplicate', false,
    'entitlement_changed', v_changed,
    'state', v_state
  );
end;
$$;

revoke all on function public.record_billing_event(text, text, uuid, text, text, timestamptz, bigint, jsonb) from public, anon, authenticated;
