-- 0002_items: món đồ cá nhân (WO07-01). Chỉ chủ sở hữu đọc được; ghi chỉ qua hàm SECURITY DEFINER có kiểm tra.
-- Thành viên tổ chức KHÔNG tự có quyền đọc món đồ cá nhân (product/04_ROLES_PERMISSIONS_AND_CONSENT.md).
-- Số serial và mã hóa chưa có trong lát cắt này; cần quản lý khóa trước khi lưu.

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  brand text null check (brand is null or length(brand) <= 100),
  model text null check (model is null or length(model) <= 100),
  purchased_on date null,
  currency char(3) null check (currency is null or currency ~ '^[A-Z]{3}$'),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_owner_created_idx on public.items (owner_user_id, created_at, id);

alter table public.items enable row level security;

create policy items_select_owner on public.items
  for select to authenticated
  using (owner_user_id = auth.uid());

revoke all on public.items from anon, authenticated;
grant select on public.items to authenticated;

create function public.create_item(
  p_title text,
  p_brand text,
  p_model text,
  p_purchased_on date,
  p_currency text
) returns uuid
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
  insert into public.items (owner_user_id, title, brand, model, purchased_on, currency)
  values (v_uid, btrim(p_title), p_brand, p_model, p_purchased_on, p_currency)
  returning id into v_id;
  perform public.write_audit(null, 'item.create', 'item', v_id::text, '{}'::jsonb);
  return v_id;
end;
$$;

-- Khóa lạc quan: phải truyền đúng phiên bản hiện tại; lệch thì 40001 (không ghi đè bản mới hơn).
create function public.update_item(
  p_item uuid,
  p_expected_version integer,
  p_title text,
  p_brand text,
  p_model text,
  p_purchased_on date,
  p_currency text
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.items%rowtype;
  v_new integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into v_row
  from public.items
  where id = p_item and owner_user_id = v_uid
  for update;
  if not found then
    raise exception 'item not found' using errcode = 'P0002';
  end if;
  if v_row.version <> p_expected_version then
    raise exception 'version conflict' using errcode = '40001';
  end if;
  v_new := v_row.version + 1;
  update public.items
     set title = btrim(p_title),
         brand = p_brand,
         model = p_model,
         purchased_on = p_purchased_on,
         currency = p_currency,
         version = v_new,
         updated_at = now()
   where id = p_item;
  perform public.write_audit(null, 'item.update', 'item', p_item::text, jsonb_build_object('version', v_new));
  return v_new;
end;
$$;

revoke all on function public.create_item(text, text, text, date, text) from public;
grant execute on function public.create_item(text, text, text, date, text) to authenticated;

revoke all on function public.update_item(uuid, integer, text, text, text, date, text) from public;
grant execute on function public.update_item(uuid, integer, text, text, text, date, text) to authenticated;
