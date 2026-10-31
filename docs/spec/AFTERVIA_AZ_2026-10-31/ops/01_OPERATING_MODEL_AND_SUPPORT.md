# Mô hình vận hành
## Nhân sự đề xuất
Founder chịu trách nhiệm lựa chọn thị trường, vốn và release. Product lead thu insight/PRD/metrics. Kỹ sư chịu kiến trúc và code. AI builder hỗ trợ tác vụ hẹp. Reviewer độc lập phụ trách security/test. Customer operations onboarding/support. Pháp lý theo việc kiểm quyền/IP/privacy/consumer. Finance đối chiếu tiền.
Những vai trò này chưa được tuyển/bổ nhiệm. Không viết tên người thật vào trách nhiệm chưa được họ nhận.

## Nhịp điều hành
Hằng ngày trong pilot: lỗi P0, dữ liệu/rủi ro, case bị kẹt, cost cap, reconciliation exceptions.
Hằng tuần: cohort activation, merchant active, lý do churn, support minutes, AI corrections, bug trend, backlog.
Hằng tháng: revenue/refund/fee/cash-in tách riêng; runway, budget gate, vendor changes, restore exercise, quyền truy cập.
Đây là playbook, không phải automation đã được tạo.

## AI agent boundaries
Research agent chỉ nguồn được phép; product agent đề xuất; dev agent sửa branch; QA agent khác kiểm; operations agent đọc logs redacted; finance agent tính từ sources xác nhận. Không agent nào tự nâng quyền, vượt ngân sách, thông qua code chính mình hay bật thanh toán.
Mỗi hành động ngoài hệ thống có approval/hạn mức/audit. Không mô tả toàn bộ doanh nghiệp vận hành100% không người.

## Support
Pilot công bố giờ làm thực. Yêu cầu hỗ trợ có ticket, severity, owner, next update. Không dùng tài khoản admin chung. Screen share/temporary access có đồng ý, thời hạn, log và redaction.
Không hứa24/7 trước có on-call. Severe incident ưu tiên bảo vệ dữ liệu hơn việc giữ giao diện hoạt động.

## Người tiêu dùng và cửa hàng tranh chấp
AFTERVIA giữ timeline và các phát biểu được gắn tác giả, không tự phán ai đúng. Cho phép đánh dấu disputed và bổ sung chứng cứ; không xóa lịch sử để làm đẹp metrics. Escalation đến kênh có thẩm quyền theo country pack, không giả làm cơ quan xử lý.
