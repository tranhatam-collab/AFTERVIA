# BẢN NHÁP: Thông báo quyền riêng tư AFTERVIA

> **Trạng thái: DRAFT. Chưa công bố.** Chưa được chủ dự án và luật sư duyệt. Không dùng làm chính sách công khai. Không phải tư vấn pháp lý.
> Phiên bản bản nháp: 0.2 (31/10/2026). Phiên bản công bố: chưa có.
> Điều kiện công bố: HUM-WEB-03 hoàn tất (chủ dự án và luật sư duyệt); có quyền hosting hoặc DNS đã xác nhận; pháp nhân và địa chỉ liên hệ đã xác thực (DEC03). Trang landing hiện không liên kết tới tài liệu này.
> Khung nội dung theo `docs/spec/AFTERVIA_AZ_2026-10-31/legal/03_PRIVACY_TERMS_DPA_BRIEF.md`. Mục nào chưa có thông tin thật được giữ ở dạng [CHỜ ...]. Không điền giá trị giả.

## 1. Ai chịu trách nhiệm về dữ liệu

Vai trò được phân theo từng hoạt động, không gộp chung.

| Hoạt động | Vai trò dự kiến | Trạng thái |
|---|---|---|
| Tài khoản và hồ sơ cá nhân (Personal) | Controller: [CHỜ PHÁP NHÂN, DEC03] | Chưa xác định |
| Hồ sơ do cửa hàng nhập hoặc xác nhận (Desk) | [CHỜ LUẬT SƯ]. Không mặc định cửa hàng là controller duy nhất của kho cá nhân của khách | Chưa xác định |
| Dịch vụ đối tác (Partner) | [CHỜ LUẬT SƯ] | Chưa xác định |
| Lưu trữ tệp chứng từ | Nhà cung cấp lưu trữ [CHỜ DEC06]; vai trò [CHỜ LUẬT SƯ] | Chưa chọn |
| Thanh toán và đăng ký gói | Nhà cung cấp thanh toán hoặc cửa hàng ứng dụng theo chính sách của họ [CHỜ DEC09] | Chưa bật |

## 2. Dữ liệu dự kiến (chưa thu thập)

| Loại dữ liệu | Nguồn | Ghi chú |
|---|---|---|
| Thông tin tài khoản | Người dùng nhập | Liên kết với khách mua qua cửa hàng chỉ khi xác minh được chủ tài khoản. Không tự nối theo email chưa xác minh |
| Thông tin tổ chức (cửa hàng, đối tác) | Người dùng nhập; cửa hàng xác nhận | |
| Món đồ, hóa đơn, bảo hành, chứng từ | Người dùng tải lên hoặc nhập; cửa hàng xác nhận | Chứng từ có thể chứa dữ liệu của người khác. Người dùng chỉ tải lên khi có quyền |
| Lịch nhắc, hồ sơ xử lý, yêu cầu dịch vụ | Người dùng; cửa hàng; đối tác | |
| Thông tin AI trích xuất từ chứng từ | AI đọc từ tệp người dùng cung cấp | Chỉ là gợi ý cho đến khi người dùng hoặc cửa hàng xác nhận |
| Nhật ký truy cập và an ninh | Hệ thống | Thời hạn theo mục 6 |
| Dữ liệu thanh toán | Nhà cung cấp thanh toán hoặc cửa hàng ứng dụng | [CHỜ XÁC NHẬN khi chọn nhà cung cấp; dự kiến AFTERVIA không lưu số thẻ] |

Nguyên tắc: mỗi thông tin phải ghi nguồn. Giai đoạn phát triển chỉ dùng dữ liệu tổng hợp, không dùng dữ liệu thật của khách hàng.

## 3. Mục đích và cơ sở xử lý

| Mục đích | Cơ sở xử lý |
|---|---|
| Cung cấp hồ sơ hậu mãi cho người dùng và cho cửa hàng đã được cấp quyền | [CHỜ LUẬT SƯ theo từng thị trường] |
| Xác thực tài khoản, bảo mật và ngăn lạm dụng | [CHỜ LUẬT SƯ] |
| Quản lý gói, hạn mức và thanh toán (khi bật) | [CHỜ LUẬT SƯ] |
| Ghi nhật ký để điều tra sự cố và tuân thủ | [CHỜ LUẬT SƯ] |
| Trả lời yêu cầu quyền riêng tư và khiếu nại | [CHỜ LUẬT SƯ] |

## 4. Người nhận, nhà cung cấp phụ và chuyển dữ liệu

- Danh sách nhà cung cấp phụ (subprocessor): chưa có. Vendor AI và vùng dữ liệu: NOT_APPROVED (DEC06).
- Quốc gia lưu trữ: [CHƯA CHỌN, DEC06 và DEC07].
- Chuyển dữ liệu ra ngoài Việt Nam hoặc ngoài thị trường đích: [CHỜ LUẬT SƯ].
- Cửa hàng ứng dụng và nhà cung cấp thanh toán: [CHỜ DEC09].

## 5. AI trong ứng dụng

- Ứng dụng dự kiến dùng AI để đọc chứng từ và gợi ý bước tiếp theo. AI không quyết định người dùng có đủ quyền bảo hành hay không.
- Gợi ý của AI cần được người dùng hoặc cửa hàng xem xét trước khi trở thành hồ sơ chính thức.
- Có dùng dữ liệu cá nhân để huấn luyện mô hình hay không: [CHƯA QUYẾT ĐỊNH, DEC06]. Không công bố cam kết nào về việc này khi chưa có quyết định.

## 6. Lưu giữ và xóa

Các thời hạn dưới đây là đề xuất vận hành từ `legal/04_DATA_RETENTION_AND_DELETION.md`, chưa phải yêu cầu pháp luật. Chưa công bố cho đến khi luật sư và người phụ trách bảo vệ dữ liệu duyệt.

- Tệp tải lên thất bại: đề xuất 7 ngày.
- Tệp xuất tạm: đề xuất 24 giờ, link hết hạn.
- Nhật ký vận hành không có dữ liệu cá nhân: đề xuất 30 ngày.
- Nhật ký bảo mật tối thiểu: đề xuất 180 ngày.
- Bản sao lưu: đề xuất 30 ngày luân chuyển.
- Hồ sơ đang dùng: đến khi người dùng xóa hoặc kết thúc dịch vụ, cộng thời gian ân hạn [CHỜ LUẬT SƯ].
- Hồ sơ thanh toán: theo luật áp dụng [CHƯA CHỐT].

Hết hạn hoặc hủy gói không tự xóa hồ sơ và không khóa việc xuất dữ liệu. Xóa tài khoản không được thay bằng vô hiệu hóa không thời hạn; phần dữ liệu phải giữ được nêu rõ mục đích, thời hạn và quyền truy cập.

## 7. Quyền của người dùng (dự kiến)

Người dùng dự kiến có quyền xem, xuất, sửa, xóa dữ liệu của mình, phản đối một số xử lý và khiếu nại. **Chưa triển khai** (WO11 đang BLOCKED). Cách thực hiện: [CHỜ XÁC THỰC liên hệ].

Với dữ liệu do cửa hàng giữ, yêu cầu có thể cần chuyển tới cửa hàng: [CHỜ LUẬT SƯ].

## 8. Trẻ em và độ tuổi

- MVP dự kiến chỉ cho tài khoản của người từ 18 tuổi trở lên: [CHỜ LUẬT SƯ theo từng thị trường].
- Khách mua gói gia đình không được tự đưa dữ liệu trẻ em vào để tạo hồ sơ nhạy cảm.
- Chưa có tính năng dành cho trẻ em.

## 9. Cookie, phân tích và theo dõi

- Trang giới thiệu hiện không có biểu mẫu, không thu email, không có công cụ phân tích hay theo dõi cá nhân. [KIỂM LẠI trước khi công bố và mỗi lần thêm script].
- Nhà cung cấp hosting có thể ghi nhật ký truy cập theo chính sách của họ. [CHỜ XÁC NHẬN khi chọn hosting].

## 10. Bảo mật

- Thiết kế hiện tại: dữ liệu tách theo tổ chức và tài khoản; kiểm soát truy cập ở tầng cơ sở dữ liệu; nhật ký truy cập chỉ thêm.
- Các điều trên được kiểm bằng kiểm thử tự động trong repo. **Chưa có đánh giá bảo mật độc lập** [CHỜ reviewer độc lập].
- Thông báo này không khẳng định tuân thủ bất kỳ luật nào. Tuân thủ là kết quả của thiết kế, hợp đồng và quy trình, không phải một câu khẳng định.

## 11. Liên hệ và khiếu nại

- Chưa có địa chỉ liên hệ đã xác thực. [CHỜ XÁC THỰC, gắn với pháp nhân DEC03].
- Đầu mối khiếu nại: [CHỜ].
- Không công bố địa chỉ thử nghiệm hoặc địa chỉ giả.

## 12. Luật cần xác minh

- Việt Nam: Luật bảo vệ dữ liệu cá nhân 91/2025/QH15, hiệu lực từ 01/01/2026, và văn bản hợp nhất bảo vệ người tiêu dùng 47/VBHN-VPQH [S23][S24]. Theo brief, mới kiểm metadata và chưa đọc toàn văn. Luật sư Việt Nam cần đọc toàn văn và văn bản hướng dẫn trước khi viết mục nào trong bản này.
- Các thị trường khác: xem `legal/02_GLOBAL_COMPLIANCE_REGISTER.csv`. Tất cả đang DISABLED.
- Không dùng một bản thông báo chuẩn cho mọi nơi.

## 13. Cập nhật

- Bản nháp sẽ được cập nhật khi có quyết định về pháp nhân (DEC03), lưu trữ và nhà cung cấp (DEC06), thị trường (DEC07) và pháp lý.
- Mỗi phiên bản công bố cần ngày hiệu lực và lịch sử thay đổi.
