# 03 — Bằng chứng billing (giai đoạn B)

## Kết luận

- Chưa xác minh được chi phí Actions thực tế của tài khoản. [U]
- API trả về **0 phút tính phí** cho mọi run đã kiểm, kể cả các run chạy 2–6 phút. Con số này không khớp với thời lượng thật nên không dùng để kết luận. [V] + [U]
- Trạng thái "0 USD" hiện **chưa được chứng minh**. Không đánh dấu PASS cho mục này.

## Số đo từ API (lượt này)

Gọi `get_workflow_run_usage` cho sáu run:

| Run | Kết quả | `run_duration_ms` | Số job | Billable UBUNTU (`total_ms`) |
|---|---|---|---|---|
| 42811155973 | success | 116 000 (1 m 56 s) | 3 | 0 |
| 42812018835 | success | 162 000 (2 m 42 s) | 3 | 0 |
| 42812957967 | success | 127 000 (2 m 07 s) | 3 | 0 |
| 42813434092 | success | 342 000 (5 m 42 s) | 3 | 0 |
| 42813577068 | success | 238 000 (3 m 58 s) | 3 | 0 |
| 42870398639 | failure | 5 000 (5 s) | 3 | 0 |

[V] Mỗi run có 3 job, khớp với ba job trong `ci.yml`. Thời lượng từng job (`duration_ms`) cũng bằng 0 ở mọi job đã kiểm.

Cách đọc:

- Run thất bại 5 giây có billable 0 là hợp lý, vì job không khởi động.
- Run thành công chạy 2–6 phút mà billable 0 thì không hợp lý. Có ba khả năng chưa phân biệt được:
  1. Tài khoản hoặc repo không được ghi nhận phút tính phí trong API này.
  2. API hoặc công cụ trả dữ liệu không đầy đủ.
  3. GitHub ghi nhận các job này là không tính phí.
- Cách phân biệt: chủ dự án mở trang Billing & plans của tài khoản và xem Actions usage của tháng 11/2026. [P]

## Hạn mức gói (tra cứu web, 2026-11-11; cần đối chiếu trang chính thức)

Nguồn: tài liệu GitHub "How use of GitHub Actions is measured" và "About GitHub's plans".

- Phút miễn phí mỗi tháng: Free và Organization 2 000; Pro 3 000; Team 3 000; Enterprise Cloud 50 000. [R]
- Hạn mức tính theo tài khoản và reset đầu mỗi tháng. [R]
- Repo công khai dùng runner tiêu chuẩn không tốn phí. Repo này là private nên không áp dụng. [R]
- Phí vượt hạn mức: một trang so sánh ghi 0,006 USD/phút cho Linux. Chưa xác minh với bảng giá chính thức. [R, chưa xác minh]
- Hệ số nhân theo hệ điều hành chưa đối chiếu được từ nguồn chính. [U]
- Một kết quả tìm kiếm nêu Copilot code review có thể trừ phút Actions trên repo private. Chưa xác minh. Nếu đúng, cần kiểm tra xem tác vụ này có đang chạy không. [R, chưa xác minh]

## Giả thuyết về việc job không khởi động (chưa kiểm chứng)

| Mã | Giả thuyết | Cách kiểm tra | Nhãn |
|---|---|---|---|
| H1 | Tài khoản đã hết phút trong gói hoặc đạt giới hạn chi tiêu, nên job không khởi động | Billing & plans: Actions usage và Spending limit | [P] |
| H2 | Có ruleset hoặc required workflow trỏ tới workflow lỗi | Settings → Rules → Rulesets; mục Required workflows | [P] |
| H3 | Actions bị giới hạn ở cấp tổ chức hoặc tài khoản | Settings → Actions → General | [P] |
| H4 | Workflow id 414146482 (không thuộc repo) liên quan đến lỗi | Xác định nguồn của workflow này | [P] |

H1 khớp với thời điểm lỗi bắt đầu, nhưng chưa có bằng chứng. Không kết luận gì từ H1 cho đến khi chủ dự án đối chiếu được số liệu.

## Chi phí hiện tại

- Các run thất bại gần đây dài 4–7 giây và có billable 0 (đo trên run 42870398639). Vì CI đang dừng, hiện không có phút mới nào bị tính. [V]
- Tắt CI để tiết kiệm phút cũng có nghĩa là không còn kiểm thử tự động trên PR. Đây là đánh đổi chủ dự án cần quyết. [P]

## Dữ liệu còn thiếu

- Số phút đã dùng theo tháng, hóa đơn, hạn mức còn lại, trạng thái spending limit. [U]
- Công cụ billing không có trong phiên này.

## Phụ lục 13/11/2026 — thêm một điểm dữ liệu

Run 132 (43346472969): chạy THẬT 123 giây, 3 job đủ bước, kết quả success — và
`get_workflow_run_usage` vẫn trả `total_ms: 0` cho cả ba job. [V]

Điều này củng cố kết luận cũ: **API usage không dùng được để kết luận chi phí** trên tài
khoản này (0 phút cho cả run thật lẫn run lỗi). Nguồn duy nhất còn lại là trang Billing &
plans của tài khoản. Hai câu hỏi cho chủ dự án khi mở trang đó:
1. Tháng 11 đã dùng bao nhiêu phút Actions, hạn mức còn lại, spending limit đặt ở đâu?
2. Có sự kiện nào (hết hạn mức, thanh toán, đổi cài đặt) khớp mốc 10/11 ~16:50 UTC (bắt đầu
   lỗi) và mốc trước 13/11 01:38 UTC (chạy lại)? Trả lời được là đóng H1–H4.
