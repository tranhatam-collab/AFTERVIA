# E2E-WEB-01 — E2E Chromium: luồng web đầy đủ qua API cục bộ và Web Desk (T24) — DONE trên container Linux; chưa chạy trong CI

- Ngày: 03/11/2026 · Loại: AUTO · Gate: P0 · Phụ thuộc: WO10-03f (DONE), WO26-02 (DONE). Acceptance: T24 (bước xuất gói).
- Mức hoàn thành: `npm run e2e:web` chạy trọn luồng trên DB `_test` cục bộ, Chromium có sẵn, API cục bộ thật và Desk dev server thật. Mọi bước đạt, không có lỗi trang, không có lỗi console.
- Chưa có trong CI và không nằm trong `npm run verify` (cần Playwright và Chromium cục bộ). Ma trận T24 không đổi (PARTIAL), vì kết quả E2E không đi qua báo cáo Vitest và không cập nhật ma trận bằng tay.
- Safari và Firefox thuộc DEV-02, không làm ở đây.
- Liên quan bảo mật: đường dẫn proxy `/v1` chỉ có trong máy chủ phát triển (`apps/web/vite.config.ts`, không ảnh hưởng bản build). **Chờ reviewer độc lập** (quy tắc 9). Không tự gọi là đã duyệt.

## Luồng đã chạy (12 bước, mỗi bước là một kết quả quan sát được)

1. Đặt lại DB `_test` (schema, shim, migration) và tạo 4 người dùng tổng hợp.
2. API cục bộ nghe tại `127.0.0.1:8787` (healthy trước khi tiếp tục).
3. Tổ chức và thành viên agent tạo qua API (chủ cửa hàng, agent).
4. Web Desk (Vite dev server) nghe tại `127.0.0.1:5173`.
5. Khách thêm món trên Desk; mã món lấy từ `GET /v1/items` để điền form mở case.
6. Khách mở case trên Desk: thông báo "Đã mở case <id>. Trạng thái: Nháp. Phiên bản: 1."
7. Bằng chứng gắn và người tham gia mời qua hàm cơ sở dữ liệu `attach_case_evidence` và `invite_case_participant` (chỉ metadata; tài liệu đã tải xong, scanner không khả dụng, như các kiểm thử HTTP).
8. Khách gửi case trên Desk: "Đã chuyển sang Đã gửi. Phiên bản mới: 2."
9. Khách chia tài liệu cho người tham gia trên Desk: "Đã chia tài liệu. Mã quyền: <id>."; kiểm bằng `check_document_access` rằng người tham gia được phép đọc metadata.
10. Agent (trình duyệt riêng, token riêng) xử lý trên Desk: phân loại (3), xử lý (4), giải quyết có outcome `repaired` (5), đóng (6).
11. Kiểm cơ sở dữ liệu: `cases.status = closed`, `outcome = repaired`, `version = 6`.
12. Khách tạo gói xuất trên Desk: "Đã tạo gói xuất <id>. Trạng thái: Đã xong." (T24). Kiểm: khu vực xuất không có liên kết `a[href]`; dòng tồn tại trong `public.export_jobs`.

Kết quả lần chạy cuối: `summary.json` có `ok: true`, 12 bước, `pageErrors: 0`, `consoleErrors: 0`. Nhật ký API không chứa URL DB (0 lần khớp). Ảnh cuối: `.loop/e2e/customer-final.png` và `.loop/e2e/merchant-final.png` (ở `.loop/`, không commit).

## Lỗi phát hiện trong lượt và cách khắc phục

- **Desk không resolve được `@aftervia/domain` khi chạy dev.** `apps/web/vite.config.ts` chỉ có alias `@aftervia/i18n`; các tệp `forms.ts` và `actions.ts` import `@aftervia/domain`. Máy chủ dev báo "Failed to resolve import" và giao diện không hiển thị (E2E hết thời gian chờ nút "Thêm món"). Đã thêm alias `@aftervia/domain` trỏ tới `packages/domain/src/index.ts`, giống `vitest.config.ts`. `npm run build:web` đạt trước và sau khi sửa; bundle không còn import trần `@aftervia/*`. Lưu ý: `build:web` không báo lỗi trước khi sửa, nên verify không bắt được lỗi này; chỉ luồng chạy trong trình duyệt thấy được.
- **Tên cột sai trong kiểm tra cơ sở dữ liệu.** Truy vấn dùng `state`; cột thật là `status` (`supabase/migrations/0008_cases.sql`). Đã sửa; không ảnh hưởng luồng ứng dụng.
- **Lỗi của chính harness** (đã sửa trước lần chạy cuối): kiểm quyền đọc của người tham gia đọc `rows` sai cách. Không phải lỗi sản phẩm.

## Kiểm chứng

| Lệnh | Kết quả |
|---|---|
| `npm run e2e:web` (TEST_DATABASE_URL từ CI trong cùng lệnh; `AFTERVIA_E2E_PLAYWRIGHT` trỏ tới gói Playwright có sẵn) | 3 lần chạy: lần 1 hết thời gian chờ (Desk không resolve domain); lần 2 lỗi cột `state`; lần 3 đạt 12/12 bước |
| `npm run build:web` sau khi thêm alias | exit 0; không còn import trần |
| `npm run verify` (URL từ CI trong cùng lệnh) | exit 0. Bundle 69/69; quét bí mật 300 tệp, 5 luật; Vitest 58 tệp pass và 1 bỏ qua, 437 kiểm thử pass và 1 bỏ qua; test:loop 18/18 |
| Vitest JSON (`.loop/vitest.json`) | `success=true`; 437 pass, 0 fail, 1 pending, trên 438 kiểm thử |
| `node tools/loop/matrix.mjs from-report .loop/vitest.json` | `changes: []`; PASS 33, NOT_RUN 13, FAIL 0; PARTIAL 42, NONE 4 |
| HawkScan (DAST) | **BLOCKED**: không có `hawk`; `HAWK_API_KEY` chưa đặt; không có `stackhawk.yml` |

## Giới hạn và phần còn chờ

1. Không chạy trong CI và không nằm trong `npm run verify`. Cần Playwright và Chromium cục bộ (mục 12 của `LOCAL_MACOS.md`).
2. Chỉ Chromium. Safari và Firefox thuộc DEV-02.
3. Bằng chứng gắn bằng hàm cơ sở dữ liệu vì form mở case của Desk chưa gửi `shared_document_ids` (đã ghi ở WO10-03e). Desk chưa có luồng chọn tài liệu.
4. Agent được chọn bằng cách mở một trình duyệt khác với token khác và gõ mã case; Desk chưa có danh sách case theo người dùng.
5. Xuất gói chỉ kiểm bằng thông báo của Desk và dòng trong `export_jobs`. Chưa tải được gói (HUM-WO10-03a).
6. Giao diện Desk còn tối giản (ảnh chụp không có CSS). Đã ghi ở WO10-01.
7. Ma trận T24 vẫn PARTIAL vì E2E không đi qua Vitest. Không cập nhật tay.
8. Chờ reviewer độc lập cho đường dẫn proxy phát triển và luồng xuất gói.

## Rollback

- Revert commit của lượt này. Không có migration. Xóa `tools/e2e/web-e2e.mjs`; bỏ `e2e:web` trong `package.json`; bỏ alias `@aftervia/domain` và khối `server.proxy` trong `apps/web/vite.config.ts` (trở về trạng thái ở `1dbd9a1`); `docs/dev/LOCAL_MACOS.md` trở về trạng thái ở `1dbd9a1`.
