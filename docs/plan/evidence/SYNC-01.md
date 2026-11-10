# SYNC-01: đồng bộ 10 commit phần gốc từ PR #2 sang nhánh PR #1

- Ngày: 10/11/2026. Nhánh: `ccr-4544c9f7-b1t50m`. Nền trước sync: `b2763e2`.
- Căn cứ: chủ dự án đồng ý trong chat ngày 10/11 ("đồng ý Lane A"), theo khuyến nghị số 1 của
  bản audit độc lập cùng ngày: chọn một nhánh làm chủ phần gốc AFTERVIA.
- Quyết định được áp dụng trong lượt này: OD-01 (chia quyền ghi theo nhánh: nhánh này chỉ ghi
  ngoài `groundstead/`; migration mới bắt đầu từ 0026) và OD-02 (nhận Expo SDK 58 làm nền phát
  triển để gỡ cổng audit P1; kiểm trên thiết bị DEV-01 vẫn là cổng phát hành của người).
- Chưa áp dụng, chờ chủ dự án quyết riêng: OD-03 (tăng ngân sách vòng lặp), OD-06 (kho byte),
  OD-07 (cách trả link gói xuất), OD-08 (nới phụ thuộc pháp lý của WO11-03, WO12-01, WO16-01b).

## Cách làm

`git cherry-pick -x` đúng 10 commit của PR #2 chạm phần gốc, theo thứ tự thời gian. Đã kiểm
trước: cả 10 commit không chạm `groundstead/` (0 tệp). Không xung đột ở bất kỳ commit nào.

| Commit nguồn (PR #2) | Nội dung |
|---|---|
| `11ebd66` | Expo SDK 54 → 58 (gỡ cổng audit P1) |
| `c329370` | Quét bí mật: bỏ miễn trừ byte NUL; bắt JWT_SECRET và DB_PASSWORD |
| `a46af72` | Đính chính hồ sơ quyết định, biên nhận, ma trận nghiệm thu |
| `bb20845` | Web Desk: icon rỗng để e2e không báo 404 favicon |
| `a19b68e` | Migration 0024: hàm chỉ máy chủ gọi được; đọc lý do case cho người tham gia |
| `997c195` | Guard công cụ reset DB: chỉ máy cục bộ |
| `0c7f2d1` | Báo cáo kiểm toán và E2E 10/11 |
| `28569ef` | APP-01: lưu hàng đợi trước khi cập nhật bộ nhớ |
| `5c1f439` | Migration 0025: thu quyền `record_reminder_delivery` và 9 hàm trigger |
| `82f3fff` | Báo cáo kiểm toán sau APP-01 và 0025 |

## Cổng đã chạy trên nội dung sau sync

| Lệnh | Kết quả |
|---|---|
| `npm ci` | exit 0 |
| `npm run verify` | exit 0. Bundle 69/69; quét bí mật 437 tệp, 5 luật; typecheck gốc và mobile; build landing 13 tệp và web; Vitest 66 tệp đạt, 1 bỏ qua; **519 test đạt, 1 bỏ qua**; test loop 18/18 |
| `npm audit --omit=dev --audit-level=high` | **exit 0. Cổng P1 đã gỡ: 0 high.** Còn 5 moderate |
| `npm run e2e:web` | exit 0. E2E-WEB-01 đạt: mở case, gắn bằng chứng, chia tài liệu, xử lý và đóng case (phiên bản 6), xuất gói T24 |

Số test tăng 485 → 519 (+34), do các test bảo mật đi kèm migration 0024 và 0025.

## Nghiệm thu

`git diff origin/ccr-8dbbf147-1ge7hc HEAD -- . ':!groundstead'` chỉ còn khác một tệp:
`docs/plan/09_AUDIT_2026-11-10.md`, là tài liệu riêng của nhánh này. Đạt tiêu chí.

## Giới hạn

- Playwright trong repo ghim `^1.65.0`, cần Chromium revision 1254; máy chạy lượt này chỉ có
  1243 (Chromium 153). E2E chạy được qua biến `PLAYWRIGHT_BROWSERS_PATH` trỏ tới thư mục tạm có
  symlink. CI sẽ cần bước cài trình duyệt riêng (OWN-A-10).
- SDK 58 là thay đổi phá vỡ: React Native 0.88.1, React 19.3.0. **Chưa kiểm trên thiết bị thật**
  (DEV-01 vẫn chờ người). Đường lùi: revert các commit của SYNC-01; PR vẫn là nháp, chưa merge.
- Ngân sách vòng lặp vẫn 65 và đã dùng 66, nên `decide` sẽ trả STOP_BUDGET. Các việc sau SYNC-01
  được làm như task trực tiếp có biên nhận, không qua `start`/`done`, cho tới khi có quyết định
  về OD-03.
