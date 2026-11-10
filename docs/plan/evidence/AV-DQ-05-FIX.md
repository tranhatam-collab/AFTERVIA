# AV-DQ-05-FIX — Siết cổng E2E-WEB-01: kiểm `consoleErrors` và version cuối (T24, T17, T19, T20)

- Ngày: 08/11/2026 · Loại: AUTO · Gate: P0 · Phụ thuộc: không.
- **Vượt ngân sách vòng lặp đã ghi (65/60→65 đã dùng hết, STOP_BUDGET).** Task này được làm theo chỉ thị trực tiếp của chủ dự án trong chat ("all" — sau khi tôi liệt kê các việc làm được không cần chờ vendor/CI), không phải vòng lặp tự động tiếp tục trên ngân sách cũ. Ghi rõ ở đây để không lẫn với một lượt AUTO tự quyết.
- Nguồn mở task: `AV-DQ-05` trong audit độc lập 04/11 (`docs/plan/evidence/independent-decision-review-2026-11-04/REPORT_DELTA.md` §4): `tools/e2e/web-e2e.mjs` thu `consoleErrors` (dòng ~187 lúc đó) nhưng chỉ dùng `pageErrors` để quyết định `ok`; đoạn kiểm case cuối (`closed`/`repaired`) không kiểm `version`, nên một fixture ở `version 99` (do replay/trùng bước) vẫn qua được gate. Xác nhận lại bằng 6 "source-logic probe" độc lập của chính audit đó.

## Phạm vi đã làm

- `tools/e2e/web-e2e.mjs`:
  - Thêm kiểm `caseRow.version !== 6` ngay sau kiểm `status`/`outcome` cuối luồng (5 chuyển trạng thái từ `draft` v1 → `closed` v6: submitted, triaged, in_progress, resolved, closed).
  - `summary.ok` nay đòi cả `pageErrors.length === 0` **và** `consoleErrors.length === 0` (trước chỉ đòi `pageErrors`).
- Không đổi luồng nghiệp vụ, không đổi UI, không đổi migration.

## Kiểm chứng

| Lệnh | Kết quả |
|---|---|
| Dựng lại Postgres cục bộ (`Postgres.app` 17, cổng 5433 — scratch cũ đã mất sau khoảng nghỉ 6 ngày) + `node tools/db/migrate.mjs --with-shim` | 24 migration applied, 0 already applied |
| `npm install --save-dev playwright` + `npx playwright install chromium` | Thêm devDependency thật (trước đó `AFTERVIA_E2E_PLAYWRIGHT` chỉ trỏ ra ngoài repo, không tái lập được); không có vulnerability mới (vẫn 18, như trước khi cài) |
| `npm run e2e:web` (có `TEST_DATABASE_URL` thật) | `E2E-WEB-01: đạt`; log in ra `phiên bản 6` — xác nhận kiểm version mới không vỡ luồng thật đang đi đúng (negative case version≠6 chưa được tái hiện độc lập trong task này, chỉ xác nhận gate mới không false-positive trên luồng đúng) |
| `npm run verify` (có `TEST_DATABASE_URL` thật) | exit 0; không có gì đỏ thêm |

## Giới hạn

- Chưa tái hiện trường hợp version sai thật (ví dụ ép DB vào version 99 rồi chạy lại E2E để xác nhận gate mới **thật sự** throw) — chỉ dựa vào đọc logic và xác nhận luồng đúng vẫn qua. Nên làm việc này trước khi coi gate đã được adversarial-test đầy đủ.
- Chưa đưa `e2e:web` vào CI/`npm run verify` chính thức (vẫn ngoài CI theo `LOCAL_MACOS.md` mục 12 — cần Playwright/Chromium cục bộ).
- Không động tới 3 P2 còn lại của AV-DQ (AV-DQ-02 recent-auth, AV-DQ-03 export one-time contract, AV-DQ-04 sole-owner fallback) — làm ở task riêng.
