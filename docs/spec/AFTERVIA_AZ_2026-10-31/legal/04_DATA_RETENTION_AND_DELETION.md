# Retention và xóa dữ liệu — thiết kế đề xuất
Các thời hạn dưới đây là đề xuất vận hành để luật sư và DPO review, không khẳng định là yêu cầu pháp luật.

| Loại | Đề xuất | Điều kiện |
|---|---|---|
| Upload thất bại/quarantine | 7 ngày | Xóa sớm khi phát hiện nguy cơ, giữ metadata an ninh cần thiết |
| Tài liệu/record active | Đến khi người dùng xóa hoặc kết thúc dịch vụ + grace | Quyền merchant giữ chứng từ hợp pháp phải tách |
| Export tạm | 24 giờ | Link hết hạn; file job riêng |
| Operational logs không PII | 30 ngày | Cần điều tra đặc biệt có phê duyệt |
| Security/audit logs tối thiểu | 180 ngày | Kiểm nghĩa vụ thực và data minimization |
| Backup | 30 ngày rolling | Không phục hồi dữ liệu đã xóa vào active nếu không reapply tombstone |
| Billing records | Theo luật áp dụng | Chưa chốt số năm toàn cầu |

## Quy trình xóa
Xác thực yêu cầu phù hợp mức rủi ro → giải thích phần bị xóa/giữ → thu hồi session/grants → đánh dấu tombstone → xử lý primary/AI caches/search → hủy job và exports → backup expiry → receipt. Không yêu cầu gửi thêm giấy tờ nhạy cảm nếu đã đủ xác thực.
Google Play/App Store yêu cầu account deletion cần đối chiếu trên build và web liên quan [S30][S31].
Xóa tài khoản không được giả thành “deactivate” vô thời hạn. Phần phải giữ cần có mục đích, hạn, quyền truy cập và thông báo.

## Export
JSON có version/schema, CSV các bảng người dùng hiểu được, bản đọc HTML và documents được phép. Hash là hỗ trợ kiểm toàn vẹn, không tự chứng minh tài liệu gốc thật. Không export tài liệu của bên khác vượt grant.
## Subprocessors
Có inventory, hợp đồng và deletion request theo provider; lưu kết quả và ngoại lệ. Không hứa xóa tức thì mọi backup nếu thiết kế thực không làm được.
