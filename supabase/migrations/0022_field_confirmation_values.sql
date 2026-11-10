-- WO11-02e-CONF (T25; Q2 đã QUYẾT, phương án C): giá trị cũ và mới của xác nhận trường chuyển sang bảng sửa được.
-- field_confirmations (chỉ thêm) giữ tham chiếu: mã, người xác nhận, thời điểm, tên trường và lý do vắng mặt. Không còn cột giá trị.
-- Đã làm: bảng field_confirmation_values (RLS; người xác nhận đọc được giá trị của mình; người dùng không ghi trực tiếp);
--   trigger giữ nhất quán giữa giá trị mới vắng mặt và lý do xác nhận; sao chép giá trị hiện có và kiểm số dòng;
--   record_field_confirmation ghi cả hai bảng trong một giao dịch; bỏ cột giá trị khỏi bảng chỉ thêm.
-- Chưa làm: hàm xóa giá trị theo yêu cầu (chưa có quy tắc, thuộc WO11-02d). Quyền đọc theo tổ chức chờ bảng extraction và case.
-- Không sửa migration đã áp dụng: thay hàm bằng create or replace; bỏ cột bằng alter table.

-- Giá trị của một xác nhận. Một dòng cho mỗi xác nhận; không có quyền ghi cho người dùng cuối.
-- Không dùng khóa ngoại: TRUNCATE trên bảng được khóa ngoại tham chiếu bị chặn trước khi trigger chạy (0A000),
-- nên sẽ đổi mã lỗi của chốt chỉ thêm. Tham chiếu được kiểm trong trigger bên dưới; bản ghi tham chiếu không xóa được.
create table public.field_confirmation_values (
  confirmation_id uuid primary key,
  old_value jsonb
    check (old_value is null or (jsonb_typeof(old_value) <> 'null' and octet_length(old_value::text) <= 8192)),
  new_value jsonb
    check (new_value is null or (jsonb_typeof(new_value) <> 'null' and octet_length(new_value::text) <= 8192))
);

alter table public.field_confirmation_values enable row level security;

-- Người xác nhận đọc được giá trị của xác nhận mà mình đã ghi. Người khác không thấy.
create policy field_confirmation_values_select_actor on public.field_confirmation_values
  for select to authenticated
  using (exists (
    select 1 from public.field_confirmations f
     where f.id = confirmation_id and f.actor_user_id = auth.uid()
  ));

revoke all on table public.field_confirmation_values from public, anon, authenticated;
grant select (confirmation_id, old_value, new_value) on public.field_confirmation_values to authenticated;

-- Tham chiếu phải tồn tại. Giá trị vắng mặt chỉ đi với lý do confirmed_absent, và giá trị có mặt không mang lý do.
-- Trigger giữ các quy tắc này khi thêm và sửa.
create function public.field_confirmation_values_consistent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reason text;
begin
  select f.new_absent_reason into v_reason from public.field_confirmations f where f.id = new.confirmation_id;
  if not found then
    raise exception 'confirmation not found' using errcode = 'P0002';
  end if;
  if (new.new_value is null) <> (v_reason is not null) then
    raise exception 'an absent value needs the confirmed_absent reason, and a present value cannot carry one' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.field_confirmation_values_consistent() from public;

create trigger field_confirmation_values_consistent
  before insert or update on public.field_confirmation_values
  for each row execute function public.field_confirmation_values_consistent();

-- Sao chép giá trị hiện có, rồi kiểm: mỗi xác nhận có đúng một dòng giá trị.
insert into public.field_confirmation_values (confirmation_id, old_value, new_value)
select f.id, f.old_value, f.new_value from public.field_confirmations f;

do $$
begin
  if (select count(*) from public.field_confirmation_values) <> (select count(*) from public.field_confirmations) then
    raise exception 'field confirmation values were not copied for every confirmation' using errcode = '22023';
  end if;
end;
$$;

-- Ghi xác nhận: validate như trước; dòng tham chiếu vào bảng chỉ thêm, giá trị vào bảng sửa được, trong một giao dịch.
create or replace function public.record_field_confirmation(
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

  insert into public.field_confirmations (extraction_id, field_path, new_absent_reason, actor_user_id)
  values (p_extraction_id, p_field_path, p_new_absent_reason, v_uid)
  returning id into v_new;

  insert into public.field_confirmation_values (confirmation_id, old_value, new_value)
  values (v_new, p_old_value, p_new_value);

  perform public.write_audit(null, 'field.confirm', 'field_confirmation', v_new::text,
    jsonb_build_object('extraction', p_extraction_id, 'field_path', p_field_path));
  return v_new;
end;
$$;

revoke all on function public.record_field_confirmation(uuid, text, jsonb, jsonb, text) from public;
grant execute on function public.record_field_confirmation(uuid, text, jsonb, jsonb, text) to authenticated;

-- Bỏ giá trị khỏi bảng chỉ thêm. Ràng buộc và quyền cột liên quan bị bỏ theo cột; nội dung đã nằm trong field_confirmation_values.
alter table public.field_confirmations drop column old_value, drop column new_value;
