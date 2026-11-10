# OWN-A-07: một guard duy nhất cho mọi công cụ chạm vào cơ sở dữ liệu (D-07, A-10, D-11)

- Ngày 10/11/2026. Module mới: `tools/db/db-target-guard.mjs`.
- Test mới: `tests/db/db-target-guard.test.ts` (18 kiểm thử).

## Vấn đề

`checkLocalDatabaseUrl` trong `services/api/src/local/start-local.ts` bỏ qua host rỗng:

```
const targets = [url.hostname, url.searchParams.get('host'), url.searchParams.get('hostaddr')];
for (const target of targets) {
  if (target !== null && target !== '' && !isLocalTarget(target)) return HOST_MESSAGE;
}
```

Đo trong lượt này: `new URL('postgres:///aftervia_test').hostname` là chuỗi rỗng, nên điều kiện
`target !== ''` bỏ qua nó và URL được **chấp nhận**. libpq khi đó lấy máy chủ từ `PGHOST`,
`PGHOSTADDR` hoặc `PGSERVICE`, nên một DB ở máy khác có tên kết thúc `_test` vẫn bị đặt lại.

Ngoài ra `assertTestDatabase` trong `tools/db/migrate.mjs` (đã nhận kiểm loopback từ SYNC-01, commit
`997c195`) không kiểm tham số `host` và `hostaddr`, nên `postgres://localhost/x_test?host=db.example.com`
đi qua được. Hai điểm vào có hai bộ luật khác nhau, nên còn chỗ lệch.

## Đã làm

`tools/db/db-target-guard.mjs` giữ bộ luật duy nhất:

1. URL phải phân tích được.
2. Không được có tham số `dbname` (nó đổi DB đích sau lưng tên lấy từ đường dẫn).
3. Tên DB phải kết thúc `_test`.
4. **Phải có host**: `hostname` rỗng và không có `host`/`hostaddr` thì bị từ chối, vì khi đó biến
   `PG*` mới chọn máy chủ.
5. Mọi giá trị trong `hostname`, `host`, `hostaddr` phải là loopback (`localhost`, `127.0.0.1`,
   `[::1]`, `::1`) hoặc đường dẫn socket Unix. Chấp nhận danh sách phân cách bằng dấu phẩy, đúng như libpq.

Vì luật 4 buộc luôn có host, và tham số kết nối tường minh thắng biến môi trường trong libpq, nên
`PGHOST`, `PGHOSTADDR`, `PGSERVICE` không thể chuyển hướng kết nối nữa. Lý do này được ghi trong module.

Nối dây:

- `tools/db/migrate.mjs`: `assertTestDatabase` và `databaseNameOf` nay lấy từ module chung. Qua đó
  `tools/db/restore-drill.mjs` và `resetDatabase` của `tools/e2e/web-e2e.mjs` dùng cùng luật.
- `services/api/src/local/start-local.ts`: giữ kiểm scheme và các kiểm biến môi trường của riêng nó,
  phần còn lại gọi module chung. Đã xóa `isLocalTarget`, `LOOPBACK_NAMES` và `HOST_MESSAGE` trùng lặp.

## Kiểm thử

- 6 URL được chấp nhận và 10 URL bị từ chối, kiểm qua cả `checkLocalTestDatabaseUrl` và
  `assertTestDatabase`.
- Một kiểm thử **tính nhất quán**: `checkLocalDatabaseUrl` của start-local và module chung phải cho
  cùng kết quả trên mọi trường hợp.
- Một kiểm thử ghi rõ phần start-local giữ riêng: kiểm scheme (`mysql://` bị từ chối ở start-local,
  module chung không xét scheme).
- `postgres:///aftervia_test?host=/var/run/postgresql` vẫn được chấp nhận: có host tường minh là socket.

## Cổng

- Đo trước và sau, trên cùng URL `postgres:///aftervia_test`:
  - `hostname` = `""`; luật cũ bỏ qua vì `target !== ''` nên **chấp nhận**.
  - Guard mới trả: `the database URL has no host, so PGHOST, PGHOSTADDR or PGSERVICE would choose the server: give an explicit loopback host`.
- `tests/api/local-start.test.ts` (10 kiểm thử có sẵn) vẫn xanh sau khi đổi, không sửa test nào.
- Tệp test mới: 18/18.
- `npm run verify` và `npm run e2e:web`: xem commit.

## Giới hạn

- Module đặt trong `tools/db/`, và `start-local.ts` import từ đó. Chấp nhận được vì `start-local` là
  điểm vào chỉ dùng khi phát triển (`npm run api:local`), không phải mã chạy production.
- Guard không xét scheme; start-local vẫn giữ kiểm đó. Đã ghi trong test để khỏi lệch về sau.
- `restore-drill.mjs` vẫn `drop database ... with (force)`; nay chịu cùng luật về máy đích, nhưng vẫn
  là công cụ xóa DB, nên chỉ dùng trên máy phát triển.
