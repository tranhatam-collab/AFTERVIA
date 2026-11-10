-- OWN-A-05 (audit 10/11, D-05). Luật xác thực lại trước khi xóa tài khoản chỉ nằm ở tầng API
-- (services/api/src/http/app.ts: issuedRecently, DELETION_REAUTH_SECONDS = 300). Hàm
-- request_account_deletion được cấp cho authenticated (0014:169) và không kiểm gì về phiên, nên một
-- lời gọi RPC trực tiếp bằng vai trò authenticated bỏ qua được cả luật 300 giây và mốc cắt phiên.
--
-- Lượt này đưa luật đó vào hàm: phiên phải mang iat, iat không quá 300 giây trước, và không quá 60
-- giây trong tương lai (chống lệch đồng hồ). Thân hàm còn lại giữ nguyên văn bản của 0020.
--
-- Hai thay đổi đi kèm ngoài migration:
--   * services/api/src/db/session.ts: withUser nhận thêm claims, và route xóa truyền iat của phiên.
--   * tests/support/db.ts: asActor mang iat như một JWT thật, vì trước đó claims kiểm thử không có iat.

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
  v_iat text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  -- D-05: xác thực lại trước khi xóa, kiểm ngay trong hàm. 300 giây phải khớp DELETION_REAUTH_SECONDS
  -- trong services/api/src/http/app.ts. Phiên thiếu iat bị từ chối, nên gọi RPC trực tiếp không qua API
  -- cũng không vượt được luật này.
  v_iat := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'iat';
  if v_iat is null or v_iat !~ '^[0-9]+$' then
    raise exception 'reauthentication required' using errcode = '42501';
  end if;
  if extract(epoch from now())::bigint - v_iat::bigint > 300 then
    raise exception 'reauthentication required' using errcode = '42501';
  end if;
  if v_iat::bigint - extract(epoch from now())::bigint > 60 then
    raise exception 'reauthentication required' using errcode = '42501';
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
