# MOBILE-BUNDLE-01 — bundle Android khôi phục: Metro phân giải được @aftervia/domain và @aftervia/i18n

- Ngày: 18/11/2026 (17/11/2026 18:02 UTC) · Loại: AUTO_PREP · Acceptance: không có T-xx · Phụ thuộc: không.

## Vấn đề

- `npm run check:mobile-bundle` đỏ (exit 1): `Unable to resolve module @aftervia/domain from apps/mobile/app/privacy.tsx`.
- Nguyên nhân trực tiếp: `@aftervia/domain` và `@aftervia/i18n` không có `package.json`, không có mục nào trong `package-lock.json` (đếm `node_modules/@aftervia`: 0), và repo không khai báo `workspaces`. Hai gói chỉ được khai báo qua `paths` của `apps/mobile/tsconfig.json`. Metro không đọc `paths` này: `app.json` không có `experiments`, và trước task này không có `metro.config`.
- Lịch sử: commit `e015526` (11/11) ghi lần bundle thật đầu tiên exit 0. Hiện không có liên kết `@aftervia` nào trong `node_modules`, nên nguyên nhân gốc của sự khác biệt đó chưa tái hiện được. Không suy đoán thêm.
- Hệ quả: trên HEAD trước task này, bundle Android không dựng được. Cổng `check:mobile-bundle` bắt đúng lỗi này, nhưng cổng không nằm trong `verify` (quyết định D20, mục 2.3 của `10_NEEDS_FROM_OWNER.md`), nên lỗi lọt qua `verify`.

## Thay đổi

- `apps/mobile/metro.config.js` (mới): dựa trên `expo/metro-config`. Ánh xạ `@aftervia/domain` → `packages/domain/src/index.ts` và `@aftervia/i18n` → `packages/i18n/src/index.ts`, cùng nguồn với `tsconfig.json`. Mở rộng `watchFolders` tới `packages/`. Không ánh xạ gói nào khác.

## Kiểm chứng (lệnh → kết quả)

| # | Lệnh | Kết quả |
|---|---|---|
| 1 | `npm run check:mobile-bundle` (trước khi sửa) | exit 1: `Unable to resolve module @aftervia/domain` |
| 2 | `npm run check:mobile-bundle` (sau khi sửa) | exit 0: `mobile bundle OK: 1 Android bundle(s), 2956426 bytes, 4/4 markers present` |
| 3 | `npx --no-install expo export --platform android --source-maps` rồi đếm nguồn trong `.map` | exit 0. 1084 nguồn; 17 nguồn `packages/*`; 0 nguồn từ `picomatch`, `minimatch`, `tinyglobby`, `glob`, `micromatch`, `jest-util`, `@expo/metro-config`, `metro`; `react-native` 417; `expo-router` 106 |
| 4 | `npm run typecheck:mobile` | exit 0 |
| 5 | `TEST_DATABASE_URL=…/aftervia_test npm run verify` | exit 0; Test Files 91 passed / 1 skipped (92); Tests 706 passed / 1 skipped (707) |
| 6 | `npx vitest run --reporter=json` rồi `matrix.mjs from-report` | exit 0; `changes: []`; PASS 36 / MANUAL_PARTIAL 3 / NOT_RUN 7 |
| 7 | `npm run check:mobile-bundle` (lần cuối) | exit 0; 2956425 bytes; 4/4 markers |

Ghi chú về bằng chứng: bundle là Hermes bytecode (`.hbc`). Grep chuỗi trực tiếp trên `.hbc` không cho kết quả, kể cả với chuỗi đối chứng dương `account/deletion`. Vì vậy dùng marker của script (4/4) và sourcemap (đếm nguồn) để kết luận.

## Phát hiện liên quan đến DEP-AUDIT-01

- Sourcemap cho thấy picomatch và các gói chuỗi của nó không nằm trong JS của bundle Android. Chi tiết và cách đọc tại `docs/plan/evidence/DEP-AUDIT-01.md`, mục "Cập nhật cùng ngày".

## Giới hạn

- Chỉ đo Android. iOS chưa được dựng.
- Ánh xạ `@aftervia/*` nằm ở hai nơi: `tsconfig.json` (paths) và `metro.config.js`. Thêm gói mới phải sửa cả hai. Chưa có kiểm tự động so khớp hai nơi này.
- `check:mobile-bundle` vẫn nằm ngoài `verify` (D20, mục 2.3). Chỉ bundle thủ công mới bắt được lỗi này.
- Bundle chạy được không có nghĩa là chạy đúng trên thiết bị. DEV-01 và T34/T35 vẫn NOT_RUN.

## File đổi

- `apps/mobile/metro.config.js` (mới)
- `docs/plan/evidence/MOBILE-BUNDLE-01.md` (tệp này)
- `docs/plan/evidence/AUTO_RUNS/2026-11-17T1802Z.md` (receipt)
- `docs/plan/evidence/DEP-AUDIT-01.md` (cập nhật cuối)
- `docs/plan/10_NEEDS_FROM_OWNER.md` (mục 2.8)
- `docs/plan/backlog.json`: thêm task qua `add`, rồi `start` và `done`
- `docs/plan/05_AUTONOMY_STATUS.md`

## Rollback

- Xóa `apps/mobile/metro.config.js` (revert commit). Khi đó bundle Android đỏ như trước task này.
