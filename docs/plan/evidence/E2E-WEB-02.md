# E2E-WEB-02 — lỗi có kiểm soát trên Web Desk: phiên bản cũ (T18) và kết quả thiếu (T17)

- Ngày: 18/11/2026 (giờ Việt Nam; 17/11/2026 17:55 UTC) · Loại: AUTO · Phụ thuộc: E2E-WEB-01 (DONE) · Acceptance: T17, T18.
- Ghi chú acceptance: T17 và T18 đã PASS ở kiểm thử HTTP/đơn vị từ trước. E2E này thêm bằng chứng ở tầng trình duyệt. Không đổi trạng thái dòng nào trong ma trận (`from-report`: `changes: []`).

## Phạm vi

Hai lỗi có kiểm soát, thực hiện trên trang agent trước bước phân loại của luồng E2E-WEB-01:

1. **T18, phiên bản cũ.** Nhập `expectedVersion = 1` khi case đang ở phiên bản 2. Kỳ vọng: máy chủ trả 409 `version_conflict`; Desk hiện đúng thông báo `desk.result.conflict.version`; case vẫn `submitted`, phiên bản 2.
2. **T17, chuyển thiếu kết quả.** Chọn "Đã giải quyết" mà không chọn kết quả. Kỳ vọng: form chặn ngay (`desk.transition.outcome.required`); không có yêu cầu POST `/transitions` nào đi; case vẫn `submitted`, phiên bản 2.

## Thay đổi

- `tools/e2e/web-e2e.mjs`:
  - đếm yêu cầu POST `/transitions` và phản hồi 409 của trang agent;
  - thêm hai bước lỗi có kiểm soát ở trên, mỗi bước kiểm DB sau khi lỗi xảy ra;
  - đối chiếu lỗi console: số lỗi "status of 409" của trình duyệt phải khớp đúng số phản hồi 409 của chuyển trạng thái. Lỗi console khác vẫn làm E2E thất bại. `summary.json` ghi `transitionConflicts` và `consoleHttp409`.

## Kiểm chứng (lệnh → kết quả)

| # | Lệnh | Kết quả |
|---|---|---|
| 1 | `AFTERVIA_E2E_DESK_PORT=5174 npm run e2e:web` (lần đầu) | exit 0; 15 bước; pageErrors 0; consoleErrors 1, đối chiếu với 1 lỗi 409; transitionConflicts 1 |
| 2 | Mutation: đổi `STALE_VERSION_TEXT` thành chuỗi sai rồi chạy lại | exit 1: "locator.waitFor: Timeout 30000ms exceeded … waiting for getByText('MUTANT-…')". Bước này thất bại khi đầu ra sai |
| 3 | Hoàn nguyên chuỗi đúng rồi chạy lại (lần cuối) | exit 0; 15 bước; ok=true; pageErrors 0; consoleErrors 1, đối chiếu 1/1 |
| 4 | `TEST_DATABASE_URL=…/aftervia_test npm run verify` | exit 0; Test Files 91 passed / 1 skipped (92); Tests 706 passed / 1 skipped (707) |
| 5 | `npx vitest run --reporter=json --outputFile=.loop/vitest.json` | exit 0 |
| 6 | `node tools/loop/matrix.mjs from-report .loop/vitest.json` | `changes: []` |
| 7 | `node tools/loop/matrix.mjs summary` | total 46; PASS 36; MANUAL_PARTIAL 3; NOT_RUN 7 |
| 8 | `npm audit --omit=dev --audit-level=high` | exit 1. Ngoài phạm vi task này và được ghi nhận ở mục dưới |

## Phát hiện ngoài phạm vi (không sửa trong task này)

- `npm audit --omit=dev --audit-level=high` đỏ trên HEAD hiện tại: 27 lỗ hổng (24 high, 3 moderate) trong chuỗi phụ thuộc của Expo 58 (`expo` 58.0.23, `expo-router` 58.0.30, `react-native` 0.88.1), qua `@expo/config*`, `@expo/metro*`, `@react-native/codegen`, `metro`, `picomatch`, `minimatch`, `glob`, `tinyglobby`, `jest-worker`.
- Ghi chú ngày 13/11 trong `05_AUTONOMY_STATUS.md` ghi CI xanh với cổng audit sau khi nâng Expo 58. Lần đo này cho thấy cổng đã đỏ trở lại trên cùng nhánh. Chưa xác định nguyên nhân: có thể lỗ hổng mới được công bố sau 13/11, hoặc lock và cây cài đặt khác với CI. Việc này được chuyển sang task kế tiếp.
- Không nới cổng: không đổi `--omit=dev`, không đổi `--audit-level`.

## Giới hạn

- Chỉ Chromium. Safari và Firefox thuộc DEV-02.
- Hai lỗi là có chủ đích và có kiểm soát, không phải toàn bộ bề mặt lỗi của Desk.
- T17 và T18 vẫn PASS theo kiểm thử HTTP/đơn vị. E2E này không đổi trạng thái ma trận.

## File đổi

- `tools/e2e/web-e2e.mjs`
- `docs/plan/evidence/E2E-WEB-02.md` (tệp này)
- `docs/plan/evidence/AUTO_RUNS/2026-11-17T1755Z.md` (receipt)
- `docs/plan/backlog.json`: thêm task E2E-WEB-02 qua `add`, rồi `start` và `done`
- `docs/plan/02_ACCEPTANCE_MATRIX.csv`: chỉ ngày `last_run`

## Rollback

- Revert commit của E2E-WEB-02. Chỉ một tệp mã đổi. Không có migration, không đổi dữ liệu.
