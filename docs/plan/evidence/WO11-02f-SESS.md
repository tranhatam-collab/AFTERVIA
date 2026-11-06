# WO11-02f-SESS: thời hạn phiên 15 phút và xác thực lại trước khi xóa (Q3, phương án C)

- Task: WO11-02f-SESS (AUTO, gate P0, phụ thuộc WO11-02a). Thực hiện Q3 phương án C, QUYẾT TẠM (`docs/plan/06_DECISIONS_DELEGATED.md`, dòng 26).
- Acceptance: T25 (3 kiểm thử mới trong `tests/api/account-deletion-http.test.ts`).
- Độ phủ: T25 ở mức PARTIAL. Đăng nhập vẫn là giả lập; DEC03 chưa chọn nhà cung cấp.
- Bảo mật: **chờ reviewer độc lập**. Không tự gọi là đã duyệt.

## Đã làm

- `services/api/src/http/app.ts`:
  - `TOKEN_TTL_SECONDS`: 3600 → 900. Đăng nhập thử trả `expires_in = 900`, `exp = iat + 900`.
  - `DELETION_REAUTH_SECONDS = 300` (mới).
  - `authenticateSession` trả thêm `issuedAt` (claim `iat`, hoặc `null` khi thiếu).
  - `issuedRecently(issuedAt)`: đúng khi `now - iat <= 300`. Thiếu `iat` thì sai.
  - `handleContract`: với `operationId === 'requestDeletion'`, nếu phiên không còn mới thì trả 401 `unauthenticated` trước khi đọc body. Các route khác không đổi: phiên vẫn dùng được đến `exp` (15 phút).
- Không có migration và không đổi DB. Không thêm mã lỗi mới: 401 `unauthenticated` đã có trong hợp đồng.
- `tests/api/account-deletion-http.test.ts`:
  - Thêm người dùng `reauth` (`USERS`).
  - T25: đăng nhập thử trả `expires_in` 900, và `exp - iat` = 900.
  - T25: phiên phát 360 giây trước bị từ chối khi yêu cầu xóa (401 `unauthenticated`), hồ sơ vẫn `ACTIVE`. Cùng phiên đó vẫn đọc được `/v1/items` (200): quy tắc chỉ áp dụng cho xóa.
  - T25: phiên phát 240 giây trước được nhận; hồ sơ chuyển `PENDING_DELETION`.

## Lệnh đã chạy và kết quả

- `npx vitest run tests/api`: 11 tệp, 92/92 pass, exit 0.
- `npm run verify`: exit 0. Bundle 69/69; quét bí mật 320 tệp, 5 luật; typecheck gốc và mobile; build landing và web; Vitest 61 tệp pass và 1 bỏ qua; 466 kiểm thử pass và 1 bỏ qua (tăng 3 so với 463); test:loop đạt.
- Vitest JSON (`.loop/vitest.json`): `success=true`; 467 tổng; 466 pass; 0 fail; 1 pending.
- `node tools/loop/matrix.mjs from-report .loop/vitest.json`: không đổi dòng nào. Summary: PASS 34, NOT_RUN 12, FAIL 0; coverage PARTIAL 42, NONE 4.
- `npm run e2e:web`: đạt, 12 bước (`E2E-WEB-01: đạt`). Đăng nhập thử và token 15 phút không làm hỏng luồng hiện có. E2E không nằm trong `verify`, nên kết quả này được ghi riêng. Lần chạy này đặt lại DB `_test`.

## Đột biến

- M1: bỏ kiểm phiên 5 phút (`if (false)`). 2/9 kiểm thử đỏ: test từ chối phiên cũ, và test chấp nhận phiên mới (đỏ theo chuỗi, vì tombstone đã được tạo từ yêu cầu bị nhận sai trước đó).
- M2: `TOKEN_TTL_SECONDS = 3600`. 1/9 kiểm thử đỏ (test TTL 15 phút).
- Sau mỗi đột biến, `app.ts` được khôi phục từ bản sao, sha256 khớp; chạy lại 9/9 pass.

## Giới hạn còn lại

1. Đăng nhập vẫn là giả lập. "Xác thực lại" hiện chỉ là kiểm tuổi của phiên. Xác thực lại thật (mật khẩu, OTP hoặc đăng nhập lại qua nhà cung cấp) cần nhà cung cấp danh tính (DEC03).
2. Không có làm mới phiên (refresh). Sau 15 phút người dùng phải đăng nhập lại. Chưa kiểm luồng xử lý 401 của Desk; Desk hiện dùng token đặt tay khi phát triển (ghi trong WO10-02).
3. Ranh giới 300 giây nằm trong mã và được đọc ở đó. Test dùng 240 và 360 giây để không phụ thuộc đồng hồ, nên chưa có test đúng tại biên.
4. TTL là hằng số trong mã, chưa cấu hình theo môi trường.
5. Phiên vẫn bị từ chối sau mốc yêu cầu xóa (WO11-02a), như trước.

## HawkScan

- Không chạy: `HAWK_API_KEY` không đặt và ứng dụng không chạy.

## Rollback

- Không có migration. Quay lại: đặt `TOKEN_TTL_SECONDS = 3600` và bỏ nhánh kiểm `issuedRecently` trong `handleContract`.

## Việc tiếp theo

- WO11-02e-EXP, WO11-02e-CONF, WO11-02e-CASE (AUTO, Q2-C), chưa làm.
- DEC03: chọn nhà cung cấp danh tính để thay đăng nhập giả lập và xác thực lại thật.
