-- WO13-01: gia đình — chia sẻ theo từng món đồ, thu hồi có hiệu lực ở lần gọi tiếp theo (T31).
-- Mô hình: chủ kho đồ mời thành viên; thành viên phải chấp nhận lời mời; chủ chia sẻ đúng một món đồ cho một thành viên đã chấp nhận.
-- Thành viên chỉ đọc qua hàm family_shared_items(), trả về tiêu đề, hãng và model; không trả ngày mua, tiền tệ hay phiên bản.
-- Bảng items chỉ cho chủ đọc (không đổi). Không có tài liệu trong phạm vi chia sẻ.
-- Mọi kiểm tra quyền chạy lại ở mỗi lần gọi, nên thu hồi có hiệu lực ở lần gọi kế tiếp.
-- Hạn chế (ghi trong docs/plan/evidence/WO13-01.md): chưa có HTTP, chưa có giới hạn thời hạn chia sẻ, chưa xác minh danh tính (DEC03).

create table public.family_memberships (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id),
  member_user_id uuid not null references public.profiles (id),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz null,
  revoked_at timestamptz null,
  revoked_by uuid null references public.profiles (id),
  constraint family_memberships_not_self check (owner_user_id <> member_user_id),
  constraint family_memberships_revoke_consistent check ((revoked_at is null) = (revoked_by is null))
);

create unique index family_memberships_one_active_idx
  on public.family_memberships (owner_user_id, member_user_id) where revoked_at is null;
create index family_memberships_member_idx on public.family_memberships (member_user_id);

create table public.item_family_shares (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  owner_user_id uuid not null references public.profiles (id),
  member_user_id uuid not null references public.profiles (id),
  shared_at timestamptz not null default now(),
  revoked_at timestamptz null,
  revoked_by uuid null references public.profiles (id),
  constraint item_family_shares_not_self check (owner_user_id <> member_user_id),
  constraint item_family_shares_revoke_consistent check ((revoked_at is null) = (revoked_by is null))
);

create unique index item_family_shares_one_active_idx
  on public.item_family_shares (item_id, member_user_id) where revoked_at is null;
create index item_family_shares_member_idx on public.item_family_shares (member_user_id);

alter table public.family_memberships enable row level security;
alter table public.item_family_shares enable row level security;

-- Chủ và thành viên thấy đúng các dòng liên quan đến mình. Không có quyền ghi trực tiếp.
create policy family_memberships_select_involved on public.family_memberships
  for select to authenticated
  using (owner_user_id = auth.uid() or member_user_id = auth.uid());

create policy item_family_shares_select_involved on public.item_family_shares
  for select to authenticated
  using (owner_user_id = auth.uid() or member_user_id = auth.uid());

revoke all on table public.family_memberships, public.item_family_shares from anon, authenticated;
grant select on public.family_memberships, public.item_family_shares to authenticated;

create function public.invite_family_member(p_member uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.account_tombstones where user_id = v_uid) then
    raise exception 'account deletion requested' using errcode = '42501';
  end if;
  if p_member is null or p_member = v_uid then
    raise exception 'invalid member' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_member) then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  select id into v_id from public.family_memberships
   where owner_user_id = v_uid and member_user_id = p_member and revoked_at is null;
  if found then
    return v_id;
  end if;
  insert into public.family_memberships (owner_user_id, member_user_id) values (v_uid, p_member) returning id into v_id;
  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
  values (v_uid, null, 'family.member.invited', 'family_membership', v_id::text, '{}'::jsonb);
  return v_id;
end;
$$;

create function public.accept_family_invitation(p_membership uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.account_tombstones where user_id = v_uid) then
    raise exception 'account deletion requested' using errcode = '42501';
  end if;
  update public.family_memberships
     set accepted_at = now()
   where id = p_membership and member_user_id = v_uid and accepted_at is null and revoked_at is null;
  if not found then
    raise exception 'invitation not found or not pending' using errcode = 'P0002';
  end if;
  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
  values (v_uid, null, 'family.invitation.accepted', 'family_membership', p_membership::text, '{}'::jsonb);
end;
$$;

-- Chỉ chủ món đồ chia sẻ được, và chỉ cho thành viên đã chấp nhận. Không phân biệt "không có món" với "không phải của bạn".
create function public.share_item_with_family(p_item uuid, p_member uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.account_tombstones where user_id in (v_uid, p_member)) then
    raise exception 'account deletion requested' using errcode = '42501';
  end if;
  select owner_user_id into v_owner from public.items where id = p_item;
  if not found or v_owner <> v_uid then
    raise exception 'item is not shareable by this account' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.family_memberships
     where owner_user_id = v_uid and member_user_id = p_member and accepted_at is not null and revoked_at is null
  ) then
    raise exception 'member is not an active family member' using errcode = '42501';
  end if;
  select id into v_id from public.item_family_shares
   where item_id = p_item and member_user_id = p_member and revoked_at is null;
  if found then
    return v_id;
  end if;
  insert into public.item_family_shares (item_id, owner_user_id, member_user_id)
  values (p_item, v_uid, p_member) returning id into v_id;
  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
  values (v_uid, null, 'family.item.shared', 'item', p_item::text, jsonb_build_object('share', v_id));
  return v_id;
end;
$$;

create function public.revoke_item_share(p_share uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  update public.item_family_shares
     set revoked_at = now(), revoked_by = v_uid
   where id = p_share and owner_user_id = v_uid and revoked_at is null;
  if not found then
    raise exception 'share not found or already revoked' using errcode = 'P0002';
  end if;
  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
  values (v_uid, null, 'family.item.unshared', 'item_family_share', p_share::text, '{}'::jsonb);
end;
$$;

-- Thu hồi thành viên: thu hồi mọi chia sẻ còn hiệu lực của thành viên đó. Trả về số chia sẻ đã thu hồi.
create function public.revoke_family_membership(p_membership uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_member uuid;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  update public.family_memberships
     set revoked_at = now(), revoked_by = v_uid
   where id = p_membership and owner_user_id = v_uid and revoked_at is null
  returning member_user_id into v_member;
  if not found then
    raise exception 'membership not found or already revoked' using errcode = 'P0002';
  end if;
  with revoked as (
    update public.item_family_shares
       set revoked_at = now(), revoked_by = v_uid
     where owner_user_id = v_uid and member_user_id = v_member and revoked_at is null
    returning id
  )
  select count(*)::integer into v_count from revoked;
  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
  values (v_uid, null, 'family.membership.revoked', 'family_membership', p_membership::text,
          jsonb_build_object('shares_revoked', v_count));
  return v_count;
end;
$$;

-- Món đồ được chia sẻ cho người gọi. Chỉ trả các cột tối thiểu; kiểm lại quyền ở mỗi lần gọi.
-- Không trả khi chủ hoặc người gọi đã có tombstone (yêu cầu xóa tài khoản, WO11-02).
create function public.family_shared_items()
returns table (item_id uuid, owner_user_id uuid, title text, brand text, model text, shared_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  return query
    select i.id, i.owner_user_id, i.title, i.brand, i.model, s.shared_at
      from public.item_family_shares s
      join public.family_memberships m
        on m.owner_user_id = s.owner_user_id and m.member_user_id = s.member_user_id
      join public.items i
        on i.id = s.item_id and i.owner_user_id = s.owner_user_id
     where s.member_user_id = v_uid
       and s.revoked_at is null
       and m.accepted_at is not null
       and m.revoked_at is null
       and not exists (select 1 from public.account_tombstones t where t.user_id in (v_uid, s.owner_user_id))
     order by i.id;
end;
$$;

revoke all on function public.invite_family_member(uuid) from public;
grant execute on function public.invite_family_member(uuid) to authenticated;
revoke all on function public.accept_family_invitation(uuid) from public;
grant execute on function public.accept_family_invitation(uuid) to authenticated;
revoke all on function public.share_item_with_family(uuid, uuid) from public;
grant execute on function public.share_item_with_family(uuid, uuid) to authenticated;
revoke all on function public.revoke_item_share(uuid) from public;
grant execute on function public.revoke_item_share(uuid) to authenticated;
revoke all on function public.revoke_family_membership(uuid) from public;
grant execute on function public.revoke_family_membership(uuid) to authenticated;
revoke all on function public.family_shared_items() from public;
grant execute on function public.family_shared_items() to authenticated;
