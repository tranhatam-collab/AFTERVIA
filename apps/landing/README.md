# Landing AFTERVIA (tĩnh, VI/EN)

Trang giới thiệu tĩnh cho AFTERVIA. Không có JavaScript, không có biểu mẫu, không thu email, không có công cụ phân tích hay theo dõi cá nhân, không tải font hoặc ảnh từ bên ngoài.

Trạng thái: **đang phát triển, chưa công bố**. WEB-01 đã build và kiểm tự động. WEB-02 (đưa lên `aftervia.iai.one`) chờ quyền truy cập và quyết định DNS.

## Build

```bash
node apps/landing/build.mjs
```

- Không cần `npm install`. Script chỉ dùng thư viện chuẩn của Node 22.
- Đầu ra: `apps/landing/dist/` (đã nằm trong `.gitignore`).
- Biến `AFTERVIA_SITE_ENV`:
  - `production`: `robots` cho phép lập chỉ mục và `robots.txt` trỏ tới `sitemap.xml`. Chỉ đặt khi đã có phê duyệt công bố (HUM-WEB-03) và quyền domain.
  - `preview` hoặc không đặt: `noindex,nofollow` và `Disallow: /`. Đây là mặc định an toàn.
- Build dừng nếu hai ngôn ngữ lệch khóa, thiếu bản dịch, có cụm từ cấm theo brand, hoặc có số liệu chưa kiểm chứng (`%`).

## Cấu trúc

| Tệp | Vai trò |
|---|---|
| `src/content.mjs` | Toàn bộ chuỗi công khai (VI và EN). Nguồn: `docs/spec/AFTERVIA_AZ_2026-10-31/` |
| `src/render.mjs` | Render HTML, `robots.txt`, `sitemap.xml`, `404.html`; kiểm nội dung |
| `src/styles.css` | Token màu trên `:root`; chế độ tối theo `prefers-color-scheme` |
| `src/og-card.html` | Mẫu ảnh chia sẻ 1200×630 |
| `public/_headers` | CSP và header bảo mật (Cloudflare Pages đọc tệp này trong thư mục output) |
| `public/site.webmanifest`, `public/favicon.svg`, `public/og-image.png` | Manifest, favicon, ảnh chia sẻ |

### Tạo lại `public/og-image.png`

Chụp `src/og-card.html` bằng Chromium ở kích thước 1200×630 và lưu vào `public/og-image.png`. Bước này chạy thủ công, không nằm trong CI. Sau khi đổi ảnh, chạy lại test để kiểm kích thước.

## Kiểm thử

```bash
npx vitest run tests/web
```

`tests/web/landing.test.ts` chạy trong `npm test` và kiểm HTML (parse5), liên kết, tương phản WCAG AA ở hai chế độ, CSP, nội dung, SEO và cấu hình robots/sitemap.

Phạm vi: các kiểm thử này là **tập con** của trang landing. Chúng không thay thế T33 (keyboard và screen reader trên luồng auth, upload, case, grant, delete) và không ghi PASS cho T33 trong ma trận. Kiểm thử screen reader thật vẫn là NOT_RUN.

## Thiết lập Cloudflare Pages (chưa tạo project)

Các thiết lập đề xuất. Phải xác minh lại trên Cloudflare dashboard trước WEB-02.

| Mục | Giá trị đề xuất |
|---|---|
| Root directory | thư mục gốc của repo |
| Build command | `node apps/landing/build.mjs` |
| Build output directory | `apps/landing/dist` |
| Biến môi trường | `NODE_VERSION=22`; `AFTERVIA_SITE_ENV=preview` cho môi trường Preview; `production` cho Production, chỉ khi được duyệt |
| Production branch | chưa chọn. Không đặt nhánh `ccr-*` làm production khi chưa có phê duyệt |
| Custom domain | `aftervia.iai.one`, chỉ thêm sau khi có quyền DNS hoặc hosting và nội dung đã duyệt |

Ghi chú về xác minh: `developers.cloudflare.com` không truy cập được từ phiên làm việc đã dùng để viết landing này, nên các chi tiết Cloudflare ở trên chưa được đối chiếu với tài liệu chính thức. Không coi chúng là đã xác minh.

## Điều kiện còn thiếu

- **WEB-02**: quyền truy cập Cloudflare (token đặt qua biến môi trường, không dán vào chat hoặc repo); quyết định DNS của `iai.one` (không đổi nameserver của cả zone khi chỉ cần một subdomain); xác nhận nơi quản lý DNS hiện tại.
- **HUM-WEB-03**: chủ dự án và luật sư duyệt nội dung công khai, miễn trừ và tên AFTERVIA (D13).
- **Pháp lý**: bản nháp `docs/legal/` ở trạng thái DRAFT, chưa duyệt, chưa công bố.
