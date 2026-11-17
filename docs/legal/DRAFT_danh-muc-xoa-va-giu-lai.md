# Danh mục xóa và giữ lại dữ liệu — BẢN NHÁP ĐỂ LUẬT SƯ DUYỆT

Ngày dựng: 2026-11-10 · Nguồn: lược đồ cơ sở dữ liệu thật của AFTERVIA · Task: `HUM-LEGAL-DEL-01`

> **Tài liệu này KHÔNG phải tư vấn pháp lý và không chứa quyết định pháp lý nào.** Nó là bản kiểm kê
> do đội kỹ thuật dựng, để luật sư có đủ dữ kiện mà quyết. Mọi ô ghi **CHƯA QUYẾT** là việc chờ
> luật sư, không phải lỗ hổng bị che.
>
> **Hệ thống hiện chưa có dữ liệu khách hàng thật** (chỉ dữ liệu tổng hợp trong môi trường thử).
> Đây là thời điểm rẻ nhất để đổi cấu trúc nếu câu trả lời pháp lý đòi hỏi.
>
> Tài liệu này được **sinh ra từ mã**, không viết tay. Có kiểm thử tự động so bản kiểm kê với lược đồ
> thật; thêm một bảng mà không phân loại thì kiểm thử đỏ. Nghĩa là bản luật sư ký không âm thầm lạc hậu.

## 1. Việc cần luật sư quyết: 28 trên 32 bảng

Trong đó **6 bảng rủi ro cao**: chúng mang nhiều hơn mã định danh (văn bản tự do, giá trị
trích xuất, hoặc toàn bộ nội dung) và việc xóa chúng chưa có quy tắc nào.

| Bảng | Dữ liệu cá nhân | Khi xóa tài khoản | Thời hạn giữ | Ghi chú của đội kỹ thuật |
|---|---|---|---|---|
| **billing_events** | toàn bộ nội dung hồ sơ hoặc tệp | **CHƯA QUYẾT** | **CHƯA QUYẾT** | payload lưu NGUYÊN thân webhook của nhà cung cấp, nên có thể chứa email hoặc tên. Cần luật sư quyết, và có thể cần lọc trước khi lưu. |
| **break_glass_requests** | văn bản tự do (xem ghi chú: ai nhập) | **CHƯA QUYẾT** | **CHƯA QUYẾT** | reason do nhân viên hỗ trợ nhập và nói về một case của khách. |
| **case_event_reasons** | văn bản tự do (xem ghi chú: ai nhập) | **CHƯA QUYẾT** | **CHƯA QUYẾT** | Bảng SỬA ĐƯỢC, tách ra từ case_events đúng để nội dung này xóa được (WO11-02e-CASE). Cơ chế đã có; quyết định xóa hay giữ thì chưa. |
| **documents** | toàn bộ nội dung hồ sơ hoặc tệp | **CHƯA QUYẾT** | **CHƯA QUYẾT** | Hàng này chỉ là metadata; BYTE của tệp nằm ở kho ngoài chưa chọn (DEC06). Xóa hàng này không xóa tệp. |
| **field_confirmation_values** | giá trị trích xuất từ chứng từ | **CHƯA QUYẾT** | **CHƯA QUYẾT** | Bảng SỬA ĐƯỢC, tách từ field_confirmations (WO11-02e-CONF). Giá trị trích xuất như ngày mua, số tiền. |
| **items** | văn bản tự do (xem ghi chú: ai nhập) | **CHƯA QUYẾT** | **CHƯA QUYẾT** | title, brand, model do người dùng nhập. Đây là hồ sơ chính; quyết định ở đây là quyết định lớn nhất. |

### Câu hỏi cụ thể cho từng bảng rủi ro cao

1. `items` — hồ sơ chính của người dùng (tên món đồ, hãng, model, ngày mua). Khi khách yêu cầu xóa:
   xóa hẳn, hay giữ lại vì bên bán cần chứng từ bảo hành? Nếu giữ, giữ bao lâu và ai được xem?
2. `documents` — hàng trong bảng chỉ là metadata; **byte của tệp nằm ở kho ngoài chưa chọn**.
   Xóa hàng này KHÔNG xóa tệp. Nghĩa vụ xóa tệp trong bao lâu kể từ khi nhận yêu cầu?
3. `case_event_reasons` — lý do người dùng tự nhập trong lịch sử hồ sơ hậu mãi. Che nội dung có được
   tính là "đã xóa", hay phải xóa hẳn cả dòng lịch sử?
4. `field_confirmation_values` — giá trị trích xuất (ngày mua, số tiền) kèm giá trị cũ và mới.
5. `billing_events` — lưu **nguyên thân webhook** của nhà cung cấp thanh toán, nên có thể chứa email
   hoặc tên. Hai câu hỏi: được giữ bao lâu theo nghĩa vụ kế toán, và có phải lọc trước khi lưu?
6. `break_glass_requests` — lý do nhân viên hỗ trợ nhập khi xin quyền xem một hồ sơ. Nói về khách.

## 2. Những việc hệ thống ĐÃ làm hôm nay khi có yêu cầu xóa

Phần này không chờ quyết định; nó đã chạy và có kiểm thử:

- Yêu cầu xóa chỉ được nhận khi phiên đăng nhập vừa được cấp trong **5 phút** (xác thực lại).
- Mọi quyền chia sẻ tài liệu và mọi vai trò tham gia hồ sơ bị **thu hồi** ngay.
- Thành viên tổ chức chuyển sang **REVOKED**. Người là chủ sở hữu duy nhất của một tổ chức còn hoạt
  động thì **bị từ chối** xóa, kèm lý do, để tổ chức không mất chủ.
- Tài khoản chuyển sang `PENDING_DELETION`; mọi thao tác ghi bị chặn ở tầng cơ sở dữ liệu.
- Một **tombstone** được ghi, và được giữ cả **ngoài bản sao lưu**, nên khôi phục một bản sao lưu cũ
  hơn lần xóa KHÔNG đưa tài khoản đã xóa trở lại hoạt động.
- Biên nhận trả cho người dùng **liệt kê các việc chưa hoàn tất**, không báo một câu "đã xóa xong".
- Gói xuất dữ liệu tạm tự hết hạn sau **24 giờ**.

## 3. Bản kiểm kê đầy đủ: 32 bảng

11 bảng là **chỉ cho thêm** (không sửa, không xóa được, kể cả bởi chủ bảng).
Nội dung cá nhân đã được chuyển ra các bảng sửa được bên cạnh, đúng để nó xóa được khi cần.

| Bảng | Dữ liệu cá nhân | Chỉ thêm | Khi xóa tài khoản | Thời hạn giữ | Ghi chú |
|---|---|---|---|---|---|
| `account_deletion_requests` | chỉ mã định danh | có | giữ lại | **CHƯA QUYẾT** | Chính là hồ sơ của yêu cầu xóa. Xóa nó là xóa bằng chứng đã xử lý yêu cầu. |
| `account_tombstones` | chỉ mã định danh | có | giữ lại | **CHƯA QUYẾT** | Phải sống lâu hơn tài khoản, và được giữ cả ngoài bản sao lưu (WO16-01b), nếu không bản khôi phục sẽ đưa tài khoản đã xóa về ACTIVE. |
| `audit_events` | chỉ mã định danh | có | giữ lại | 180 ngày (đề xuất legal/04) | Thiết kế không đặt dữ liệu cá nhân vào details. Chưa có kiểm thử nào ép điều đó. |
| `billing_events` | toàn bộ nội dung hồ sơ hoặc tệp | có | **CHƯA QUYẾT** | **CHƯA QUYẾT** | payload lưu NGUYÊN thân webhook của nhà cung cấp, nên có thể chứa email hoặc tên. Cần luật sư quyết, và có thể cần lọc trước khi lưu. |
| `break_glass_requests` | văn bản tự do (xem ghi chú: ai nhập) | — | **CHƯA QUYẾT** | **CHƯA QUYẾT** | reason do nhân viên hỗ trợ nhập và nói về một case của khách. |
| `case_document_grants` | chỉ mã định danh | — | thu hồi quyền | **CHƯA QUYẾT** | request_account_deletion đặt revoked_at cho mọi grant liên quan. |
| `case_event_reasons` | văn bản tự do (xem ghi chú: ai nhập) | — | **CHƯA QUYẾT** | **CHƯA QUYẾT** | Bảng SỬA ĐƯỢC, tách ra từ case_events đúng để nội dung này xóa được (WO11-02e-CASE). Cơ chế đã có; quyết định xóa hay giữ thì chưa. |
| `case_events` | chỉ mã định danh | có | giữ lại | **CHƯA QUYẾT** | Lý do tự do đã chuyển sang case_event_reasons. |
| `case_evidence` | chỉ mã định danh | có | giữ lại | **CHƯA QUYẾT** |  |
| `case_participants` | chỉ mã định danh | — | thu hồi quyền | **CHƯA QUYẾT** |  |
| `case_transition_rules` | không có dữ liệu về người | — | không áp dụng | not_applicable | Dữ liệu tham chiếu của hệ thống. |
| `cases` | chỉ mã định danh | — | **CHƯA QUYẾT** | **CHƯA QUYẾT** | legal/04 nói "quyền merchant giữ chứng từ hợp pháp phải tách" nhưng chưa có quy tắc. Đây chính là chỗ đó. |
| `documents` | toàn bộ nội dung hồ sơ hoặc tệp | — | **CHƯA QUYẾT** | **CHƯA QUYẾT** | Hàng này chỉ là metadata; BYTE của tệp nằm ở kho ngoài chưa chọn (DEC06). Xóa hàng này không xóa tệp. |
| `entitlements` | chỉ mã định danh | — | **CHƯA QUYẾT** | **CHƯA QUYẾT** | Trạng thái gói. legal/04 để hồ sơ thanh toán "theo luật áp dụng", chưa chốt số năm. |
| `export_bodies` | toàn bộ nội dung hồ sơ hoặc tệp | — | xóa | 24 giờ (đề xuất legal/04, đã thực thi) | Bảng SỬA ĐƯỢC (WO11-02e-EXP) và tự hết hạn sau 24 giờ; purge_expired_export_bodies dọn. |
| `export_files` | chỉ mã định danh | có | giữ lại | **CHƯA QUYẾT** | Chỉ còn đường dẫn và băm; nội dung đã chuyển sang export_bodies. |
| `export_jobs` | chỉ mã định danh | có | giữ lại | **CHƯA QUYẾT** | Mã truy cập chỉ lưu dạng băm. |
| `family_memberships` | chỉ mã định danh | — | thu hồi quyền | **CHƯA QUYẾT** |  |
| `field_confirmation_values` | giá trị trích xuất từ chứng từ | — | **CHƯA QUYẾT** | **CHƯA QUYẾT** | Bảng SỬA ĐƯỢC, tách từ field_confirmations (WO11-02e-CONF). Giá trị trích xuất như ngày mua, số tiền. |
| `field_confirmations` | chỉ mã định danh | có | giữ lại | **CHƯA QUYẾT** |  |
| `inbox_messages` | chỉ mã định danh | có | giữ lại | **CHƯA QUYẾT** | Chỉ mã và khóa văn bản, không có nội dung tự do. |
| `item_family_shares` | chỉ mã định danh | — | thu hồi quyền | **CHƯA QUYẾT** |  |
| `items` | văn bản tự do (xem ghi chú: ai nhập) | — | **CHƯA QUYẾT** | **CHƯA QUYẾT** | title, brand, model do người dùng nhập. Đây là hồ sơ chính; quyết định ở đây là quyết định lớn nhất. |
| `kill_switches` | không có dữ liệu về người | — | không áp dụng | not_applicable |  |
| `organization_members` | chỉ mã định danh | — | thu hồi quyền | **CHƯA QUYẾT** | request_account_deletion đặt status REVOKED (WO11-02g-MEM). Chủ sở hữu duy nhất bị từ chối xóa. |
| `organizations` | chỉ mã định danh | — | giữ lại | **CHƯA QUYẾT** | legal_name là tên pháp nhân; với hộ kinh doanh cá thể nó có thể là tên người. Cần luật sư xem. |
| `profiles` | chỉ mã định danh | — | **CHƯA QUYẾT** | **CHƯA QUYẾT** | Hôm nay chỉ đổi deletion_status sang PENDING_DELETION. Còn lại gì sau khi xóa xong là chưa quyết. |
| `reminder_deliveries` | chỉ mã định danh | có | giữ lại | **CHƯA QUYẾT** |  |
| `reminders` | chỉ mã định danh | — | **CHƯA QUYẾT** | **CHƯA QUYẾT** | timezone và local_time nói lên thói quen của người dùng. |
| `support_staff` | chỉ mã định danh | — | giữ lại | **CHƯA QUYẾT** | Nhân viên hỗ trợ, không phải khách hàng. |
| `upload_completions` | chỉ mã định danh | — | **CHƯA QUYẾT** | **CHƯA QUYẾT** |  |
| `upload_tickets` | chỉ mã định danh | — | **CHƯA QUYẾT** | 7 ngày cho tải lên thất bại (đề xuất legal/04) | Vé tải lên ngắn hạn. |

## 4. Giới hạn mà đội kỹ thuật tự khai

- **Byte của tệp tài liệu nằm ở kho ngoài chưa được chọn.** Xóa trong cơ sở dữ liệu không xóa tệp.
  Quyết định kho (DEC06) còn mở, và nó quyết định được hay không việc xóa tệp trong một thời hạn.
- **Bản sao lưu** luân chuyển 30 ngày (đề xuất). Dữ liệu đã xóa còn nằm trong bản sao lưu đến khi hết
  vòng; cơ chế tombstone bảo đảm khôi phục không đưa nó về hoạt động, nhưng **không** làm nó biến mất.
- **Thời hạn giữ hồ sơ thanh toán chưa chốt**; mô hình tài chính của dự án tự khai là số giả định.
- **Chưa có nhà cung cấp danh tính thật**, nên "xác thực lại" hiện là kiểm tuổi của phiên, chưa phải
  nhập lại mật khẩu hay OTP.
- **Chưa có đánh giá bảo mật độc lập.** Không mục nào ở đây được coi là đã được bên thứ ba xác nhận.

## 5. Ô ký

Luật sư điền vào bảng ở mục 1 và mục 3, rồi ký vào đây. Khi đã có bản ký, đội kỹ thuật cập nhật
`tools/legal/deletion-catalogue.mjs` theo đúng bản ký, và kiểm thử sẽ canh để nó không lạc hậu.

| Mục | Nội dung |
|---|---|
| Người duyệt | ____________________ |
| Vai trò và tổ chức | ____________________ |
| Phạm vi pháp lý đã xét (quốc gia, luật áp dụng) | ____________________ |
| Ngày | ____________________ |
| Chữ ký | ____________________ |

Phần luật sư cần ghi rõ khi duyệt: với mỗi bảng, **xóa / che nội dung / giữ lại**; nếu giữ lại thì
**bao lâu**, **căn cứ pháp lý nào**, và **ai được xem** trong thời gian giữ.

