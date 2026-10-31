-- WO16-02: cờ kill switch và break-glass hỗ trợ có phê duyệt, hạn và audit (T42).
-- Cờ theo engineering/12: ai_extraction, outbound_notifications, sharing, billing_writes, country_activation.
-- Tắt một cờ không xóa quyền truy cập hồ sơ. Lát cắt này nối cờ 'sharing' vào một điểm: tạo chia sẻ gia đình mới bị chặn (trigger).
--   Chưa chặn đọc chia sẻ hiện có khi tắt sharing: đó là quyết định về tình huống sự cố, ghi trong docs/plan/evidence/WO16-02.md.
--   Các cờ khác chưa có điểm thực thi trong cơ sở dữ liệu. Cờ không xác định được coi là tắt (đóng theo mặc định).
-- Break-glass: hỗ trợ viên đã đăng ký chỉ đọc được đúng một case khi chủ tổ chức của case (không phải người yêu cầu) đã duyệt,
--   với thời hạn tối đa 120 phút. Không duyệt hoặc hết hạn: không trả dữ liệu, ghi audit từ chối. Mỗi lần đọc được ghi audit.
-- Hỗ trợ viên nằm trong bảng support_staff do quản trị cơ sở dữ liệu quản lý. Chưa có quy trình cấp qua API.
-- Người vận hành cờ chưa có danh tính trong cơ sở dữ liệu (audit ghi actor trống); cần khi có API quản trị.

-- Cờ và trạng thái. Người dùng đã đăng nhập chỉ đọc khóa, trạng thái và thời điểm cập nhật; lý do không được đọc từ ứng dụng.
create table public.kill_switches (
  switch_key text primary key check (switch_key in ('ai_extraction', 'outbound_notifications', 'sharing', 'billing_writes', 'country_activation')),
  enabled boolean not null,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  updated_at timestamptz not null default now()
);

insert into public.kill_switches (switch_key, enabled, reason) values
  ('ai_extraction', true, 'mặc định'),
  ('outbound_notifications', true, 'mặc định'),
  ('sharing', true, 'mặc định'),
  ('billing_writes', true, 'mặc định'),
  ('country_activation', false, 'mặc định: quốc gia chỉ bật khi có phê duyệt (WO16-04)');

alter table public.kill_switches enable row level security;

create policy kill_switches_select_state on public.kill_switches
  for select to authenticated
  using (true);

revoke all on table public.kill_switches from public, anon, authenticated;
grant select (switch_key, enabled, updated_at) on public.kill_switches to authenticated;

-- Trạng thái cờ cho nội bộ cơ sở dữ liệu. Cờ không xác định trả NULL; người gọi coi NULL là tắt.
create function public.kill_switch_enabled(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select k.enabled from public.kill_switches k where k.switch_key = p_key;
$$;

-- Đổi cờ: chỉ người vận hành cơ sở dữ liệu. Không cấp quyền cho người dùng cuối.
create function public.set_kill_switch(p_key text, p_enabled boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
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

-- Điểm thực thi cờ 'sharing': không tạo chia sẻ gia đình mới khi cờ tắt. Chia sẻ hiện có không bị xóa.
create function public.enforce_sharing_kill_switch()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not coalesce(public.kill_switch_enabled('sharing'), false) then
    raise exception 'sharing is switched off' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger item_family_shares_kill_switch
  before insert on public.item_family_shares
  for each row execute function public.enforce_sharing_kill_switch();

-- Hỗ trợ viên. Không có quyền cho người dùng cuối; chỉ hàm và quản trị cơ sở dữ liệu truy cập.
create table public.support_staff (
  user_id uuid primary key references public.profiles (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz null
);

alter table public.support_staff enable row level security;
revoke all on table public.support_staff from public, anon, authenticated;

-- Yêu cầu break-glass. Chỉ hàm truy cập bảng. Thời hạn tối đa 120 phút kể từ lúc duyệt.
create table public.break_glass_requests (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique check (char_length(request_id) between 8 and 128),
  support_user_id uuid not null references public.profiles (id),
  case_id uuid not null references public.cases (id),
  org_id uuid not null references public.organizations (id),
  reason text not null check (char_length(btrim(reason)) between 10 and 500),
  requested_at timestamptz not null default now(),
  approved_by uuid null references public.profiles (id),
  approved_at timestamptz null,
  expires_at timestamptz null,
  constraint break_glass_not_self_approved check (approved_by is null or approved_by <> support_user_id),
  constraint break_glass_approval_complete check (
    (approved_by is null) = (approved_at is null) and (approved_at is null) = (expires_at is null)
  ),
  constraint break_glass_window check (expires_at is null or expires_at <= approved_at + interval '120 minutes')
);

alter table public.break_glass_requests enable row level security;
revoke all on table public.break_glass_requests from public, anon, authenticated;

-- Hỗ trợ viên đăng ký nhu cầu đọc một case. Chưa có quyền đọc nào được cấp ở bước này.
create function public.request_break_glass(p_request_id text, p_case uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.support_staff where user_id = v_uid and revoked_at is null) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_request_id is null or char_length(btrim(p_request_id)) not between 8 and 128 then
    raise exception 'request id out of range' using errcode = '22023';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 10 and 500 then
    raise exception 'reason out of range' using errcode = '22023';
  end if;
  select org_id into v_org from public.cases where id = p_case;
  if not found then
    raise exception 'case not found' using errcode = 'P0002';
  end if;
  insert into public.break_glass_requests (request_id, support_user_id, case_id, org_id, reason)
  values (p_request_id, v_uid, p_case, v_org, btrim(p_reason))
  returning id into v_id;
  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, request_id, details)
  values (v_uid, v_org, 'support.break_glass.requested', 'case', p_case::text, p_request_id,
          jsonb_build_object('break_glass', v_id));
  return v_id;
end;
$$;

-- Duyệt: chỉ chủ đang hoạt động của tổ chức có case, và không phải người yêu cầu. Thời hạn từ 1 đến 120 phút.
create function public.approve_break_glass(p_request uuid, p_minutes integer)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.break_glass_requests%rowtype;
  v_at timestamptz;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_minutes is null or p_minutes not between 1 and 120 then
    raise exception 'window out of range' using errcode = '22023';
  end if;
  select * into v_req from public.break_glass_requests where id = p_request for update;
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
  if v_req.approved_at is not null then
    raise exception 'request already decided' using errcode = '55000';
  end if;
  if v_req.support_user_id = v_uid then
    raise exception 'requester cannot approve' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members m
     where m.org_id = v_req.org_id and m.user_id = v_uid and m.role = 'owner' and m.status = 'ACTIVE'
  ) then
    raise exception 'only an active owner of the organization can approve' using errcode = '42501';
  end if;
  update public.break_glass_requests
     set approved_by = v_uid, approved_at = now(), expires_at = now() + make_interval(mins => p_minutes)
   where id = p_request
  returning approved_at into v_at;
  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, request_id, details)
  values (v_uid, v_req.org_id, 'support.break_glass.approved', 'case', v_req.case_id::text, v_req.request_id,
          jsonb_build_object('minutes', p_minutes));
  return v_at;
end;
$$;

-- Đọc theo break-glass. Chưa duyệt hoặc đã hết hạn: không trả dữ liệu case, chỉ trả lý do và ghi audit từ chối.
-- Đã duyệt và còn hạn: trả trạng thái, phiên bản, thời điểm tạo và lịch sử sự kiện (không có lý do, không có danh tính),
-- và ghi audit mỗi lần đọc.
create function public.read_case_for_break_glass(p_request uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.break_glass_requests%rowtype;
  v_case public.cases%rowtype;
  v_events jsonb;
  v_reason text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into v_req from public.break_glass_requests where id = p_request;
  if not found or v_req.support_user_id <> v_uid then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.support_staff where user_id = v_uid and revoked_at is null) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_req.approved_at is null then
    v_reason := 'not_approved';
  elsif now() >= v_req.expires_at then
    v_reason := 'expired';
  end if;
  if v_reason is not null then
    insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, request_id, details)
    values (v_uid, v_req.org_id, 'support.break_glass.denied', 'case', v_req.case_id::text, v_req.request_id,
            jsonb_build_object('reason', v_reason));
    return jsonb_build_object('allowed', false, 'reason', v_reason);
  end if;
  select * into v_case from public.cases where id = v_req.case_id;
  select coalesce(jsonb_agg(jsonb_build_object(
           'sequence', e.sequence, 'type', e.type, 'to_state', e.to_state, 'created_at', e.created_at)
           order by e.sequence), '[]'::jsonb)
    into v_events
    from public.case_events e
   where e.case_id = v_req.case_id;
  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, request_id, details)
  values (v_uid, v_req.org_id, 'support.break_glass.read', 'case', v_req.case_id::text, v_req.request_id,
          jsonb_build_object('events', jsonb_array_length(v_events)));
  return jsonb_build_object(
    'allowed', true,
    'expires_at', v_req.expires_at,
    'case', jsonb_build_object('id', v_case.id, 'status', v_case.status, 'version', v_case.version, 'created_at', v_case.created_at),
    'events', v_events
  );
end;
$$;

revoke all on function public.kill_switch_enabled(text) from public;
revoke all on function public.set_kill_switch(text, boolean, text) from public;
revoke all on function public.enforce_sharing_kill_switch() from public;
revoke all on function public.request_break_glass(text, uuid, text) from public;
grant execute on function public.request_break_glass(text, uuid, text) to authenticated;
revoke all on function public.approve_break_glass(uuid, integer) from public;
grant execute on function public.approve_break_glass(uuid, integer) to authenticated;
revoke all on function public.read_case_for_break_glass(uuid) from public;
grant execute on function public.read_case_for_break_glass(uuid) to authenticated;
