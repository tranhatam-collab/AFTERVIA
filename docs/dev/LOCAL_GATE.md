# Cổng kiểm cục bộ (thay CI trong lúc GitHub Actions không chạy)

Ngày lập: 2026-11-13. Bối cảnh: GitHub Actions không khởi động job từ 17:58 UTC 10/11
(mọi run thất bại trong 4–7 giây, 0 bước; hồ sơ đầy đủ ở `docs/operations/zero-cost-cicd/`).
Theo chỉ đạo của chủ dự án 13/11, hai lane chuyển sang dev local; tài liệu này định nghĩa
cổng kiểm thay thế cho lane A (AFTERVIA). Lane G có bộ cổng riêng trong `groundstead/`.

## Lệnh

```bash
npm run gate:local
```

Tương đương đúng những gì job CI chạy (`.github/workflows/ci.yml`):

| Bước | Lệnh | Tương ứng job CI |
|---|---|---|
| 1 | `npm run verify` | `verify` (check:bundle, check:secrets, typecheck ×2, build:landing, build:web, test, test:loop) |
| 2 | `npm audit --omit=dev --audit-level=high` | `verify`, bước 7 |
| 3 | `npm run e2e:web` | `e2e-web` (Chromium thật, gồm bước xóa tài khoản T25) |

`check:mobile-bundle` (bundle Android thật qua Metro) **không** nằm trong cổng vì CI cũng
không chạy nó; đưa vào hay không là quyết định D20 đang mở. Chạy riêng khi sửa mã di động.

## Chuẩn bị môi trường (container mới)

```bash
service postgresql start
export TEST_DATABASE_URL="$(grep -m1 'TEST_DATABASE_URL' .github/workflows/ci.yml \
  | sed -E 's/.*TEST_DATABASE_URL:[[:space:]]*//; s/["'"'"']//g; s/[[:space:]]*$//')"
```

Giá trị lấy thẳng từ `ci.yml` (DB test cục bộ), không chép vào tài liệu để hai nơi không lệch nhau.

## Quy tắc ghi kết quả

- Mỗi commit ghi kết quả cổng THẬT trong thông điệp commit (exit code, số test), như hai lane
  vẫn làm. Không ghi DONE/PASS khi chưa có kết quả lệnh thật.
- Khi Actions chạy lại, cổng CI là cổng chính thức trở lại; tài liệu này còn giá trị như
  hướng dẫn chạy cục bộ. **Cập nhật 13/11: đã xảy ra** — run 132 (`4a8449b`) xanh đủ 3 job
  lúc 01:41 UTC. CI là cổng chính thức trở lại; `gate:local` giữ vai trò chạy-trước-khi-push.

## DAST (WO17-01b) — phần còn thiếu của cổng

Đã chuẩn bị sẵn, chưa chạy lần nào:

1. `stackhawk.yml` ở gốc repo trỏ tới `http://127.0.0.1:8787`.
2. Chạy API cục bộ: `npm run api:local` (DB test, không dữ liệu thật).
3. Cần chủ dự án đặt 2 biến trong cài đặt môi trường (KHÔNG dán vào chat, không ghi vào repo):
   `HAWK_API_KEY` (khóa API StackHawk) và `HAWK_APP_ID` (applicationId của ứng dụng tạo trên
   app.stackhawk.com). Docker đã có sẵn trong môi trường.
4. Khi đủ: `hawk scan`, sửa phát hiện, quét lại, lưu bằng chứng vào `docs/plan/evidence/`.
