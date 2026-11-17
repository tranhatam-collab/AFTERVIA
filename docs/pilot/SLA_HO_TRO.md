# SLA hỗ trợ pilot (DRAFT, WO19-01)

> **Trạng thái: DRAFT.** Các con số là đề xuất hoặc đang chờ chủ dự án. Không phải cam kết với khách hàng. Không công bố cho cửa hàng khi chưa được duyệt.
> Nguồn: `ops/01_OPERATING_MODEL_AND_SUPPORT.md` (mục Support); `validation/04_RISK_REGISTER.csv` (R10); `docs/pilot/KE_HOACH_PILOT.md` (tiêu chí dừng).

## 1. Giờ làm việc

- Đặc tả yêu cầu pilot công bố giờ làm thực. Giờ làm việc, múi giờ và ngày nghỉ: [CHỜ CHỦ DỰ ÁN].
- Ngoài giờ làm việc: chỉ tiếp nhận yêu cầu. Thời gian phản hồi tính từ đầu giờ làm việc kế tiếp. Với S1, có trực ngoài giờ hay không: [CHỜ CHỦ DỰ ÁN].

## 2. Kênh và người trực

- Kênh tiếp nhận yêu cầu: [CHỜ]. Không dùng địa chỉ email chưa xác thực hoặc địa chỉ giả trong bất kỳ tài liệu công bố nào.
- Người trực có tên và lịch trực: [CHỜ]. Rủi ro R10 (phụ thuộc người sáng lập) đang OPEN: SLA chỉ có giá trị khi có người trực có tên.
- Không dùng tài khoản admin chung để hỗ trợ.

## 3. Ticket

Mỗi yêu cầu có các trường (đề xuất): `ticket_id`, `store_code`, `severity` (S1 đến S4), `owner`, `opened_at`, `next_update_at`, `status`, `root_cause` (khi đóng).

Đặc tả yêu cầu ticket có mức độ (severity), người phụ trách (owner) và thời điểm cập nhật tiếp theo. Không ghi tên hoặc số điện thoại của người dùng cuối trong ticket; chỉ ghi mã nội bộ.

## 4. Mức độ (đề xuất)

| Mức | Mô tả | Hành động đầu tiên |
|---|---|---|
| S1 | Dữ liệu lộ hoặc sai quyền giữa tổ chức, mất dữ liệu, đăng nhập sai tổ chức | Dừng phạm vi liên quan theo `KE_HOACH_PILOT.md`, mục 7; báo chủ dự án ngay; làm theo `docs/ops/INCIDENT_RUNBOOK.md` (DRAFT) |
| S2 | Cửa hàng không hoàn tất được tác vụ chính, không có cách thay thế | Xử lý trong giờ làm việc; cập nhật theo mục 5 |
| S3 | Có cách thay thế nhưng chậm hoặc khó | Xếp lịch trong tuần |
| S4 | Câu hỏi, góp ý, thay đổi giao diện | Ghi vào backlog |

## 5. Thời gian phản hồi và cập nhật

Các con số chờ chủ dự án quyết định:

| Mức | Phản hồi đầu tiên | Cập nhật tiếp theo |
|---|---|---|
| S1 | [CHỜ CHỦ DỰ ÁN] | [CHỜ CHỦ DỰ ÁN] |
| S2 | [CHỜ CHỦ DỰ ÁN] | [CHỜ CHỦ DỰ ÁN] |
| S3 | [CHỜ CHỦ DỰ ÁN] | [CHỜ CHỦ DỰ ÁN] |
| S4 | [CHỜ CHỦ DỰ ÁN] | [CHỜ CHỦ DỰ ÁN] |

## 6. Truy cập hỗ trợ

- Chỉ dùng truy cập tạm thời khi cửa hàng đồng ý bằng văn bản cho đúng phiên hỗ trợ.
- Truy cập có thời hạn, có log, và che dữ liệu nhạy cảm trong màn hình chia sẻ (redaction).
- Không xem tài liệu của cửa hàng ngoài phạm vi yêu cầu.

## 7. Leo thang và giới hạn

- Vấn đề pháp lý, quyền riêng tư hoặc tranh chấp: chuyển cho kênh có thẩm quyền theo quốc gia pilot (country pack). Không đóng vai cơ quan xử lý.
- Hồ sơ tranh chấp: đánh dấu "disputed" và bổ sung chứng cứ. Không xóa lịch sử (`ops/01`).

## 8. Đo SLA trong pilot

- Ghi theo tuần: thời gian phản hồi thực tế, số ticket quá hạn, số ticket mở lại, phút hỗ trợ (theo mục hằng tuần của `ops/01`).
- Đây là chỉ số của pilot. Không công bố là SLA đã đạt khi chưa đủ cửa sổ đo.
