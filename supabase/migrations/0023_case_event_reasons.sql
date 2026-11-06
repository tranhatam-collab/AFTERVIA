-- WO11-02e-CASE (T25; Q2 đã QUYẾT, phương án C): lý do trong lịch sử case chuyển sang bảng sửa được.
-- case_events (chỉ thêm) giữ tham chiếu và các trường không có nội dung cá nhân; cột reason luôn NULL.
-- Đã làm: bảng case_event_reasons (RLS theo cùng quy tắc hiển thị của case_events; người đã đăng nhập đọc được theo quy tắc đó);
--   trigger BEFORE INSERT đưa lý do ra bảng riêng trước khi sự kiện được lưu, nên ba hàm ghi hiện có không đổi;
--   sao chép lý do đã có rồi xóa khỏi case_events; ràng buộc reason is null; thu hồi quyền đọc cột reason của case_events.
-- Chưa làm: xóa hẳn cột reason (cần sửa ba hàm ghi: create_case, transition_case và hàm của Desk). Quyền đọc lý do cho người tham gia case
--   chờ quyết định về người tham gia; hiện giữ quy tắc của case_events (người tạo case và thành viên tổ chức).
-- Bước xóa lý do cũ tắt tạm trigger chặn sửa của case_events trong đúng một câu lệnh, rồi bật lại ngay và kiểm số dòng.

-- Lý do của từng sự kiện. Không có khóa ngoại: trigger đưa lý do ra trước khi sự kiện được lưu, và giao dịch bảo đảm không có dòng mồ côi.
create table public.case_event_reasons (
  event_id uuid primary key,
  reason text not null check (char_length(reason) between 1 and 500)
);

alter table public.case_event_reasons enable row level security;

-- Cùng quy tắc hiển thị với case_events: người tạo case hoặc thành viên tổ chức của case.
create policy case_event_reasons_select_visible on public.case_event_reasons
  for select to authenticated
  using (exists (
    select 1
      from public.case_events e
      join public.cases c on c.id = e.case_id
     where e.id = case_event_reasons.event_id
       and (c.created_by = auth.uid() or public.is_org_member(c.org_id))
  ));

revoke all on table public.case_event_reasons from public, anon, authenticated;
grant select (event_id, reason) on public.case_event_reasons to authenticated;

-- Đưa lý do ra bảng riêng trước khi sự kiện được lưu. Sau trigger, cột reason của sự kiện là NULL.
create function public.case_events_reason_out()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.reason is not null then
    insert into public.case_event_reasons (event_id, reason) values (new.id, new.reason);
    new.reason := null;
  end if;
  return new;
end;
$$;

revoke all on function public.case_events_reason_out() from public;

create trigger case_events_reason_out
  before insert on public.case_events
  for each row execute function public.case_events_reason_out();

-- Bỏ ràng buộc không còn đúng với cột luôn NULL. Ràng buộc mới sẽ được thêm sau khi dữ liệu cũ đã được xóa.
alter table public.case_events alter column reason drop not null;
alter table public.case_events drop constraint if exists case_events_reason_check;

-- Sao chép lý do đã có vào bảng riêng.
insert into public.case_event_reasons (event_id, reason)
select e.id, e.reason from public.case_events e where e.reason is not null;

-- Xóa lý do cũ khỏi bảng chỉ thêm: tắt đúng trigger chặn sửa trong một câu lệnh, rồi bật lại ngay.
alter table public.case_events disable trigger case_events_append_only;
update public.case_events set reason = null where reason is not null;
alter table public.case_events enable trigger case_events_append_only;

do $$
begin
  if exists (select 1 from public.case_events where reason is not null) then
    raise exception 'case event reasons were not removed from the append-only table' using errcode = '22023';
  end if;
  if (select count(*) from public.case_event_reasons)
     <> (select count(*) from public.case_events e where exists (select 1 from public.case_event_reasons r where r.event_id = e.id)) then
    raise exception 'case event reasons do not match the copied rows' using errcode = '22023';
  end if;
end;
$$;

alter table public.case_events add constraint case_events_reason_absent check (reason is null);

-- Người đã đăng nhập không đọc cột reason của sự kiện nữa; lý do đọc qua case_event_reasons.
revoke select (reason) on public.case_events from authenticated;
