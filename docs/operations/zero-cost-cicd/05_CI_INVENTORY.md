# 05 — Kiểm kê `.github/workflows/ci.yml`

Nguồn: đọc toàn bộ tệp 100 dòng trong lượt này. [V]

## Thông số

| Mục | Giá trị | Dòng |
|---|---|---|
| Tên workflow | `ci` | 1 |
| Trigger | `pull_request` (mọi nhánh); `push` chỉ nhánh `main` | 3–6 |
| Quyền GITHUB_TOKEN | `contents: read` | 8–9 |
| Job | `verify`, `e2e-web`, `groundstead-verify` (chạy song song, không có `needs`) | 12, 42, 72 |
| Runner | `ubuntu-latest` | 13, 43, 73 |
| Dịch vụ | Postgres 16 ở `verify` và `e2e-web` | 14–26, 44–56 |
| Biến kết nối test | `TEST_DATABASE_URL`, trỏ tới localhost trong container của job | 28, 58 |
| Cài Node | `actions/setup-node` (ghim SHA), `node-version-file: .nvmrc`, `cache: npm` | 31–34, 61–64, 76–79 |
| Cài phụ thuộc | `npm ci` ở `verify` (35) và `e2e-web` (65); `groundstead-verify` chỉ khi có `groundstead/` (95) | — |
| Trình duyệt | `npx playwright install --with-deps chromium` ở `e2e-web` (67) và `groundstead-verify` (91, có điều kiện) | — |
| Lệnh kiểm | `npm run verify` và `npm audit --omit=dev --audit-level=high` (`verify`); `npm run e2e:web` (`e2e-web`); `npm run verify` trong `groundstead/` (98–99, có điều kiện) | — |
| Artifact, cache riêng | không có | — |
| Secrets | không tham chiếu | — |
| `timeout-minutes` | không khai báo; dùng mặc định của GitHub | — |
| `concurrency` | không khai báo | — |
| Ghim action | `actions/checkout@11d5960a…`, `actions/setup-node@49933ea5…` (tag v4) | 30–31 (và tương tự ở job khác) |

## Chi phí tiềm ẩn theo thiết kế

Đây là phân tích tĩnh từ cấu hình. Chưa đo được phút thực tế.

1. **Ba job chạy song song mỗi lần.** Mỗi job có chi phí khởi tạo runner, checkout và setup-node riêng. [V] cấu trúc; [R] tác động.
2. **`npm ci` chạy tối đa ba lần mỗi lần chạy** (verify, e2e-web, groundstead). Cache npm giảm thời gian tải nhưng không bỏ được bước cài. [V]
3. **`playwright install --with-deps` chạy ở hai job.** Bước này cài gói hệ thống qua apt mỗi lần, thường là bước tốn thời gian nhất ngoài test. [R] chưa đo.
4. **`groundstead-verify` chạy trên mọi PR**, kể cả khi `groundstead/` không có. Job vẫn khởi tạo runner và checkout rồi thoát. [V]
5. **Không có `concurrency`.** Nhiều push liên tiếp lên cùng PR tạo nhiều run song song, và run cũ không bị hủy. Bằng chứng: PR #2 có run 42869040802 lúc 17:50:29 và run 42869079792 lúc 17:50:42, cách nhau 13 giây. [V]
6. **Không có `timeout-minutes`.** Job bị treo có thể tiêu phút đến mức mặc định của GitHub. [V] cấu hình; [R] mức mặc định.
7. **`e2e-web` và `verify` chạy song song.** PR đỏ ở `verify` vẫn kích hoạt `e2e-web` đầy đủ. [V]

## Ghi chú

- Ghim SHA cho action là điểm tốt về chuỗi cung ứng. Giữ nguyên.
- `TEST_DATABASE_URL` trong workflow là chuỗi kết nối tới Postgres trong container của job, dùng dữ liệu test. Giá trị không được ghi vào tài liệu này. [V]
- Không có tệp workflow nào khác ngoài `ci.yml`. [V]
