# 07 — Vùng thử an toàn (giai đoạn D)

## Nguyên tắc

- Không chạm production. Không đổi DNS. Không đổi nhánh `main`.
- Mọi thử nghiệm build chạy cục bộ. Chỉ dùng preview khi đã có tài khoản được duyệt.
- Không dùng dữ liệu thật. Test suite sinh dữ liệu lúc chạy. [R]
- Không thanh toán thật. [R]
- Không đưa secret vào repo. Secret đi qua biến môi trường hoặc secret store.

## Vùng đã dùng trong lượt này

| Vùng | Lệnh | Kết quả | Nhãn |
|---|---|---|---|
| Build landing cục bộ | `npm run build:landing` | 13 tệp, môi trường `preview`, ghi vào `apps/landing/dist` | [V] |
| Thư mục build | `apps/landing/dist/` | Bị `.gitignore` bỏ qua (`dist/`), không làm bẩn cây làm việc | [V] |
| Quét bí mật | `npm run check:secrets` | 582 tệp, 6 quy tắc, không cảnh báo | [V] |
| Test suite | `npm run verify` (xem `08_TEST_RESULTS.md`) | Chạy trên Postgres cục bộ (localhost) | [V] |

## Vùng chưa có

- **Cloudflare Pages preview:** chưa có project, chưa có token. [U]
- **Tên miền thử:** không đăng ký, không dùng tên miền production cho thử nghiệm. [P]

## Điều kiện để mở vùng preview Cloudflare

1. Chủ dự án tạo hoặc xác nhận tài khoản Cloudflare. [P]
2. Chủ dự án tạo token có phạm vi tối thiểu cho Pages, lưu trong secret store của Cloudflare hoặc GitHub. Token không đưa vào repo và không gửi qua chat. [P]
3. Chốt quyết định hosting (D14, WEB-02). [P] [R]
4. Với production: phê duyệt nội dung (HUM-WEB-03). [P] [R]

Khi `AFTERVIA_SITE_ENV=preview`, landing đặt `noindex,nofollow` và `Disallow: /` (xem `apps/landing/README.md` dòng 17 và `apps/landing/src/render.mjs` dòng 123). Đây là mặc định an toàn cho thử nghiệm. [V]
