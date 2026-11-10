# OWN-A-05: xác thực lại trước khi xóa tài khoản, kiểm trong cơ sở dữ liệu (D-05)

- Ngày 10/11/2026. Migration mới: `0028_deletion_requires_recent_session.sql`.
- Test mới: `tests/db/deletion-reauth-db.test.ts` (4 kiểm thử). Dữ liệu tổng hợp.

## Vấn đề

Luật xác thực lại chỉ nằm ở tầng API: `app.ts` có `DELETION_REAUTH_SECONDS = 300` và kiểm
`issuedRecently(session.issuedAt)` trước khi dispatch. Nhưng `request_account_deletion` được cấp
EXECUTE cho `authenticated` (0014:169) và trong thân hàm không kiểm gì về phiên. Một lời gọi RPC
trực tiếp bằng vai trò `authenticated` vì thế bỏ qua được cả luật 300 giây và mốc cắt phiên.

## Đã làm

Migration 0028 `create or replace` hàm, giữ nguyên văn thân hàm của 0020 và chèn ngay sau kiểm xác
thực ba điều kiện đọc từ `request.jwt.claims`:

1. `iat` phải có và là số. Phiên không có `iat` bị từ chối.
2. `now() - iat` không quá **300 giây**. Con số này phải khớp `DELETION_REAUTH_SECONDS` trong
   `services/api/src/http/app.ts`; đã ghi chú trong migration.
3. `iat` không quá 60 giây trong tương lai, nên đồng hồ lệch không mua được cửa sổ dài hơn.

Hai thay đổi đi kèm, cần để đường API vẫn chạy:

- `services/api/src/db/session.ts`: `withUser` nhận thêm `extraClaims`, trộn vào `request.jwt.claims`.
- `services/api/src/http/app.ts`: `runContract` nhận `issuedAt` của phiên, và route `requestDeletion`
  truyền `{ iat: issuedAt }`. Các route khác không đổi.
- `tests/support/db.ts`: `asActor` mang `iat` như một JWT thật. Trước đó claims kiểm thử chỉ có `sub`
  và `role`, tức ít trung thực hơn PostgREST, nên bộ test không thể thấy lớp lỗ hổng này.

## Kiểm thử

| Kiểm thử | Nội dung |
|---|---|
| Không có `iat` | RPC trực tiếp bị từ chối 42501 `reauthentication required` |
| `iat` cũ 400 giây | Bị từ chối 42501 |
| `iat` ở tương lai 600 giây | Bị từ chối 42501 |
| `iat` cũ 60 giây | Thành công, trả receipt đúng `request_id` |

Mỗi kiểm thử chạy trong transaction tự rollback, nên không để lại tombstone.

## Cổng

- Đỏ trước khi áp 0028: 3 trong 4 kiểm thử đỏ (ba trường hợp từ chối).
- Xanh sau khi áp: 4/4.
- `npm run verify`: exit 0, bao gồm `tests/api/account-deletion-http.test.ts` (đường API vẫn đúng:
  TTL 900 giây, phiên 360 giây bị từ chối, phiên 240 giây được nhận).
- `npm run e2e:web`: exit 0.

## Giới hạn

- Con số 300 giây tồn tại ở hai nơi (TypeScript và SQL). Chưa có một nguồn duy nhất; đã ghi chú ở cả
  hai phía để sửa cùng nhau.
- Mốc cắt phiên (`deletionCutoff`) vẫn chỉ ở tầng API, áp cho mọi route. Lượt này chỉ đưa luật xác
  thực lại của chính thao tác xóa vào DB. Lời gọi RPC trực tiếp bằng phiên cũ vẫn bị chặn bởi điều
  kiện 300 giây, nên khoảng trống còn lại là hẹp.
- `request_account_deletion` vẫn được cấp cho `authenticated`. Không chuyển sang chỉ `service_role`
  vì đường API hiện gọi hàm này bằng vai trò người dùng (`withUser`).
