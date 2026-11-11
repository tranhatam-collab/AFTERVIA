# 12 — Việc chờ chủ dự án

Các việc dưới đây cần chủ dự án làm hoặc quyết định. Agent không thể làm thay.

| # | Việc | Vì sao cần | Nhãn |
|---|---|---|---|
| 1 | Mở **Billing & plans** của tài khoản. Xem Actions usage tháng 11/2026, hạn mức và spending limit | Xác minh "0 USD"; kiểm H1 | [P] |
| 2 | Kiểm **Settings → Rules → Rulesets** và mục **Required workflows** | Kiểm H2 | [P] |
| 3 | Kiểm **Settings → Actions → General** và giới hạn cấp tổ chức | Kiểm H3 | [P] |
| 4 | Xác định nguồn của workflow id 414146482 (không thuộc repo) | Kiểm H4 | [P] |
| 5 | Chọn hướng giữ CI trong hạn mức: (a) áp dụng `06`; (b) chỉ chạy CI khi cần; (c) dùng kiểm tra cục bộ làm cổng tạm thời | Đánh đổi giữa chi phí và kiểm thử tự động | [P] |
| 6 | Tạo hoặc xác nhận tài khoản Cloudflare. Tạo token phạm vi Pages và lưu vào secret store. Không gửi token qua chat | Mở lộ trình A | [P] |
| 7 | Chốt hosting và DNS (D14, WEB-02). DNS không đổi trong lệnh này | Điều kiện cho production | [P] [R] |
| 8 | Phê duyệt nội dung landing (HUM-WEB-03) | Điều kiện cho production | [P] [R] |
| 9 | Duyệt đề xuất trong `06` trước khi áp dụng | Thay đổi `ci.yml` | [P] |
| 10 | Quyết các mục mở D16–D22 trong sổ quyết định (`docs/plan/06_DECISION_QUEUE.md`). D20 và D22 liên quan đến CI | Đã có từ trước | [R] |

## Không được ủy quyền

- **Lộ trình C** (runner tự host): không được ủy quyền trong lệnh này. Nếu chủ dự án muốn xem xét, cần một quyết định bảo mật riêng. [R]
- **Làm repo công khai:** nằm ngoài phạm vi, không đề xuất. [R]

## Ghi chú

Việc 1–4 chỉ cần đọc trang của GitHub, không cần công cụ mới. Kết quả nên được ghi lại vào `03_BILLING_EVIDENCE.md` để thay thế các giả thuyết H1–H4. [P]
