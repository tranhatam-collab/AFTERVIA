-- WO11-02g (T25, Q4 đã QUYẾT): yêu cầu xóa tài khoản thu hồi thành viên tổ chức của chính người đó
-- (status = REVOKED, có revoked_at), và từ chối khi người đó là owner duy nhất đang hoạt động của một tổ chức.
-- Từ chối xảy ra trước mọi thay đổi, nên người dùng chỉ định owner khác rồi gửi lại cùng mã yêu cầu.
-- Mã lỗi từ chối là 55000 (409 invalid_state qua API).
-- Đã làm: receipt có access_revoked.memberships và không còn organization_membership trong danh sách chờ;
--   audit ghi số lượng thành viên đã thu hồi; áp lại tombstone (T26) cũng thu hồi thành viên và đếm tổ chức không còn owner.
-- Chưa làm: chuyển quyền owner tự động (quyền owner là quyết định của tổ chức). Tổ chức không còn owner sau khi
--   khôi phục là việc vận hành (WO16-01), hiện chỉ được đếm trong audit.
-- Thay hàm bằng create or replace. Không sửa migration đã áp dụng.

-- Số tổ chức mà người dùng là owner đang hoạt động và không còn owner đang hoạt động nào khác.
-- Security definer để không bị RLS của organization_members che dòng của owner khác.
create function public.sole_owner_organizations(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
    from public.organization_members m
   where m.user_id = p_user
     and m.role = 'owner'
     and m.status = 'ACTIVE'
     and not exists (
       select 1
         from public.organization_members o
        where o.org_id = m.org_id
          and o.role = 'owner'
          and o.status = 'ACTIVE'
          and o.user_id <> p_user
     );
$$;

revoke all on function public.sole_owner_organizations(uuid) from public, anon, authenticated;

-- Người dùng đã đăng nhập yêu cầu xóa tài khoản của chính mình. Lặp lại cùng mã yêu cầu trả về cùng receipt.
-- Mỗi tài khoản có tối đa một tombstone: yêu cầu thứ hai với mã mới trả về receipt đầu tiên.
create or replace function public.request_account_deletion(p_request_id text)
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
  v_memberships integer;
  v_sole_owner integer;
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

  -- Khóa mọi dòng owner đang hoạt động của các tổ chức mà người này là owner, theo thứ tự id.
  -- Hai owner cùng lúc của một tổ chức được xử lý tuần tự: người đến sau đọc kết quả của người đến trước.
  perform 1
    from public.organization_members o
   where o.role = 'owner'
     and o.status = 'ACTIVE'
     and o.org_id in (
       select m.org_id
         from public.organization_members m
        where m.user_id = v_uid and m.role = 'owner' and m.status = 'ACTIVE'
     )
   order by o.id
     for update;

  -- Owner duy nhất của một tổ chức không được rời khi chưa chỉ định owner khác. Từ chối trước mọi thay đổi.
  select public.sole_owner_organizations(v_uid) into v_sole_owner;
  if v_sole_owner > 0 then
    raise exception 'an active owner must be appointed before account deletion' using errcode = '55000';
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

  with revoked as (
    update public.organization_members
       set status = 'REVOKED', revoked_at = now()
     where user_id = v_uid and status = 'ACTIVE'
    returning id
  )
  select count(*)::integer into v_memberships from revoked;

  update public.profiles
     set deletion_status = 'PENDING_DELETION', updated_at = now()
   where id = v_uid and deletion_status = 'ACTIVE';

  v_receipt := jsonb_build_object(
    'request_id', p_request_id,
    'status', 'PENDING_POLICY',
    'access_revoked', jsonb_build_object(
      'grants', v_grants,
      'participants', v_participants,
      'memberships', v_memberships
    ),
    'pending', jsonb_build_array(
      'primary_data_erasure',
      'retention_policy',
      'append_only_erasure',
      'session_revocation',
      'identity_verification',
      'tombstone_registry_outside_backup'
    )
  );

  insert into public.account_deletion_requests (request_id, user_id, receipt) values (p_request_id, v_uid, v_receipt);
  insert into public.account_tombstones (user_id, request_id) values (v_uid, p_request_id);
  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, request_id, details)
  values (
    v_uid, null, 'account.delete.requested', 'account', v_uid::text, p_request_id,
    jsonb_build_object(
      'grants_revoked', v_grants,
      'participants_revoked', v_participants,
      'memberships_revoked', v_memberships
    )
  );
  return v_receipt;
end;
$$;

-- Áp lại tombstone sau khi khôi phục backup: thu hồi lại quyền truy cập đã được khôi phục (grant, người tham gia,
-- thành viên tổ chức) và giữ hồ sơ ở trạng thái chờ xóa. Chỉ chủ cơ sở dữ liệu gọi; người dùng cuối không có quyền thực thi.
-- Không tự cấp owner. Tổ chức không còn owner sau bước này được đếm trong audit để vận hành xử lý.
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
