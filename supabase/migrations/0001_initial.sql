-- 0001_initial: danh tính, tổ chức, thành viên và nhật ký kiểm toán (WO04-01).
-- Áp dụng cho Supabase Postgres và cho shim cục bộ tests/support/local-auth-shim.sql.
-- Nguyên tắc: client không có quyền ghi trực tiếp vào các bảng này. Mọi thay đổi đi qua hàm
-- SECURITY DEFINER có kiểm tra quyền ở server. RLS là lớp bổ sung, không thay thế kiểm tra trong hàm.

-- 1. Bảng ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  locale text not null default 'vi' check (locale in ('vi', 'en')),
  service_country char(2) null check (service_country ~ '^[A-Z]{2}$'),
  deletion_status text not null default 'ACTIVE'
    check (deletion_status in ('ACTIVE', 'PENDING_DELETION', 'DELETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (length(btrim(legal_name)) between 1 and 200),
  country char(2) not null check (country ~ '^[A-Z]{2}$'),
  plan_id text null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'CLOSED')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'agent')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  granted_by uuid null references public.profiles (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz null,
  constraint organization_members_org_user_key unique (org_id, user_id),
  constraint organization_members_revoke_consistent check ((status = 'REVOKED') = (revoked_at is not null))
);

create index organization_members_active_user_idx
  on public.organization_members (user_id) where status = 'ACTIVE';

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid null,
  org_id uuid null,
  action text not null check (length(action) between 1 and 100),
  object_type text not null,
  object_id text not null,
  request_id text null,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_events_org_time_idx on public.audit_events (org_id, occurred_at);

-- Nhật ký chỉ được thêm. Không ai, kể cả superuser qua đường thường, được sửa hoặc xóa.
create function public.forbid_audit_mutation() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'audit_events is append-only: % is not allowed', tg_op using errcode = '42501';
end;
$$;

create trigger audit_events_no_update_delete
  before update or delete on public.audit_events
  for each row execute function public.forbid_audit_mutation();

create trigger audit_events_no_truncate
  before truncate on public.audit_events
  for each statement execute function public.forbid_audit_mutation();

-- 2. Hàm trợ giúp -------------------------------------------------------------

-- Tạo hồ sơ khi có người dùng xác thực mới.
create function public.handle_new_auth_user() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Ghi nhật ký. Chỉ gọi từ các hàm SECURITY DEFINER khác, không cấp cho client.
create function public.write_audit(
  p_org uuid,
  p_action text,
  p_object_type text,
  p_object_id text,
  p_details jsonb default '{}'::jsonb
) returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
  values (auth.uid(), p_org, p_action, p_object_type, p_object_id, coalesce(p_details, '{}'::jsonb));
$$;

-- Người dùng hiện tại có là thành viên đang hoạt động của tổ chức (và có vai trò thuộc p_roles nếu được truyền).
create function public.is_org_member(p_org uuid, p_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.org_id = p_org
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and (p_roles is null or m.role = any (p_roles))
  );
$$;

-- 3. Hàm nghiệp vụ (client gọi qua RPC) ---------------------------------------

create function public.create_organization(p_legal_name text, p_country char(2))
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  insert into public.organizations (legal_name, country, created_by)
  values (btrim(p_legal_name), p_country, v_uid)
  returning id into v_org;
  insert into public.organization_members (org_id, user_id, role, status, granted_by)
  values (v_org, v_uid, 'owner', 'ACTIVE', v_uid);
  perform public.write_audit(v_org, 'organization.create', 'organization', v_org::text,
    jsonb_build_object('country', p_country));
  return v_org;
end;
$$;

-- Quy tắc: owner mời được mọi vai trò; manager chỉ mời agent; agent không mời ai; không tự mời mình.
create function public.invite_member(p_org uuid, p_target uuid, p_role text)
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

-- Chỉ owner đổi vai trò. Owner không đổi vai trò của chính mình. Không để tổ chức mất owner đang hoạt động.
create function public.change_member_role(p_org uuid, p_target uuid, p_new_role text)
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

-- Owner thu hồi bất kỳ thành viên nào. Manager chỉ thu hồi agent. Mọi người có thể rời tổ chức,
-- trừ owner đang hoạt động cuối cùng.
create function public.revoke_member(p_org uuid, p_target uuid)
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

create function public.update_organization_legal_name(p_org uuid, p_legal_name text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not public.is_org_member(p_org, array['owner']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.organizations set legal_name = btrim(p_legal_name) where id = p_org;
  perform public.write_audit(p_org, 'organization.update_legal_name', 'organization', p_org::text, '{}'::jsonb);
end;
$$;

-- 4. Quyền bảng và hàm -------------------------------------------------------

-- Bắt đầu từ không có quyền. Tránh bảng tương lai bị lộ qua PostgREST nhờ quyền mặc định.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;

grant select on public.profiles to authenticated;
grant update (locale, service_country) on public.profiles to authenticated;
grant select on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select on public.audit_events to authenticated;

revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.write_audit(uuid, text, text, text, jsonb) from public;
revoke all on function public.forbid_audit_mutation() from public;

revoke all on function public.is_org_member(uuid, text[]) from public;
grant execute on function public.is_org_member(uuid, text[]) to authenticated;

revoke all on function public.create_organization(text, char) from public;
grant execute on function public.create_organization(text, char) to authenticated;

revoke all on function public.invite_member(uuid, uuid, text) from public;
grant execute on function public.invite_member(uuid, uuid, text) to authenticated;

revoke all on function public.change_member_role(uuid, uuid, text) from public;
grant execute on function public.change_member_role(uuid, uuid, text) to authenticated;

revoke all on function public.revoke_member(uuid, uuid) from public;
grant execute on function public.revoke_member(uuid, uuid) to authenticated;

revoke all on function public.update_organization_legal_name(uuid, text) from public;
grant execute on function public.update_organization_legal_name(uuid, text) to authenticated;

-- 5. Row Level Security -------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy organizations_select_member on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy organization_members_select_same_org on public.organization_members
  for select to authenticated
  using (public.is_org_member(org_id));

create policy audit_events_select_owner on public.audit_events
  for select to authenticated
  using (org_id is not null and public.is_org_member(org_id, array['owner']));
