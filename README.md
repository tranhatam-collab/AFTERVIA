# AFTERVIA

Nền tảng phối hợp hậu mãi có chứng cứ: khách hàng, cửa hàng và đơn vị dịch vụ cùng xử lý một hồ sơ sau mua.

> **Trạng thái:** đang trong vòng lặp phát triển P0, chỉ dùng dữ liệu synthetic. Đã có khung repo, CI, trình chạy migration, shim auth cục bộ và kiểm thử bảo mật nền. Chưa có sản phẩm để phát hành. Tên AFTERVIA là tên làm việc, chưa clearance nhãn hiệu. Không có dữ liệu thật, thanh toán live hay production.

## Tài liệu

- Đặc tả gốc (chỉ đọc, có checksum): `docs/spec/AFTERVIA_AZ_2026-10-31/`. Bắt đầu từ `00_START_HERE.md`.
- Kế hoạch thực thi: `docs/plan/00_EXECUTION_PLAN.md`.
- Giao thức vòng lặp tự động: `docs/plan/01_LOOP_PROTOCOL.md`.
- Kiểm toán bộ đặc tả và khoảng trống: `docs/plan/03_BUNDLE_AUDIT.md`.
- Quyết định: `docs/plan/04_DECISIONS.md`.
- Ma trận 46 kiểm thử chấp nhận: `docs/plan/02_ACCEPTANCE_MATRIX.csv`.
- Backlog 60 task: `docs/plan/backlog.json`.
- Bộ công cụ khám phá (chưa có phỏng vấn): `docs/plan/discovery/`.
- Bảo mật và xử lý sự cố: `SECURITY.md`.

## Yêu cầu

- Node.js 22 (xem `.nvmrc`).
- PostgreSQL 16 chạy cục bộ. Chỉ dùng cho cơ sở dữ liệu có tên kết thúc bằng `_test`.

## Thiết lập sạch

```bash
git clone <địa chỉ repo> && cd AFTERVIA
npm ci                                  # .npmrc đã bật legacy-peer-deps (DEC-ENG-04)
createdb aftervia_test                  # tên bắt buộc kết thúc bằng _test
export TEST_DATABASE_URL='postgres://<user>:<mật khẩu cục bộ>@127.0.0.1:5432/aftervia_test'
npm run db:migrate -- --with-shim       # chỉ cho DB _test; shim auth không dùng cho Supabase
npm run verify                          # checksum đặc tả, quét bí mật, typecheck, test, test vòng lặp
```

Lưu ý:
- Biến được đọc từ môi trường của shell. Tệp `.env` không được tự nạp.
- Không ghi mật khẩu hay khóa vào repo. Dùng `.env.example` để biết tên biến.
- Kiểm thử cơ sở dữ liệu không bao giờ bị bỏ qua. Thiếu `TEST_DATABASE_URL` là lỗi.

## Lệnh chính

| Lệnh | Tác dụng |
|---|---|
| `npm run verify` | Toàn bộ kiểm tra. Điều kiện trước khi đánh dấu task DONE. |
| `npm run check:bundle` | Xác minh checksum bộ đặc tả. |
| `npm run check:secrets` | Quét bí mật trong file đã theo dõi và file chưa bị ignore. |
| `npm run typecheck` | Kiểm tra kiểu TypeScript. |
| `npm test` | Vitest, gồm kiểm thử cơ sở dữ liệu. |
| `npm run db:migrate -- --with-shim` | Áp migration lên `TEST_DATABASE_URL` (chỉ DB `_test`). |
| `npm run loop -- decide` | Cho biết việc tiếp theo của vòng lặp. |
| `npm run loop -- status` | Thống kê backlog theo loại và trạng thái. |

Cập nhật ma trận kiểm thử từ báo cáo chạy thật:

```bash
npx vitest run --reporter=json --outputFile=.loop/vitest.json
node tools/loop/matrix.mjs from-report .loop/vitest.json
```

## Nguyên tắc

- Dữ liệu synthetic trong mọi kiểm thử.
- Quyền truy cập được kiểm ở server và trong cơ sở dữ liệu (RLS). Giao diện không phải lớp bảo mật.
- Service key không bao giờ đi vào client, repo hoặc log.
- Không có "PASS" nếu chưa có lần chạy thật.
