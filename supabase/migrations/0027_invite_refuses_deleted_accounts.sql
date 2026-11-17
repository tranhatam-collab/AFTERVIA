-- OWN-A-04 (audit 10/11, D-02). invite_member (0001) và invite_case_participant (0010) chỉ kiểm hồ sơ
-- có tồn tại, không kiểm tombstone, nên một tài khoản đã yêu cầu xóa vẫn được mời lại và membership
-- được kích hoạt lại thành ACTIVE. Trigger của 0018 chỉ chặn người GỌI khi đang chờ xóa, không chặn
-- người được mời, và 0020 thu hồi membership tại thời điểm xóa chứ không chặn lần mời sau đó.
--
-- Thêm đúng một kiểm tra vào mỗi hàm, theo mẫu đã dùng cho các hàm gia đình (0015): chặn khi người gọi
-- HOẶC người được mời có tombstone. Thân hàm còn lại giữ nguyên văn bản gốc.

create or replace function public.invite_member(p_org uuid, p_target uuid, p_role text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_actor_role text;
  v_existing public.organization_members%rowtype;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.account_tombstones where user_id in (v_uid, p_target)) then
    raise exception 'account deletion requested' using errcode = '42501';
  end if;
  if p_target is null then
    raise exception 'target is required' using errcode = '22023';
  end if;
  if p_role not in ('owner', 'manager', 'agent') then
    raise exception 'invalid role' using errcode = '22023';
  end if;
  select role into v_actor_role
  from public.organization_members
  where org_id = p_org and user_id = v_uid and status = 'ACTIVE';
  if v_actor_role is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_target = v_uid then
    raise exception 'forbidden: cannot assign a role to yourself' using errcode = '42501';
  end if;
  if not (v_actor_role = 'owner' or (v_actor_role = 'manager' and p_role = 'agent')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_target) then
    raise exception 'target profile not found' using errcode = 'P0002';
  end if;
  select * into v_existing
  from public.organization_members
  where org_id = p_org and user_id = p_target
  for update;
  if found and v_existing.status = 'ACTIVE' then
    raise exception 'already a member' using errcode = '23505';
  end if;
  if found then
    update public.organization_members
       set role = p_role, status = 'ACTIVE', granted_by = v_uid, granted_at = now(), revoked_at = null
     where id = v_existing.id
     returning id into v_id;
  else
    insert into public.organization_members (org_id, user_id, role, status, granted_by)
    values (p_org, p_target, p_role, 'ACTIVE', v_uid)
    returning id into v_id;
  end if;
  perform public.write_audit(p_org, 'member.invite', 'organization_member', p_target::text,
    jsonb_build_object('role', p_role));
  return v_id;
end;
$$;

create or replace function public.invite_case_participant(p_case uuid, p_actor uuid, p_expires_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_case public.cases%rowtype;
  v_new uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.account_tombstones where user_id in (v_uid, p_actor)) then
    raise exception 'account deletion requested' using errcode = '42501';
  end if;
  select * into v_case from public.cases where id = p_case;
  if not found or v_case.created_by <> v_uid then
    raise exception 'case not found' using errcode = 'P0002';
  end if;
  if v_case.status in ('closed', 'withdrawn') then
    raise exception 'case is not open' using errcode = '55000';
  end if;
  if p_actor is null or p_actor = v_uid then
    raise exception 'invalid participant' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_actor) then
    raise exception 'partner not found' using errcode = 'P0002';
  end if;
  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    raise exception 'expiry must be within 30 days' using errcode = '22023';
  end if;

  insert into public.case_participants (case_id, actor_id, role, invited_by, expires_at)
  values (p_case, p_actor, 'partner', v_uid, p_expires_at)
  returning id into v_new;

  perform public.write_audit(v_case.org_id, 'case.participant.invite', 'case', p_case::text,
    jsonb_build_object('participant', v_new, 'actor', p_actor, 'expires_at', p_expires_at));
  return v_new;
end;
$$;
