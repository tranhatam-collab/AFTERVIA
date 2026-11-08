-- WO11-02 (lát cắt 1): yêu cầu xóa tài khoản thu hồi quyền truy cập còn hiệu lực, ghi tombstone chỉ thêm,
-- và áp lại tombstone sau khi khôi phục backup (T25, T26).
-- Đã làm: thu hồi grant và người tham gia của người dùng theo cả hai chiều (người nhận và người cấp hoặc mời);
--   chuyển hồ sơ sang PENDING_DELETION; receipt liệt kê việc còn chờ; audit chỉ ghi số lượng, không có dữ liệu cá nhân.
-- Chưa làm (chờ quyết định, xem docs/plan/evidence/WO11-02.md): xóa dữ liệu chính theo chính sách; xử lý bảng chỉ thêm
--   (reminder_deliveries, inbox_messages, case_events, case_evidence, export_jobs, export_files); thu hồi phiên (JWT không trạng thái); xác minh danh tính (DEC03);
--   thành viên tổ chức; đăng ký tombstone phải sống ngoài backup (thiết kế WO16-01).
-- Yêu cầu và tombstone không tham chiếu profiles, để một bước xóa hồ sơ sau này không bị khóa ngoại chặn.

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique check (char_length(request_id) between 8 and 128),
  user_id uuid not null,
  requested_at timestamptz not null default now(),
  receipt jsonb not null
);

create table public.account_tombstones (
  user_id uuid primary key,
  request_id text not null references public.account_deletion_requests (request_id),
  deleted_at timestamptz not null default now()
);

-- Yêu cầu và tombstone chỉ được thêm, không sửa, không xóa.
create trigger account_deletion_requests_append_only
  before update or delete on public.account_deletion_requests
  for each row execute function public.forbid_append_only_mutation();
create trigger account_deletion_requests_no_truncate
  before truncate on public.account_deletion_requests
  for each statement execute function public.forbid_append_only_mutation();
create trigger account_tombstones_append_only
  before update or delete on public.account_tombstones
  for each row execute function public.forbid_append_only_mutation();
create trigger account_tombstones_no_truncate
  before truncate on public.account_tombstones
  for each statement execute function public.forbid_append_only_mutation();

alter table public.account_deletion_requests enable row level security;
alter table public.account_tombstones enable row level security;

create policy account_deletion_requests_select_owner on public.account_deletion_requests
  for select to authenticated
  using (user_id = auth.uid());

revoke all on table public.account_deletion_requests, public.account_tombstones from public, anon, authenticated;
grant select on public.account_deletion_requests to authenticated;

-- Người dùng đã đăng nhập yêu cầu xóa tài khoản của chính mình. Lặp lại cùng mã yêu cầu trả về cùng receipt.
-- Mỗi tài khoản có tối đa một tombstone: yêu cầu thứ hai với mã mới trả về receipt đầu tiên.
create function public.request_account_deletion(p_request_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.account_deletion_requests%rowtype;
  v_tomb public.account_tombstones%rowtype;
  v_grants integer;
  v_participants integer;
  v_receipt jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_request_id is null or char_length(btrim(p_request_id)) not between 8 and 128 then
    raise exception 'request id out of range' using errcode = '22023';
  end if;

  -- Khóa hồ sơ để hai yêu cầu cùng lúc của một người được xử lý tuần tự.
  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  select * into v_existing from public.account_deletion_requests where request_id = p_request_id;
  if found then
    if v_existing.user_id <> v_uid then
      raise exception 'request id is not available' using errcode = '42501';
    end if;
    return v_existing.receipt;
  end if;

  select * into v_tomb from public.account_tombstones where user_id = v_uid;
  if found then
    select receipt into v_receipt from public.account_deletion_requests where request_id = v_tomb.request_id;
    return v_receipt;
  end if;

  with revoked as (
    update public.case_document_grants
       set revoked_at = now(), revoked_by = v_uid
     where (recipient_id = v_uid or granted_by = v_uid) and revoked_at is null
    returning id
  )
  select count(*)::integer into v_grants from revoked;

  with revoked as (
    update public.case_participants
       set revoked_at = now(), revoked_by = v_uid
     where (actor_id = v_uid or invited_by = v_uid) and revoked_at is null
    returning id
  )
  select count(*)::integer into v_participants from revoked;

  update public.profiles
     set deletion_status = 'PENDING_DELETION', updated_at = now()
   where id = v_uid and deletion_status = 'ACTIVE';

  v_receipt := jsonb_build_object(
    'request_id', p_request_id,
    'status', 'PENDING_POLICY',
    'access_revoked', jsonb_build_object('grants', v_grants, 'participants', v_participants),
    'pending', jsonb_build_array(
      'primary_data_erasure',
      'retention_policy',
      'append_only_erasure',
      'session_revocation',
      'identity_verification',
      'organization_membership',
      'tombstone_registry_outside_backup'
    )
  );

  insert into public.account_deletion_requests (request_id, user_id, receipt) values (p_request_id, v_uid, v_receipt);
  insert into public.account_tombstones (user_id, request_id) values (v_uid, p_request_id);
  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, request_id, details)
  values (
    v_uid, null, 'account.delete.requested', 'account', v_uid::text, p_request_id,
    jsonb_build_object('grants_revoked', v_grants, 'participants_revoked', v_participants)
  );
  return v_receipt;
end;
$$;

-- Áp lại tombstone sau khi khôi phục backup: thu hồi lại quyền truy cập đã được khôi phục và giữ hồ sơ ở trạng thái chờ xóa.
-- Chỉ chủ cơ sở dữ liệu gọi; người dùng cuối không có quyền thực thi.
create function public.reapply_account_tombstones()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tomb record;
  v_count integer := 0;
begin
  for v_tomb in select user_id from public.account_tombstones loop
    update public.case_document_grants
       set revoked_at = now(), revoked_by = v_tomb.user_id
     where (recipient_id = v_tomb.user_id or granted_by = v_tomb.user_id) and revoked_at is null;
    update public.case_participants
       set revoked_at = now(), revoked_by = v_tomb.user_id
     where (actor_id = v_tomb.user_id or invited_by = v_tomb.user_id) and revoked_at is null;
    update public.profiles
       set deletion_status = 'PENDING_DELETION', updated_at = now()
     where id = v_tomb.user_id and deletion_status = 'ACTIVE';
    v_count := v_count + 1;
  end loop;

  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
  values (null, null, 'account.tombstone.reapplied', 'account_tombstones', 'batch', jsonb_build_object('tombstones', v_count));
  return v_count;
end;
$$;

revoke all on function public.request_account_deletion(text) from public;
grant execute on function public.request_account_deletion(text) to authenticated;
revoke all on function public.reapply_account_tombstones() from public;
