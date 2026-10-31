# AFTERVIA

Nền tảng phối hợp hậu mãi có chứng cứ: khách hàng, cửa hàng và đơn vị dịch vụ cùng xử lý một hồ sơ sau mua.

> **Trạng thái:** đang trong vòng lặp phát triển P0. Chưa có sản phẩm phát hành. Tên AFTERVIA là tên làm việc, chưa clearance nhãn hiệu. Không có dữ liệu thật, không có thanh toán live, không có production.

## Tài liệu

- Đặc tả gốc (chỉ đọc, có checksum): `docs/spec/AFTERVIA_AZ_2026-10-31/`. Bắt đầu từ `00_START_HERE.md`.
- Kế hoạch thực thi: `docs/plan/00_EXECUTION_PLAN.md`.
- Giao thức vòng lặp tự động: `docs/plan/01_LOOP_PROTOCOL.md`.
- Kiểm toán bộ đặc tả và khoảng trống: `docs/plan/03_BUNDLE_AUDIT.md`.
- Quyết định: `docs/plan/04_DECISIONS.md`.
- Ma trận 46 kiểm thử chấp nhận: `docs/plan/02_ACCEPTANCE_MATRIX.csv`.
- Backlog 60 task: `docs/plan/backlog.json`.

## Thiết lập môi trường

Yêu cầu: Node 22 (xem `.nvmrc`) và PostgreSQL 16.

```bash
cp .env.example .env            # chỉ điền giá trị cục bộ; không commit .env
npm ci                          # .npmrc đã bật legacy-peer-deps (xem DEC-ENG-04)
createdb aftervia_test          # tên DB kiểm thử phải kết thúc bằng _test
export TEST_DATABASE_URL=postgres://postgres:<mật khẩu cục bộ>@127.0.0.1:5432/aftervia_test
npm run verify                  # checksum bộ đặc tả, quét bí mật, typecheck, test, test vòng lặp
```

Các lệnh chính:

| Lệnh | Tác dụng |
|---|---|
| `npm run verify` | Toàn bộ kiểm tra. Đây là điều kiện trước khi đánh dấu task DONE. |
| `npm run check:bundle` | Xác minh checksum bộ đặc tả. |
| `npm run check:secrets` | Quét bí mật trong file đã theo dõi và file chưa bị ignore. |
| `npm run db:migrate` | Áp migration lên `TEST_DATABASE_URL` (chỉ DB `_test`). |
| `npm run loop -- decide` | Cho biết việc tiếp theo của vòng lặp. |
| `npm run loop -- status` | Thống kê backlog theo loại và trạng thái. |

## Nguyên tắc

- Dữ liệu synthetic trong mọi kiểm thử.
- Quyền truy cập được kiểm ở server và trong cơ sở dữ liệu (RLS); giao diện không phải lớp bảo mật.
- Service key không bao giờ đi vào client, repo hay log.
- Không có "PASS" nếu chưa có lần chạy thật.
