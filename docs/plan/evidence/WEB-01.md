# WEB-01: landing tĩnh VI/EN (AFTERVIA)

- Task: WEB-01 (AUTO, P0). Acceptance trong backlog: US18, T33.
- Trạng thái: DONE trên nhánh `ccr-4544c9f7-b1t50m`. Landing CHƯA công bố: không triển khai, không tạo project Cloudflare, không thêm custom domain, không đổi DNS. Các việc đó thuộc WEB-02 (BLOCKED).
- Phạm vi kiểm: tập con của US18 và T33. Xem mục "Phạm vi và quyết định".

## Lệnh đã chạy và kết quả

| Lệnh | Kết quả |
|---|---|
| `node tools/loop/backlog.mjs start WEB-01` | OK, iterations_used 11 lên 12 |
| `npm install --save-dev --save-exact parse5@8.0.1` | Cài thành công, npm báo 0 lỗ hổng; package-lock tăng 27 dòng |
| Chụp `public/og-image.png` bằng Chromium (ngoài repo) | 1200×630, 42.9 KB |
| `node apps/landing/build.mjs` | `landing OK: 10 tệp, môi trường preview` |
| `npx vitest run tests/web` | 24/24 pass |
| Kiểm trình duyệt thật (Chromium và Playwright, ngoài repo, CSP lấy từ `public/_headers`) | 12 tổ hợp: vi và en, sáng và tối, rộng 360, 768, 1280. Không tràn ngang, không lỗi console, không vi phạm CSP. Tab đầu tiên tới skip link, Enter đưa tới `#main`. Mọi neo đều có đích. Nút đổi ngôn ngữ trả 200 |
| `TEST_DATABASE_URL` (trỏ `aftervia_test`) `npm run verify` | exit 0: bundle 69/69; quét bí mật 85 tệp; typecheck; build:landing; Vitest 115/115 (trước đó 91); kiểm thử vòng lặp 13/13 |
| `npx vitest run --reporter=json` rồi `node tools/loop/matrix.mjs from-report` | `changes: []`. Ma trận giữ PASS 7, NOT_RUN 39 |

Tổng 24 kiểm thử landing: US18 (5), cấu trúc và liên kết và tương phản và 404 (8), riêng tư và CSP (3), nội dung, giá, trạng thái và thương hiệu (4), SEO, robots, sitemap và manifest (4).

## Tệp đổi

- `apps/landing/`: `build.mjs`, `README.md`, `src/content.mjs`, `src/render.mjs`, `src/styles.css`, `src/og-card.html`, `public/_headers`, `public/site.webmanifest`, `public/favicon.svg`, `public/og-image.png`.
- `tests/web/landing.test.ts`.
- `docs/legal/DRAFT_quyen-rieng-tu.md`, `docs/legal/DRAFT_dieu-khoan.md`: DRAFT, không công bố, trang không liên kết tới.
- `package.json`: thêm script `build:landing`, đưa build vào `verify`. `package-lock.json`: thêm `parse5` 8.0.1 (dev, pin chính xác).
- `docs/plan/backlog.json`: WEB-01 DONE; WEB-02 BLOCKED (qua công cụ).
- `docs/plan/evidence/WEB-01.md`: tệp này.

Migration: không có. Dữ liệu: không có.

## Phạm vi và quyết định

- Tên kiểm thử không mang mã T-xx. T33 trong đặc tả là keyboard và screen reader trên luồng auth, upload, case, grant, delete. Landing chỉ là tập con, nên không ghi PASS cho T33. T33 vẫn NOT_RUN. US18 không có dòng trong ma trận.
- Không form, không input, không script, không iframe, không style inline, không font hay ảnh bên ngoài. CSP có `default-src 'none'`, `script-src 'none'`, `form-action 'none'`, `frame-ancestors 'none'`.
- Giá: năm mức đề xuất USD/tháng lấy từ `strategy/02_BUSINESS_MODEL_PRICING.md`. Mỗi mức có nhãn Đề xuất. Mục giá ghi rõ chưa mở bán. Không có nút mua hay thanh toán.
- Trạng thái: nhóm Đang có, Đang thử, Dự kiến. Tính năng chưa có không được trình bày như đã có. Đăng nhập hiện là giả lập và được ghi rõ.
- Pháp lý: hai bản nháp DRAFT trong `docs/legal/`, không công bố, không liên kết từ trang.
- Email liên hệ: không hiển thị. Trang ghi rõ chưa có kênh liên hệ công khai.
- Tên AFTERVIA: chân trang ghi là tên làm việc, chưa đăng ký hoặc kiểm tra nhãn hiệu (D13).
- Robots: bản preview mặc định `noindex` và `Disallow: /`. Chỉ đặt `AFTERVIA_SITE_ENV=production` mới cho lập chỉ mục.
- Vị trí mã: `apps/landing/`. Manifest đặc tả chỉ định `apps/web` và `apps/mobile` cho ứng dụng. Landing là trang tĩnh không framework nên tách riêng.

## Giới hạn còn lại

- WEB-02 chưa làm. Chưa có quyền Cloudflare Pages, chưa biết DNS của `iai.one` nằm ở đâu (D14), token chưa được cấp (D15).
- Thiết lập Cloudflare trong README chưa đối chiếu với tài liệu chính thức. `developers.cloudflare.com` không phân giải được từ phiên này (getaddrinfo ENOTFOUND). Phải kiểm lại khi có quyền truy cập.
- Chưa có kiểm định screen reader thật và chưa kiểm trên thiết bị thật. Không cài axe-core; kiểm tương phản và cấu trúc bằng kiểm thử riêng.
- CSP và header bảo mật: chờ reviewer độc lập. Không tự gọi là đã duyệt.
- Nội dung chưa được chủ dự án và luật sư duyệt (HUM-WEB-03).
- Ảnh chia sẻ tạo thủ công bằng Chromium, không nằm trong CI. Ảnh chụp kiểm trình duyệt lưu trong thư mục scratchpad của phiên, không đưa vào repo.

## Rollback

- `git revert` commit của WEB-01. Hoặc xóa `apps/landing/`, `tests/web/landing.test.ts`, `docs/legal/DRAFT_*.md`, và khôi phục `package.json` và `package-lock.json`.
- Không có migration và không có dữ liệu cần khôi phục.
