# P1 — Thử phương án 2 (ghi đè) cho cổng audit production — KHÔNG áp dụng, đã hoàn tác

- Ngày: 03/11/2026 · Liên quan: comment 6547639475 trên PR #1 (phương án 2: ghi đè bốn gói).
- Tình trạng sau thí nghiệm: HEAD không đổi (`package.json` và `package-lock.json` đã khôi phục từ commit). Cổng P1 vẫn đỏ, cùng nguyên nhân.

## Thay đổi thử (không commit)

- `overrides` toàn cục: `decode-uri-component` → `0.5.1`.
- `overrides` có phạm vi: `@expo/metro-config` → `postcss` = `8.5.23`; `metro` → `image-size` = `2.0.4`.
- Phạm vi có chủ đích, để không đổi `vite` (vite dùng `postcss` 8.5.32, không được hạ cấp).

## Kết quả

| Bước | Kết quả |
|---|---|
| `npm install --package-lock-only`, `npm ci` | exit 0; lockfile đổi 12 dòng thêm, 24 dòng bớt |
| `npm audit --omit=dev --audit-level=high` (cổng CI) | **exit 0** (đạt) |
| `npm run verify`, lần 1 | exit 1 do Postgres cục bộ đang tắt (`ECONNREFUSED 127.0.0.1:5432`), không do thay đổi |
| `npm run verify`, lần 2 (sau khi `pg_ctlcluster 16 main start`) | **exit 0**: bundle 69/69; quét bí mật 302 tệp; Vitest 58 tệp pass và 1 bỏ qua, 437 kiểm thử pass và 1 bỏ qua; test:loop 18/18 |
| `expo export --platform android` (apps/mobile, offline) | **exit 1**: `SyntaxError: .../expo-router/assets/pkg.png: The "list" argument must be an instance of SharedArrayBuffer, ArrayBuffer or ArrayBufferView.` |

## Kết luận

- `verify` đạt nhưng không phủ bundle mobile, nên đã bỏ sót lỗi. Chỉ bước `expo export` mới bắt được lỗi này.
- Metro đọc kích thước asset bằng `image-size`. Bản 2.x đổi cách gọi hoặc kiểu đầu vào, nên bundle hỏng.
- Advisory `image-size` áp dụng đến 2.0.2, nên không có bản vá trong nhánh 1.x. Muốn vá phải nhảy major, và metro không tương thích ngay.
- Vì vậy phương án 2 **không an toàn** cho mobile. Đã hoàn tác bằng `git checkout -- package.json package-lock.json` rồi `npm ci`. Kiểm `npm audit` ở HEAD vẫn cho `exit 1` với 5 cảnh báo cao.

## Các phương án còn lại (chủ dự án chọn)

1. Nâng dòng Expo lên bản không còn cảnh báo. Thay đổi lớn, cần kiểm trên thiết bị.
2. Ghi đè — **đã thử, không dùng được** (xem trên).
3. Tách phạm vi audit di động. Đổi định nghĩa cổng; ràng buộc của dự án là không nới cổng, nên không làm.
4. Bỏ phụ thuộc di động khỏi nhánh. Cổng xanh, nhưng `typecheck:mobile` và các kiểm thử `tests/mobile` mất khỏi `verify`. Đây là giảm độ phủ kiểm thử, cần chủ dự án xác nhận rõ.

## Rollback

- Không cần: không có thay đổi mã được giữ lại.
