# 04 — Lựa chọn lộ trình (giai đoạn C)

## Quyết định

| Lộ trình | Phạm vi áp dụng | Quyết định | Lý do chính |
|---|---|---|---|
| A — Cloudflare Pages (static) | `apps/landing` | **Chọn, BLOCKED** | Build cục bộ thành công [V]. Thiếu tài khoản Cloudflare và token trong phiên [U]. Chưa có quyết định hosting và DNS (D14, WEB-02) [R]. Chưa có phê duyệt nội dung (HUM-WEB-03) [R]. |
| B — Cloudflare Workers cho API | `services/api` | **Loại** | API dùng `node:http` và kết nối Postgres qua `pg` (TCP). Cần viết lại runtime và chọn nhà cung cấp Postgres qua HTTP. Đây là thay đổi kiến trúc, không phải thay đổi triển khai. [R] |
| C — Runner tự host | CI | **Không được ủy quyền** | Không có thẩm quyền đăng ký runner. Runner tự host chạy mã từ PR nên cần quyết định bảo mật của chủ dự án. [R] |
| D — GitHub-hosted, giảm phút | CI còn lại | **Chọn cho CI, chưa áp dụng** | Không cần hạ tầng mới. Hiệu quả chưa đo được vì CI không chạy. Đề xuất ở `06_CI_OPTIMIZATION_PLAN.md`. [V] |

## Đường triển khai landing không cần GitHub Actions

Cloudflare Pages có thể tự build từ Git, nên deploy landing không cần chạy workflow trên GitHub. Ngoài ra, chủ dự án có thể chạy `npm run build:landing` rồi tải `apps/landing/dist` lên bằng công cụ của Cloudflare. Cả hai cách đều không tiêu phút Actions. [R] Chọn cách nào là việc của chủ dự án khi có tài khoản.

## Đường đi bị loại hoặc chưa mở

- **Làm repo công khai để dùng runner miễn phí:** nằm ngoài phạm vi lệnh này. Đây là quyết định của chủ dự án và kéo theo rủi ro lộ mã nguồn. Bộ tài liệu không đề xuất. [R]
- **Chuyển CI sang Cloudflare:** Workers Builds phục vụ triển khai Workers, không thay thế được job kiểm thử cần Postgres. [R]

## Tiêu chí chọn

1. Không đổi production, DNS hay nhánh `main`.
2. Dự kiến chi phí bằng 0 USD trên gói hiện có.
3. Không cần quyền chưa được cấp.
4. Có đường lui.

Lộ trình A đạt tiêu chí 1, 3, 4. Tiêu chí 2 chưa xác minh được vì giới hạn gói Pages chưa đối chiếu với nguồn chính. [R]

Lộ trình D đạt tiêu chí 1, 3, 4. Tiêu chí 2 chưa xác minh vì chưa đo được phút. [V] + [U]

## Hệ quả

- Không có việc triển khai nào được thực hiện trong lượt này.
- CI vẫn dừng cho đến khi chủ dự án xử lý nguyên nhân (xem `12_OWNER_APPROVALS.md`).
