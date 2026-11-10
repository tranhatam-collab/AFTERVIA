# OWN-A-10 và OWN-A-11: cổng CI còn thiếu, bộ quét bí mật, và tệp nén trong bằng chứng

- Ngày 10/11/2026. Không có migration.

## OWN-A-10 (A-03, G-25): hai job CI mới

`.github/workflows/ci.yml` trước đây chỉ có một job `verify`, chạy `npm run verify` rồi bước audit.
Hai cổng vì thế không chạy ở đâu:

1. **`e2e:web`** không nằm trong chuỗi `verify` và không có job nào gọi. `docs/dev/LOCAL_MACOS.md` đã
   ghi rõ điều này. Job `e2e-web` mới có service `postgres:16`, `npm ci`, bước
   `npx playwright install --with-deps chromium` (cần vì Playwright trong lockfile đòi đúng một bản
   Chromium), rồi `npm run e2e:web`.
2. **`groundstead/verify`** (bộ cổng riêng của Groundstead: quét bí mật, backlog, build, typecheck,
   quét bí mật bundle, 182 kiểm thử) không có job nào gọi. Job `groundstead-verify` mới chạy trong thư
   mục `groundstead/`. Thư mục đó chỉ tồn tại trên nhánh của Lane G, nên job dò `groundstead/package.json`
   và tự bỏ qua khi không có, thay vì đỏ trên nhánh này.

Bước audit production giữ nguyên trong job `verify`. Mọi action vẫn ghim theo SHA như WO24-01.

## OWN-A-11 (A-04 phần còn lại, A-02, OD-05)

### Bộ quét bí mật

Phần đã làm ở `c329370` (đến qua SYNC-01): bỏ việc miễn trừ tệp có byte NUL, và đổi `\b` thành
lookbehind nên `DB_PASSWORD="…"` đã khớp. Phần còn lại, làm trong lượt này:

1. Thêm luật `assigned-secret-unquoted` cho giá trị **không có nháy** (`KEY=giá-trị` trong tệp `.env`
   hoặc script). Đòi ít nhất 20 ký tự thuộc bộ base64/hex, nên không bắt sai câu văn thường, và không
   khớp khi giá trị là biểu thức như `token: process.env.FOO` (dấu chấm ngoài bộ ký tự).
2. **Bỏ loại trừ `docs/spec/`.** Đã đo trong lượt: với luật mới và vẫn loại trừ thì quét 458 tệp và
   sạch; khi đưa `docs/spec/` vào thì quét 539 tệp và **vẫn sạch**. Vậy loại trừ đó không còn cần, và
   bỏ nó là nghiêm hơn. Chỉ còn loại trừ `package-lock.json`.

Sau khi xóa archive: quét 535 tệp, 6 luật, sạch.

### Tệp nén trong bằng chứng (A-02, OD-05)

Bốn tệp nén đã được commit dưới `docs/plan/evidence/`. Một tệp nén không đọc được trong diff, và bộ
quét bí mật đọc nó thành một dòng nhiễu, nên đó là chỗ tồi để giữ bằng chứng.

Đã kiểm trước khi xóa: `MANIFEST.sha256` trong cùng thư mục ghi SHA-256 của **cả bốn** tệp, và
`sha256sum -c` xác nhận cả bốn còn khớp. Xóa tệp nén mà giữ manifest nên bảo toàn được bản ghi.

Đã xóa: `source-6bf240d.tar.gz`, `late-head-e3d55e0/source-e3d55e0.tar.gz`, `remote/ci-log.zip`,
`late-head-e3d55e0/late-ci-log.zip`. Lịch sử git không bị viết lại; các tệp vẫn còn trong commit cũ.

`tests/security/evidence-files.test.ts` (3 kiểm thử) chốt trạng thái: không tệp nén nào dưới
`docs/plan/evidence/`, không tệp nén nào trong cả repo, và manifest vẫn còn dưới dạng văn bản.

## Giới hạn

- Job `groundstead-verify` chỉ thật sự chạy trên nhánh có `groundstead/`. Trên nhánh này nó chỉ in một
  dòng rồi kết thúc, nên nó là cổng của Lane G chứ chưa bảo vệ được gì ở đây.
- Luật giá trị không có nháy chưa phủ chuỗi ngắn hơn 20 ký tự, và chưa phủ bí mật không nằm sau một từ
  khóa. Bộ quét vẫn là lọc theo mẫu, không phải phân tích entropy.
- Nội dung bốn tệp nén đã bị xóa khỏi cây hiện tại nhưng còn trong lịch sử. Nếu cần biến mất hẳn thì
  phải viết lại lịch sử, việc đó bị cấm trong phạm vi hiện tại.
