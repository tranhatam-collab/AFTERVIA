# DEP-AUDIT-01 — cổng audit sản xuất đỏ: điều tra nguyên nhân và đường sửa

- Ngày: 18/11/2026 (17/11/2026 17:57 UTC) · Loại: AUTO_PREP · Acceptance: không có T-xx · Phụ thuộc: không.
- Kết thúc: **BLOCKED** (chờ bản vá upstream hoặc quyết định của chủ dự án về ngoại lệ). Không nới cổng; không đổi mã.

## Đo (lệnh → kết quả)

| # | Lệnh | Kết quả |
|---|---|---|
| 1 | `npm audit --omit=dev --audit-level=high` | exit 1. 27 lỗ hổng: 24 high, 3 moderate, 0 critical |
| 2 | Phân tích `npm audit --omit=dev --json` theo mục high | 24 mục high: 23 chỉ là chuỗi phụ thuộc, 1 có advisory gốc: GHSA-fc5q-39xc-vjpf (picomatch) |
| 3 | GitHub advisory API (công khai, không token): GHSA-fc5q-39xc-vjpf | high; published 2026-10-19; updated 2026-11-17 15:56 UTC; vulnerable `<= 4.0.7`; first_patched: none |
| 4 | GHSA-g3hv-75wg-m249 (minimatch) | medium; published 2026-10-30; vulnerable `< 11.0.1`; registry có minimatch 11.0.9 |
| 5 | GHSA-3g3m-2fjr-6pw4 (glob) | medium; published 2026-10-30; vulnerable `9.0.0 – 14.0.1`; registry có glob 14.0.6 |
| 6 | `npm view picomatch version` và `picomatch@2/3/4` | 2.3.2 / 3.0.2 / 4.0.7. Không có bản nào vượt phạm vi lỗ hổng |
| 7 | `npm view expo@58 version`, `@expo/metro-config@58`, `@expo/config@58` | expo 58.0.26 (lock 58.0.23); @expo/metro-config 58.0.23 (lock 58.0.21); @expo/config 58.0.12 (lock 58.0.11) |
| 8 | `package-lock.json` đã commit | expo 58.0.23, expo-router 58.0.30, react-native 0.88.1, picomatch 4.0.7, minimatch 10.2.6, glob 13.0.7, tinyglobby 0.2.17, metro 0.87.1 |
| 9 | `npm run check:mobile-bundle` | exit 1, **không phải lỗi audit**. Metro không phân giải được `@aftervia/domain` (xem task MOBILE-BUNDLE-01) |

## Kết luận

- Cổng đỏ do **một** advisory high không có bản vá upstream: picomatch, ReDoS qua extglob lặp. 23 mục high khác chỉ là chuỗi phụ thuộc tới picomatch.
- Nâng cấp không gỡ được: picomatch mới nhất ở mọi nhánh vẫn nằm trong phạm vi lỗ hổng. Override minimatch lên 11.0.9 và glob lên 14.0.6 sửa được hai mục medium, nhưng không ảnh hưởng cổng (`--audit-level=high`), nên không làm.
- Advisory được cập nhật 17/11 15:56 UTC, sau lần xanh cuối 13/11 (xem `05_AUTONOMY_STATUS.md`). Khớp với thời điểm đổi trạng thái. Chưa có run CI nào sau 13/11 để xác nhận trực tiếp: `gh` không resolve được repo trong phiên này.
- Không sửa: không đổi `--omit=dev`, không đổi `--audit-level`, không thêm ngoại lệ vào cổng. Đó là quyết định của chủ dự án, ghi ở `10_NEEDS_FROM_OWNER.md` mục 2.8.
- Hạ Expo SDK để gỡ chuỗi: không khuyến nghị, vì đảo ngược nâng cấp 58 đã làm để qua cổng trước đó.

## Chưa xác định

- **Picomatch có nằm trong bundle ứng dụng hay chỉ trong công cụ build?** Chưa biết. Bước bundle Android (dòng 9) thất bại trước khi xuất bundle, nên không có tệp để tìm chuỗi `picomatch`. Lần grep "0 tệp" trong phiên này KHÔNG phải bằng chứng là picomatch vắng mặt. Việc này chuyển sang MOBILE-BUNDLE-01: khi bundle dựng được, mới grep.
- Mức phơi nhiễm thực tế của picomatch trong ứng dụng đã build: chưa đánh giá.

## Điều kiện mở lại

- Có bản picomatch vượt phạm vi, hoặc advisory có `first_patched_version`; hoặc chủ dự án duyệt ngoại lệ có thời hạn (tên advisory, lý do, ngày hết hạn) để sửa cổng.
- Khi mở lại: `npm audit --omit=dev --audit-level=high` xanh; `npm run check:mobile-bundle` và `npm run verify` xanh.

## Giới hạn

- Số liệu đo ngày 18/11/2026. Không suy ra CI trên GitHub đang đỏ.

## Rollback

- Không đổi mã trong task này. Không có gì để revert.

## Cập nhật cùng ngày (sau MOBILE-BUNDLE-01)

- Mục "Chưa xác định" ở trên đã được đo. Bundle Android dựng được sau khi sửa Metro (xem `docs/plan/evidence/MOBILE-BUNDLE-01.md`). Sourcemap của bundle có 1084 nguồn. Không có nguồn nào từ `picomatch`, `minimatch`, `glob`, `tinyglobby`, `micromatch`, `jest-util`, `@expo/metro-config` hay `metro`. Chuỗi lỗ hổng chỉ nằm trong công cụ build, không nằm trong JS của ứng dụng.
- Đo trên Android. iOS dùng cùng mã JS nhưng chưa được đo.
- Cập nhật này làm rõ lựa chọn (b) ngoại lệ có thời hạn trong `10_NEEDS_FROM_OWNER.md` mục 2.8. Quyết định vẫn thuộc chủ dự án. Task này vẫn BLOCKED cho đến khi có quyết định hoặc bản vá upstream.
