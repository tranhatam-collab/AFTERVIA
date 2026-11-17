# 09 — Công tắc có kiểm soát (giai đoạn G)

**Trạng thái: NOT_EXECUTED.** Không có công tắc nào được thực hiện trong lượt này.

## Hai công tắc được chuẩn bị

1. **Landing:** chuyển từ "chưa có hosting" sang Cloudflare Pages. Preview trước, production sau khi được duyệt.
2. **CI:** chuyển sang cấu hình đã tối ưu (xem `06_CI_OPTIMIZATION_PLAN.md`), sau khi nguyên nhân dừng được xử lý.

## Điều kiện tiên quyết (đều PENDING)

| # | Điều kiện | Nhãn |
|---|---|---|
| 1 | Chủ dự án xác nhận tài khoản Cloudflare và cấp token phạm vi Pages | [P] |
| 2 | Chủ dự án chốt hosting và DNS (D14, WEB-02). DNS không đổi trong lệnh này | [P] [R] |
| 3 | Phê duyệt nội dung landing (HUM-WEB-03) cho production | [P] [R] |
| 4 | Có số liệu billing thật từ trang Billing & plans (xem `03`) | [P] |
| 5 | Nguyên nhân CI dừng được xử lý và có một run `ci.yml` hoàn tất | [P]; hiện chưa có [V] |
| 6 | Chủ dự án duyệt đề xuất trong `06` trước khi áp dụng | [P] |

## Trình tự khi đủ điều kiện (chưa chạy)

**Landing**

1. Chủ dự án tạo project Pages, cấu hình theo `10_DEPLOY_PROCESS.md`.
2. Kích hoạt preview từ một nhánh không phải `main`. Kiểm tra `_headers` có trong đầu ra và robots là `noindex`.
3. Chủ dự án xem preview và xác nhận nội dung.
4. Production chỉ khi có phê duyệt nội dung (HUM-WEB-03). Khi đó mới đặt `AFTERVIA_SITE_ENV=production`.
5. Gắn tên miền sau khi có quyết định DNS. Thao tác này nằm ngoài lệnh này.

**CI**

1. Chủ dự án xác nhận nguyên nhân dừng (xem `12_OWNER_APPROVALS.md`, mục 1–4).
2. Áp dụng từng đề xuất trong `06` bằng một commit riêng, từ rủi ro thấp đến cao.
3. Sau mỗi commit, chờ run đầu tiên hoàn tất và kiểm kết quả.
4. Nếu một đề xuất làm run lỗi, revert commit đó (xem `11_ROLLBACK.md`).

## Ai thực hiện

Chủ dự án, hoặc người được chủ dự án cấp quyền Cloudflare và quyền ghi repo. Agent không thực hiện bước nào trong danh sách trên khi chưa có quyền và phê duyệt tương ứng.
