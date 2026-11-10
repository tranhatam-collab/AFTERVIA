# OWN-A-03: khóa bề mặt quyền hàm dưới quyền mặc định của Supabase (D-01, lớp rộng)

- Ngày 10/11/2026. Nhánh `ccr-4544c9f7-b1t50m`. Migration mới: `0026_client_function_surface.sql`.
- Vấn đề: migration 0024 và 0025 xử lý từng hàm được nêu tên. Nhưng trên Supabase, quyền mặc định
  cấp EXECUTE cho `anon` và `authenticated` với mọi hàm mới trong schema `public`, nên mọi hàm chỉ
  `revoke ... from public` vẫn gọi được qua RPC. Shim kiểm thử cục bộ không mô phỏng điều này, nên
  bộ test không thể thấy lớp lỗ hổng đó.

## Đo trước khi sửa

Dựng DB thử `aftervia_privfp_test` bằng shim + `alter default privileges in schema public grant
execute on functions to anon, authenticated` + toàn bộ migration, rồi liệt kê:

- 57 hàm trong schema `public`; **40 hàm gọi được bởi cả `anon` và `authenticated`**; cả 40 đều là
  SECURITY DEFINER. Trong đó có `approve_break_glass`, `request_break_glass`,
  `read_case_for_break_glass`, `read_case_document`, `store_export`, `fetch_export_file`,
  `record_upload_inspection`, `desk_inbox`, `case_outcome_kpis`.
- Hàm được gọi bên trong RLS policy: chỉ `is_org_member`. Vai trò truy vấn cần EXECUTE trên hàm đó,
  nên nó phải ở lại bề mặt client.
- `kill_switch_enabled` chỉ được gọi từ `enforce_sharing_kill_switch`, là SECURITY DEFINER, nên
  chuỗi gọi không cần quyền của vai trò client. Không policy nào tham chiếu nó. (0025 để ngỏ hàm này
  vì chưa kiểm được điểm đó.)

## Đã làm

1. `tests/support/local-auth-shim.sql`: thêm `alter default privileges in schema public grant execute
   on functions to anon, authenticated`, chạy TRƯỚC migration. Từ nay mọi test chạy trên nền quyền
   giống Supabase.
2. `tests/security/function-privileges-surface.test.ts` (3 kiểm thử): liệt kê toàn bộ hàm không phải
   trigger trong `public` và khẳng định `anon` không gọi được hàm nào, còn `authenticated` gọi được
   đúng 39 hàm của bề mặt client đã rà.
3. `supabase/migrations/0026_client_function_surface.sql`: thu EXECUTE của `anon` trên mọi hàm hiện có
   (vòng lặp theo `pg_proc`, bỏ qua hàm của extension), thu thêm `kill_switch_enabled` khỏi
   `authenticated`, và một khối kiểm cuối raise nếu `anon` còn gọi được hàm nào.

## Phát hiện về PostgreSQL, đã ghi vào migration

`alter default privileges ... revoke execute on functions` **không** chặn được quyền EXECUTE tích hợp
mà Postgres cấp cho PUBLIC trên hàm mới. Đã đo bốn biến thể trên PostgreSQL 16, cả trong transaction
và trên kết nối mới: kể cả khi bản ghi `pg_default_acl` còn lại không có mục PUBLIC (ví dụ
`{service_role=X/postgres}`), hàm tạo sau vẫn nhận `=X/postgres`. Vậy không có cách khai báo "hàm mới
mặc định chỉ máy chủ gọi được". Dòng lệnh đó đã được bỏ khỏi 0026 và thay bằng ghi chú.

Chốt kiểm soát là test liệt kê: hàm mới luôn hiện ra là client gọi được, nên test đỏ cho tới khi có
migration thu quyền tường minh, hoặc hàm được thêm vào bề mặt đã rà một cách có chủ đích. Kiểm thứ ba
trong tệp test khẳng định đúng tính chất này.

## Trạng thái sau khi sửa, đo trên DB kiểm thử

| Chỉ số | Giá trị |
|---|---|
| Hàm không phải trigger trong `public` | 48 |
| PUBLIC có EXECUTE trên | **0** |
| `anon` có EXECUTE trên | **0** |
| Hàm có `proacl` NULL (tức dùng mặc định tích hợp) | 0 |
| `authenticated` có EXECUTE trên | 39, đúng bằng danh sách trong test |

Ví dụ: `accept_family_invitation(uuid)` → `{postgres=X/postgres,authenticated=X/postgres}`.

## Cổng

- Test riêng tệp mới: đỏ trước 0026 (`anon` gọi được 40 hàm), xanh sau 0026, 3/3.
- `npm run verify`: exit 0. Bundle 69/69; quét bí mật 440 tệp; **522 test đạt, 1 bỏ qua** (trước: 519);
  67 tệp test đạt, 1 bỏ qua; test loop 18/18.
- `npm run e2e:web`: exit 0, E2E-WEB-01 đạt.
- Đột biến: bỏ 0026 làm đỏ 2 trong 3 kiểm thử của tệp mới, và `anon` trở lại gọi được 40 hàm.

## Giới hạn

- `alter default privileges` chỉ áp cho đối tượng do chính vai trò cấp tạo ra. Trên Supabase thật,
  bản ghi quyền mặc định thuộc vai trò của Supabase, nên **phải kiểm lại quyền hàm trên dự án thật
  trước lần deploy đầu tiên**. Không có dự án Supabase nào đang chạy schema này (audit 10/11).
- Bề mặt 39 hàm cho `authenticated` là trạng thái hiện tại đã rà, chưa phải bề mặt tối thiểu.
  `record_upload_inspection` (D-04) và `check_document_access` còn mở cho client; thu hẹp hai hàm này
  cần xem lại đường gọi của test và của Desk, để lượt sau.
