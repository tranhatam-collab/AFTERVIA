# STOP / RESUME

## STOP (send to the active Claude session)
DỪNG TẤT CẢ VÒNG LẶP GHI MÃ của AFTERVIA sau khi checkpoint an toàn: không chọn task mới, không push, không tự tái tạo lịch. Nếu task đang chỉnh sửa, ghi trạng thái trung thực và không phá working tree. Liệt kê mọi active loop, cron, send_later, Cloud Routine có thể liên quan và hủy/tạm dừng CHỈ khi công cụ thực sự có quyền và trả kết quả xác nhận. Giữ source, PR, logs và evidence. Báo kết quả dừng và mọi scheduler chưa thể xác minh.

## RESUME (send only after verifying no competing writer)
KIỂM TRA và tiếp tục AFTERVIA từ trạng thái remote Git, backlog và evidence mới nhất. Trước hết xác minh không có hai writer/scheduler cạnh tranh và chưa vượt quota/budget. Đọc master execution order, nhận diện task P0/P1 tiếp theo, kiểm tra HEAD/CI/PR rồi code, test, commit/push non-force trong phạm vi được phép. Không khởi tạo project lại, không dùng main trống, không mở live payments/production hay đăng ký chi phí mới.
