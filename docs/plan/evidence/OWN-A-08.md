# OWN-A-08: ánh xạ lỗi đường cũ và các khoảng trống của JWT (D-08, D-09)

- Ngày 10/11/2026. Test mới: `tests/api/error-mapping-and-jwt.test.ts` (8 kiểm thử).
- Không có migration. Chỉ đổi mã TypeScript.

## D-08: ánh xạ lỗi

1. `fromDbError` (`app.ts`) không có nhánh `55000`. Đường hợp đồng ánh xạ 55000 sang 409 từ trước,
   nhưng đường cũ đi qua `runRead`/`runWrite` thì `fromDbError` trả `null`, lỗi được ném tiếp và tầng
   ngoài trả **500**. Cụ thể: một tài khoản đang chờ xóa gọi `POST /v1/items` sẽ chạm trigger của
   0018, hàm raise 55000, và người dùng nhận 500. Nay thêm `case '55000': 409 invalid_state`.
2. `decodeURIComponent` trong `contract.ts` nằm ngoài `try`. Một escape phần trăm sai (ví dụ
   `/v1/items/%E0%A4%A`) làm hàm ném lỗi và tầng ngoài trả **500**. Nay bọc trong `try`, và một đường
   dẫn không giải mã được thì coi như không khớp route nào, nên trả **404**.

## D-09: JWT

`verifyHs256` trước đây chỉ kiểm `alg`, chữ ký, `exp` và `sub`. Thêm:

1. `nbf`: nếu có, phải là số và không ở tương lai quá dung sai đồng hồ → `not_yet_valid`.
2. `iat`: nếu có, phải là số và không ở tương lai quá dung sai → `bad_iat`.
3. Chặn trên tuổi thọ: tham số `maxLifetimeSeconds` của người gọi. `exp - iat` vượt mức thì
   `lifetime_too_long`. Mặc định **không chặn**, vì đây là chính sách của tầng gọi chứ không phải của
   JWT. `authenticateSession` truyền `TOKEN_TTL_SECONDS` (900), nên token ký với `exp` dài hơn thời
   hạn phiên bị từ chối ở đường API.
4. Dung sai đồng hồ 60 giây cho `nbf` và `iat`.
5. `MIN_JWT_SECRET_LENGTH = 32` chuyển vào `auth/jwt.ts` làm một nguồn duy nhất; `start-local.ts`
   import và export lại. `createHttpServer` nay **ném lỗi** nếu khóa ngắn hơn 32 ký tự, vì
   `createHmac` nhận cả khóa rỗng.

`iat` **không** bị bắt buộc: hệ thống vẫn có đường phát token không có `iat`, và
`tests/api/account-deletion-http.test.ts` có một kiểm thử cố ý dùng token thiếu `iat`. Thiếu `iat`
vẫn bị từ chối ở hai chỗ sẵn có: `issuedRecently` cho thao tác xóa, và mốc cắt phiên khi tài khoản đã
yêu cầu xóa.

## Kiểm thử

| Kiểm thử | Nội dung |
|---|---|
| `nbf` tương lai | `not_yet_valid` |
| `iat` tương lai | `bad_iat` |
| Tuổi thọ 4000 giây | `lifetime_too_long` khi người gọi đặt chặn 900; vẫn hợp lệ khi không đặt chặn |
| Tuổi thọ đúng 900 | Được nhận, nên biên là bao gồm |
| Lệch đồng hồ 30 giây | Được nhận |
| Khóa ngắn | `createHttpServer` ném lỗi `at least 32 characters` |
| D-08 chờ xóa ghi món đồ | `POST /v1/items` trả **409 `invalid_state`**, không phải 500 |
| D-08 escape phần trăm sai | `GET /v1/items/%E0%A4%A` trả **404**, không phải 500 |

## Fixture phải sửa theo

Chặn trên tuổi thọ làm hai fixture cũ không còn hợp lệ, vì chúng ký token sống lâu hơn thời hạn phiên.
Đã sửa trong `tests/api/account-deletion-http.test.ts`, giữ nguyên ý định của từng kiểm thử:

- `freshSession`: `exp: cutoff + 3600` → `exp: cutoff + 60 + 900` (tuổi thọ 900).
- Token cũ của kiểm thử xác thực lại: `exp: now + 600` → `exp: now + 500`, giữ `iat: now - 360` để
  token vẫn "cũ" theo luật 300 giây nhưng tuổi thọ chỉ 860 giây.

## Cổng

- `tests/api` (11 tệp): 92/92 sau khi sửa fixture.
- Tệp test mới: 8/8.
- `npm run verify` và `npm run e2e:web`: xem commit.

## Giới hạn

- Không kiểm `iss` và `aud`: token hiện do chính API ký và chỉ dùng cục bộ (đăng nhập giả lập). Khi có
  nhà cung cấp danh tính thật (DEC03) thì phải thêm.
- `iat` vẫn không bắt buộc. Khi mọi đường phát token đều có `iat` thì nên bắt buộc.
- Chặn trên tuổi thọ chỉ áp ở `authenticateSession`. Lời gọi `verifyHs256` trực tiếp trong kiểm thử
  giữ hành vi cũ nếu không truyền tham số.

## Ghi chú về việc chia commit

`services/api/src/local/start-local.ts` bị cả OWN-A-07 và OWN-A-08 chạm vào. Hai dòng chuyển
`MIN_JWT_SECRET_LENGTH` sang `auth/jwt.ts` (phần của OWN-A-08) vì thế đã đi cùng commit của
OWN-A-07, không tách ra được mà không phải can thiệp vào index. Ghi lại ở đây để người đọc lịch sử
không mất dấu.

## Lỗi chỉ xuất hiện trên CI, và cách tìm ra

Sau khi đẩy, CI đỏ ở bước `npm run verify` tại head `4197492` và `4285949`, cùng một nguyên nhân, dù
`npm run verify` ở máy phát triển exit 0. Lỗi: `tests/api/account-deletion-http.test.ts` dòng 107 và
118 nhận 401 thay vì 200.

Nguyên nhân là tương tác giữa bản sửa D-09 và một fixture: helper `freshSession` ký token với
`iat = cutoff + 60`, trong đó `cutoff` đọc từ Postgres, còn kiểm "iat không ở tương lai quá 60 giây"
so với đồng hồ của Node. Trên máy phát triển, Postgres và Node dùng **cùng một đồng hồ**, nên
`iat - now` đúng 60 và vừa đủ lọt. Trên CI, Postgres là một container riêng và runner là máy khác, nên
chỉ cần đồng hồ Postgres nhanh hơn vài giây là `iat` vượt biên và API trả 401.

Đã đo dung sai bằng một phép tính nhỏ trong lượt:

| Khoảng cách sau mốc cắt | Lệch 0s | 5s | 30s | 55s |
|---|---|---|---|---|
| `cutoff + 60` | nhận | **401** | **401** | **401** |
| `cutoff + 5` | nhận | nhận | nhận | nhận |

Sửa fixture thành `iat = cutoff + 5` và `exp = cutoff + 5 + 900`. Ý định của kiểm thử giữ nguyên:
`iat` vẫn đứng sau mốc cắt, và so sánh đó lấy từ cơ sở dữ liệu nên không phụ thuộc đồng hồ runner.
**Không nới** dung sai 60 giây trong `verifyHs256`: nới nó sẽ là sửa mã sản phẩm để vừa một fixture.

Bài học cho các lượt sau: `npm run verify` xanh ở máy này không chứng minh CI xanh, khi kiểm thử so
sánh thời gian lấy từ hai nguồn đồng hồ khác nhau.

### Lần thứ hai, và cách chặn cả lớp lỗi

Bản sửa đầu chỉ sửa `freshSession` trong `tests/api/account-deletion-http.test.ts`. Nhưng chính tôi đã
sao chép đúng mẫu `iat = cutoff + 60` sang tệp kiểm thử mới `tests/api/error-mapping-and-jwt.test.ts`,
nên CI lại đỏ ở head `a6d9b6a`, lần này ở dòng 113: nhận 401 thay vì 409.

Đáng chú ý: ở head `4285949` thì chính kiểm thử đó **xanh**, còn `account-deletion-http` đỏ; ở
`a6d9b6a` thì ngược lại. Đó là dấu hiệu của kiểm thử phụ thuộc đồng hồ: lệch giữa hai container thay
đổi theo từng lần chạy, nên lỗi xuất hiện lúc chỗ này lúc chỗ khác.

Vì vậy không sửa từng chỗ nữa mà đưa luật về một nơi: `tests/support/session-fixtures.ts` với
`sessionAfterCutoff(userId, cutoff, secret)`, `AFTER_CUTOFF_SECONDS = 5` và
`SESSION_TTL_SECONDS = 900`. Cả hai tệp kiểm thử nay gọi helper đó. Ba luật được ghi ngay trong tệp:
`iat` phải sau mốc cắt; `iat` không được quá 60 giây trước đồng hồ runner; `exp - iat` không vượt 900.

Thêm một chốt trong `error-mapping-and-jwt.test.ts`: `AFTER_CUTOFF_SECONDS` phải nhỏ hơn 60 và
`SESSION_TTL_SECONDS` phải bằng 900. Ai nâng hằng số vượt dung sai sẽ làm đỏ ngay ở máy mình, không
phải chờ CI.

Đã kiểm lại toàn bộ repo: không còn chỗ nào ký token với `iat` lấy từ dấu thời gian của cơ sở dữ liệu
cộng một khoảng lớn. Các chỗ `iat` khác đều dùng cùng một đồng hồ ở hai phía, hoặc có biên dư rộng
(400 so với 300 giây, 600 so với 60 giây), nên không phụ thuộc lệch đồng hồ thực tế.
