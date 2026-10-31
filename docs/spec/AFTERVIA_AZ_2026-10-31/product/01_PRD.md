# PRD — AFTERVIA MVP 1.0
Trạng thái: đặc tả đề xuất, chưa triển khai. Owner đề xuất: Trần Hà Tâm; product lead và kỹ sư chưa được bổ nhiệm. T0 là ngày duyệt phạm vi, không phải ngày mặc định mở hệ thống.

## 1. Kết quả sản phẩm
Một khách từ mobile/web tạo hồ sơ có chứng từ, một cửa hàng xử lý trên web, một đối tác chỉ nhận tài liệu được cấp, các bên xem trạng thái nhất quán và xuất được lịch sử. Hoàn chỉnh là hoàn chỉnh luồng này, không phải xây mọi ý tưởng tương lai.

## 2. Vai trò
Personal owner sở hữu kho riêng. Family member chỉ xem item được chia. Merchant owner quản trị tổ chức, manager phân công, agent xử lý theo quyền. Partner là người được mời vào case có phạm vi. Support chỉ dùng quyền break-glass có thời hạn và phê duyệt, không mặc định đọc toàn bộ.

## 3. P0 — luồng sản phẩm
Đăng ký/đăng nhập; xác nhận email; chọn ngôn ngữ và thị trường được hỗ trợ; thêm item bằng nhập tay hoặc document upload; AI đề xuất merchant/date/amount/currency/item name; người dùng xác nhận; lưu item và nguồn.
Tạo case: chọn item, mô tả vấn đề, tài liệu muốn chia sẻ, cửa hàng nhận. Người dùng xem trước quyền chia. Cửa hàng tiếp nhận, yêu cầu phần thiếu, gán nhân viên, đổi trạng thái có lý do; partner tham gia chỉ khi được cấp quyền. Đóng case có outcome và evidence; khách có thể mở lại hoặc ghi không đồng ý.
Nhắc việc là nhắc mốc người dùng hoặc merchant xác nhận; không tự suy hạn pháp lý. Xuất hồ sơ ZIP/JSON và bản đọc được. Xóa tài khoản theo chính sách đã duyệt, hiển thị phần retention bắt buộc nếu có.

## 4. State machine
draft → submitted → triaged → waiting_customer / waiting_merchant / waiting_partner → in_progress → resolved → closed.
withdrawn là dừng theo yêu cầu, không phải kết quả được giải quyết. reopened quay về triaged với reason. Chỉ server cho phép transition; mọi transition có actor, timestamp, previous_state, next_state, reason, request_id. Không dùng chỉnh trực tiếp status từ client.

## 5. Phạm vi P1
Billing sandbox rồi live có phê duyệt; entitlement server; imports CSV có validation; analytics của merchant; template theo ngành; permission family. Chỉ mở tính năng thu tiền khi đầy đủ refund/cancel/delete/store review. MVP beta có thể invite-only không thu tiền trước.

## 6. Không làm trong MVP
Tự gửi yêu cầu pháp lý, tự gọi hãng, kết nối toàn bộ inbox, tự mua dịch vụ sửa, tự chuyển tiền, chẩn đoán an toàn thiết bị, insurance, cashback, marketplace, token, bán dữ liệu.
Thông tin yêu cầu sửa chữa chỉ chuyển cho người có chuyên môn; không tạo hướng dẫn tự sửa nguy hiểm.

## 7. NFR đề xuất
Web thao tác phổ biến p95<2,5 giây trong tải pilot đã định; API đọc đơn p95<800ms ở cùng region; AI asynchronous không chặn lưu nhập tay; file tối đa10MB tại pilot; chấp nhận JPEG/PNG/PDF đã quét; retry idempotent; không hứa xử lý mọi định dạng.
SLO beta mục tiêu99,5% theo tháng, phải có số đo; RPO24h/RTO8h đề xuất và phải diễn tập. Những con số này là mục tiêu thiết kế, không SLA đã ký.

## 8. Định nghĩa hoàn thành
Luồng đầu cuối trên iPhone/Android thật và web; mọi test critical/high pass; không lỗi phân quyền; export/import độc lập; backup/restore thử thành công; code và quyền khai thác xác nhận; privacy/store/billing duyệt; monitoring và người chịu trách nhiệm sẵn sàng.
Mọi tiêu chí có artifact chứng minh. Không lấy ảnh preview làm bằng chứng backend.
