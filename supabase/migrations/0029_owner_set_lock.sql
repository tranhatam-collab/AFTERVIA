-- OWN-A-06 (audit 10/11, D-06). change_member_role và revoke_member chỉ khóa dòng thành viên đích rồi
-- đếm owner còn lại bằng `where ... and user_id <> p_target`. Hai owner cùng thu quyền của nhau trong hai
-- transaction song song đều thấy người kia còn ACTIVE, nên cả hai thành công và tổ chức còn 0 owner.
-- request_account_deletion (0020) đã khóa cả tập owner theo thứ tự id, nên an toàn với hai hàm này; nhưng
-- hai hàm này chưa an toàn với nhau.
--
-- Lượt này thêm cùng một khóa tập owner vào cả hai hàm, đặt ngay sau kiểm xác thực. Thân hàm còn lại giữ
-- nguyên văn bản của 0001.

create or replace function public.change_member_role(p_org uuid, p_target uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_actor_role text;
  v_target public.organization_members%rowtype;
  v_other_owners integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  -- D-06: khóa mọi dòng owner đang hoạt động của tổ chức, theo thứ tự id, TRƯỚC khi đọc vai trò người gọi
  -- và trước khi đếm owner còn lại. Hai lời gọi đồng thời vì thế xếp hàng: người đến sau đọc kết quả đã
  -- commit của người đến trước, nên không còn cửa sổ để cả hai cùng thấy "vẫn còn owner khác".
  -- Cùng thứ tự khóa với request_account_deletion (0020), nên hai hàm không khóa chéo nhau.
  perform 1
    from public.organization_members o
   where o.org_id = p_org
     and o.role = 'owner'
     and o.status = 'ACTIVE'
   order by o.id
     for update;
  select role into v_actor_role
  from public.organization_members
  where org_id = p_org and user_id = v_uid and status = 'ACTIVE';
  if v_actor_role is distinct from 'owner' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_target = v_uid then
    raise exception 'forbidden: an owner cannot change their own role' using errcode = '42501';
  end if;
  if p_new_role not in ('owner', 'manager', 'agent') then
    raise exception 'invalid role' using errcode = '22023';
  end if;
  select * into v_target
  from public.organization_members
  where org_id = p_org and user_id = p_target and status = 'ACTIVE'
  for update;
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  if v_target.role = p_new_role then
    return;
  end if;
  if v_target.role = 'owner' and p_new_role <> 'owner' then
    select count(*) into v_other_owners
    from public.organization_members
    where org_id = p_org and role = 'owner' and status = 'ACTIVE' and user_id <> p_target;
    if v_other_owners = 0 then
      raise exception 'organization must keep at least one active owner' using errcode = '23514';
    end if;
  end if;
  update public.organization_members set role = p_new_role where id = v_target.id;
  perform public.write_audit(p_org, 'member.role_change', 'organization_member', p_target::text,
    jsonb_build_object('from', v_target.role, 'to', p_new_role));
end;
$$;

create or replace function public.revoke_member(p_org uuid, p_target uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_actor_role text;
  v_target public.organization_members%rowtype;
  v_other_owners integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  -- D-06: khóa mọi dòng owner đang hoạt động của tổ chức, theo thứ tự id, TRƯỚC khi đọc vai trò người gọi
  -- và trước khi đếm owner còn lại. Hai lời gọi đồng thời vì thế xếp hàng: người đến sau đọc kết quả đã
  -- commit của người đến trước, nên không còn cửa sổ để cả hai cùng thấy "vẫn còn owner khác".
  -- Cùng thứ tự khóa với request_account_deletion (0020), nên hai hàm không khóa chéo nhau.
  perform 1
    from public.organization_members o
   where o.org_id = p_org
     and o.role = 'owner'
     and o.status = 'ACTIVE'
   order by o.id
     for update;
  select role into v_actor_role
  from public.organization_members
  where org_id = p_org and user_id = v_uid and status = 'ACTIVE';
  if v_actor_role is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_target
  from public.organization_members
  where org_id = p_org and user_id = p_target and status = 'ACTIVE'
  for update;
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  if p_target <> v_uid then
    if not (v_actor_role = 'owner' or (v_actor_role = 'manager' and v_target.role = 'agent')) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;
  if v_target.role = 'owner' then
    select count(*) into v_other_owners
    from public.organization_members
    where org_id = p_org and role = 'owner' and status = 'ACTIVE' and user_id <> p_target;
    if v_other_owners = 0 then
      raise exception 'organization must keep at least one active owner' using errcode = '23514';
    end if;
  end if;
  update public.organization_members
     set status = 'REVOKED', revoked_at = now()
   where id = v_target.id;
  perform public.write_audit(p_org, 'member.revoke', 'organization_member', p_target::text,
    jsonb_build_object('role', v_target.role, 'self', p_target = v_uid));
end;
$$;
