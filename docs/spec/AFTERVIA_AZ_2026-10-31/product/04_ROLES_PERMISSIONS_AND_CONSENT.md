# Quyền và đồng ý chia sẻ
## Mô hình sở hữu
`items.owner_user_id` xác định chủ kho cá nhân. `organizations` là ranh giới tenant B2B. Một tài liệu không tự thuộc cửa hàng chỉ vì hóa đơn có tên cửa hàng. Case liên kết item và merchant nhưng quyền tài liệu nằm trong grant riêng.
Merchant không thấy toàn bộ kho của khách; partner không thấy toàn bộ khách của merchant. Family group cũng không mặc định chia mọi item.

| Actor | Đọc kho cá nhân | Đọc case | Tải tài liệu | Đổi trạng thái | Quản trị tổ chức |
|---|---|---|---|---|---|
| Personal owner | Của mình | Có tham gia | Của mình hoặc có grant | Hành động của khách | Không |
| Family member | Item được chia | Có participant | Có document grant | Theo scope | Không |
| Merchant agent | Không | Org + assignment/scope | Document grant còn hiệu lực | Theo role và state | Không |
| Merchant manager | Không | Org được phân quyền | Document grant còn hiệu lực | Theo role | Một phần |
| Merchant owner | Không | Org theo chính sách | Không vượt document grant | Theo role | Có |
| Partner | Không | Case được mời | Tài liệu cụ thể | Chỉ cập nhật phần được giao | Không |
| Support | Không mặc định | Break-glass | Grant support riêng | Không thay kết quả | Không |

## Consent
Tách đồng ý xử lý cần thiết, marketing, AI processing và chia sẻ cho bên thứ ba; không dùng một checkbox “đồng ý mọi thứ”. Cơ sở pháp lý cụ thể do counsel xác nhận; không coi consent là cơ sở duy nhất cho mọi xử lý.
Màn hình grant cho biết người nhận, file nào, mục đích, thời hạn, có tải xuống hay chỉ xem, cách thu hồi. Lưu policy_version, actor, scope, timestamp, revoked_at. Không thu thông tin vị trí hay danh bạ nếu không cần.

## Enforcement
API và DB kiểm quyền server-side; UI ẩn nút không phải security. Mỗi read/write dùng identity đã xác thực, membership hiện tại, org/case/item scope; kiểm tra cả storage, search, export, analytics, notifications. Object ID đoán được không được coi là quyền.
Thu hồi role phải ảnh hưởng ở lần gọi tiếp theo; signed URL cũ có thể còn hiệu lực tới TTL nếu chỉ dùng storage URL. Để đáp ứng thu hồi ngay tài liệu nhạy cảm, dùng authorization proxy không public URL dài hạn. Nói rõ giới hạn không thể thu hồi bản đã tải hợp lệ.

## Xung đột
Chuyển nhân viên không chuyển quyền kho cá nhân. Merchant rời nền tảng không xóa hồ sơ cá nhân của khách. Người dùng yêu cầu xóa không thể tự xóa mọi chứng từ mà merchant có nghĩa vụ giữ hợp pháp; tách bản gốc, bản chia sẻ và retention với giải thích cụ thể.
