# E2E-ENV-01 — cổng Web Desk của E2E đổi được qua AFTERVIA_E2E_DESK_PORT

- Ngày: 18/11/2026 (giờ Việt Nam; 17/11/2026 17:49 UTC) · Loại: AUTO_PREP · Phụ thuộc: không.
- Nguồn task: chỉ đạo của chủ dự án trong phiên ("DEV ALL E2E LOOP LIÊN TỤC CHO XONG O-LIVE"), 18/11/2026.
- Acceptance: không có T-xx. Đây là hạ tầng kiểm thử. Không đổi trạng thái dòng nào trong `02_ACCEPTANCE_MATRIX.csv`; chỉ cập nhật ngày `last_run` do `from-report`.

## Lý do

- `tools/e2e/web-e2e.mjs` giữ cứng `DESK_PORT = 5173` và `strictPort: true`. Trên máy này cổng 5173 đang bị tiến trình `vite preview --port 5173` (PID 58978) của một dự án khác giữ; thư mục làm việc của tiến trình đó là `.../Devnewproject/Computer.iai.one/apps/web`. Vì vậy E2E không khởi động được.
- Không dừng tiến trình đó: nó không thuộc repo này. Cách sửa đúng là cho phép đổi cổng bằng cấu hình.

## Thay đổi

- `tools/e2e/web-e2e.mjs`: cổng Desk đọc từ `AFTERVIA_E2E_DESK_PORT`. Mặc định vẫn là 5173 khi không đặt biến. Chỉ nhận số nguyên 1024–65535; giá trị khác bị từ chối trước khi mở cổng hay chạm DB. `summary.json` ghi thêm trường `deskPort`.

## Kiểm chứng (lệnh → kết quả)

| # | Lệnh | Kết quả |
|---|---|---|
| 1 | `lsof -nP -iTCP:5173 -sTCP:LISTEN` | PID 58978 giữ 5173 (dự án khác, xem Lý do) |
| 2 | Postgres cục bộ (Postgres.app 17): `pg_ctl start -p 5434`, `createdb aftervia_e2e_test`, `createdb aftervia_test` | exit 0. Dùng 5434 vì 5433 do container Docker `iai-test-pg` giữ; không đụng container đó |
| 3 | `AFTERVIA_E2E_DESK_PORT=5174 TEST_DATABASE_URL=…/aftervia_e2e_test npm run e2e:web` | exit 0; 13 bước đạt. `summary.json`: ok=true, deskPort=5174, pageErrors=0, consoleErrors=0 |
| 4 | `AFTERVIA_E2E_DESK_PORT=abc node tools/e2e/web-e2e.mjs` | bị từ chối: "AFTERVIA_E2E_DESK_PORT must be an integer from 1024 to 65535" |
| 5 | `TEST_DATABASE_URL=…/aftervia_test npm run verify` | exit 0; Test Files 91 passed / 1 skipped (92); Tests 706 passed / 1 skipped (707) |
| 6 | `npx vitest run --reporter=json --outputFile=.loop/vitest.json` | exit 0 |
| 7 | `node tools/loop/matrix.mjs from-report .loop/vitest.json` | `changes: []`: không đổi trạng thái nào |
| 8 | `node tools/loop/matrix.mjs summary` | total 46; PASS 36; MANUAL_PARTIAL 3; NOT_RUN 7 |

Đối chứng trước khi có DB (không phải lỗi mã): `npm run verify` chạy không có `TEST_DATABASE_URL` cho exit 1, với Test Files 55 failed / 36 passed / 1 skipped (92) và Tests 8 failed / 351 passed / 348 skipped (707). Nguyên nhân là test DB báo "database tests are never skipped". Đây là điều kiện hạ tầng. Khi có DB `_test`, verify xanh (dòng 5).

## File đổi

- `tools/e2e/web-e2e.mjs`
- `docs/plan/evidence/E2E-ENV-01.md` (tệp này)
- `docs/plan/evidence/AUTO_RUNS/2026-11-17T1749Z.md` (receipt)
- `docs/plan/05_AUTONOMY_STATUS.md` (nhật ký, thêm cuối tệp)
- `docs/plan/backlog.json`: thêm task E2E-ENV-01 qua `backlog.mjs add`, rồi `start` và `done`
- `docs/plan/02_ACCEPTANCE_MATRIX.csv`: chỉ ngày `last_run` do `from-report`

## Giới hạn

- Đổi cổng không chứng minh thêm điều gì về T-xx.
- E2E vẫn chỉ chạy Chromium; Safari và Firefox thuộc DEV-02 (xem E2E-WEB-01).
- `.loop/` (summary, ảnh, api.log) không commit; `.gitignore` đã chặn.

## Rollback

- Revert commit của E2E-ENV-01. Chỉ một tệp mã đổi. Không có migration, không đổi dữ liệu. Khi cổng 5173 rảnh, chạy `npm run e2e:web` như cũ.
