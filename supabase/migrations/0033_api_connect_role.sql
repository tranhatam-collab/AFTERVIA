-- 0033: vai trò kết nối cho API — D5 trong docs/plan/06_DECISION_QUEUE.md.
--
-- API production không được kết nối bằng superuser. Vai trò này là danh tính kết nối của
-- services/api: mỗi request đi qua withUser (đặt request.jwt.claims rồi SET ROLE authenticated),
-- còn chính vai trò kết nối chỉ giữ đúng ba quyền mà mã máy chủ dùng ngoài withUser
-- (services/api/src/db/session.ts, http/app.ts, billing/ingest.ts).
--
-- Chủ đích thiết kế:
-- - NOINHERIT: là thành viên của authenticated CHỈ để SET ROLE được; quyền của authenticated
--   không tự chảy sang kết nối mặc định. Quên SET ROLE thì truy vấn bảng nghiệp vụ lỗi 42501,
--   không âm thầm trả dữ liệu.
-- - NOBYPASSRLS, NOSUPERUSER: RLS không bao giờ bị vai trò kết nối vượt qua.
-- - KHÔNG cấp service_role: đường lên "service" chỉ qua hàm SECURITY DEFINER có
--   assert_server_caller (0024), không qua SET ROLE.
-- - Mật khẩu KHÔNG đặt trong migration. Đặt ngoài băng từ secret store của môi trường:
--   alter role aftervia_api password '...'; (kiểm thử đặt mật khẩu ngẫu nhiên lúc chạy).
--
-- Vai trò là đối tượng cấp cụm (cluster), sống qua các lần dựng lại schema, nên phần tạo phải
-- có guard; các GRANT trên bảng/hàm chạy lại mỗi lần migration áp lên schema mới.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'aftervia_api') then
    create role aftervia_api login noinherit nosuperuser nobypassrls nocreatedb nocreaterole;
  end if;
end $$;

-- Ép lại thuộc tính MỖI lần áp, không chỉ lúc tạo: vai trò sống qua các lần dựng lại schema,
-- nên nếu nó từng tồn tại với thuộc tính khác (ví dụ inherit), guard ở trên sẽ bỏ qua mà
-- không sửa. Mật khẩu không nằm trong danh sách này nên không bị đụng tới.
alter role aftervia_api login noinherit nosuperuser nobypassrls nocreatedb nocreaterole;

grant authenticated to aftervia_api;

grant usage on schema public to aftervia_api;
grant usage on schema auth to aftervia_api;

-- Đăng nhập dev cục bộ kiểm tra người dùng tồn tại (http/app.ts): đúng một cột, không lộ email.
grant select (id) on auth.users to aftervia_api;

-- recordDenial (db/session.ts) ghi nhật ký từ chối NGOÀI transaction của request, bằng chính
-- vai trò kết nối. Policy giới hạn đúng một loại hàng: vai trò kết nối không dùng được đường
-- này để ghi nhật ký giả cho hành động khác.
grant insert on public.audit_events to aftervia_api;
create policy audit_events_insert_api on public.audit_events
  for insert to aftervia_api
  with check (action = 'authz.denied');

-- ingestBillingWebhook (billing/ingest.ts) gọi hàm server-only. assert_server_caller chấp nhận
-- vì vai trò hiện tại không phải anon/authenticated và không có claims.
grant execute on function public.record_billing_event(text, text, uuid, text, text, timestamptz, bigint, jsonb) to aftervia_api;
