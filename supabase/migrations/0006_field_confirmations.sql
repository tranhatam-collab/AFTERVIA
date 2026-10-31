-- WO06-05: dịch vụ xác nhận trường. Mỗi xác nhận là một bản ghi chỉ được thêm.
-- Actor lấy từ phiên (auth.uid()), không nhận từ đầu vào; thời điểm do cơ sở dữ liệu gán.
-- Giá trị cũ và mới lưu dạng jsonb. Giá trị vắng mặt chỉ được xác nhận với lý do 'confirmed_absent' (khớp WO06-03).
-- Trigger chặn UPDATE, DELETE và TRUNCATE, kể cả với chủ bảng.
-- Hạn chế còn lại: chưa có bảng extraction nên chưa có khóa ngoại và chưa kiểm quyền sở hữu extraction.

create table public.field_confirmations (
  id uuid primary key default gen_random_uuid(),
  extraction_id uuid not null,
  field_path text not null
    check (char_length(field_path) between 1 and 120 and field_path ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$'),
  old_value jsonb
    check (old_value is null or (jsonb_typeof(old_value) <> 'null' and octet_length(old_value::text) <= 8192)),
  new_value jsonb
    check (new_value is null or (jsonb_typeof(new_value) <> 'null' and octet_length(new_value::text) <= 8192)),
  new_absent_reason text check (new_absent_reason = 'confirmed_absent'),
  actor_user_id uuid not null,
  confirmed_at timestamptz not null default now(),
  check ((new_value is null) = (new_absent_reason is not null))
);

create index field_confirmations_extraction_idx on public.field_confirmations (extraction_id, confirmed_at);

-- Chỉ được thêm. Không ai, kể cả chủ bảng, được sửa, xóa hay xóa toàn bộ.
create function public.forbid_field_confirmation_mutation() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'field_confirmations is append-only: % is not allowed', tg_op using errcode = '42501';
end;
$$;

create trigger field_confirmations_no_update_delete
  before update or delete on public.field_confirmations
  for each row execute function public.forbid_field_confirmation_mutation();

create trigger field_confirmations_no_truncate
  before truncate on public.field_confirmations
  for each statement execute function public.forbid_field_confirmation_mutation();

revoke all on function public.forbid_field_confirmation_mutation() from public;

alter table public.field_confirmations enable row level security;

-- Chỉ người xác nhận đọc được bản ghi của mình. Quyền đọc theo tổ chức chờ bảng extraction và case.
create policy field_confirmations_select_actor on public.field_confirmations
  for select to authenticated
  using (actor_user_id = auth.uid());

revoke all on table public.field_confirmations from public, anon, authenticated;
grant select (id, extraction_id, field_path, old_value, new_value, new_absent_reason, actor_user_id, confirmed_at)
  on public.field_confirmations to authenticated;

create function public.record_field_confirmation(
  p_extraction_id uuid,
  p_field_path text,
  p_old_value jsonb,
  p_new_value jsonb,
  p_new_absent_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_new uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_extraction_id is null then
    raise exception 'extraction is required' using errcode = '22023';
  end if;
  if p_field_path is null or char_length(p_field_path) not between 1 and 120
     or p_field_path !~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$' then
    raise exception 'invalid field path' using errcode = '22023';
  end if;
  if p_old_value is not null and (jsonb_typeof(p_old_value) = 'null' or octet_length(p_old_value::text) > 8192) then
    raise exception 'invalid old value' using errcode = '22023';
  end if;
  if p_new_value is not null and (jsonb_typeof(p_new_value) = 'null' or octet_length(p_new_value::text) > 8192) then
    raise exception 'invalid new value' using errcode = '22023';
  end if;
  if p_new_value is null and p_new_absent_reason is distinct from 'confirmed_absent' then
    raise exception 'an absent value needs the confirmed_absent reason' using errcode = '22023';
  end if;
  if p_new_value is not null and p_new_absent_reason is not null then
    raise exception 'a present value cannot carry an absence reason' using errcode = '22023';
  end if;

  insert into public.field_confirmations (extraction_id, field_path, old_value, new_value, new_absent_reason, actor_user_id)
  values (p_extraction_id, p_field_path, p_old_value, p_new_value, p_new_absent_reason, v_uid)
  returning id into v_new;

  perform public.write_audit(null, 'field.confirm', 'field_confirmation', v_new::text,
    jsonb_build_object('extraction', p_extraction_id, 'field_path', p_field_path));
  return v_new;
end;
$$;

revoke all on function public.record_field_confirmation(uuid, text, jsonb, jsonb, text) from public;
grant execute on function public.record_field_confirmation(uuid, text, jsonb, jsonb, text) to authenticated;
