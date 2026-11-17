# Runbook sự cố AFTERVIA (DRAFT — chờ chủ dự án và luật sư duyệt)

Trạng thái: **DRAFT**. Không công bố. Việc thông báo khách, nghĩa vụ pháp lý và nội dung trang trạng thái do chủ dự án và luật sư quyết định; runbook này không tự quyết các mục đó (quy tắc 10 và `engineering/12`).

## Phạm vi và giờ hỗ trợ

- Áp dụng cho sự cố trên dịch vụ AFTERVIA trong giai đoạn pilot.
- Không có trực 24/7 nếu chưa có người trực được phân công. Giờ hỗ trợ là giờ được công bố cho pilot, không ghi 24/7 trước khi có trực (`engineering/12`).

## Mức sự cố

Cùng định nghĩa với `services/api/src/observability/severity.ts`. Mức cao nhất thắng.

| Mức | Điều kiện | Hành động bắt buộc |
|---|---|---|
| SEV1 | Rò dữ liệu, hỏng dữ liệu, hoặc thu tiền trùng | Dừng chức năng liên quan; gọi người trực đã phân công; tắt cờ tương ứng (WO16-02) |
| SEV2 | Luồng chính không dùng được | Có cách làm thay thế; lịch cập nhật cho khách |
| SEV3 | Giao diện hoặc phần không thiết yếu | Sửa theo lịch thường |

## Quy trình

1. **Phát hiện.** Nguồn: nhật ký có cấu trúc (ví dụ `request.internal_error`), số liệu giám sát không chứa dữ liệu cá nhân (route, lỗi, độ trễ, hàng đợi), báo cáo từ khách hoặc merchant.
2. **Phân mức.** Dùng bảng trên. Ghi thời điểm và người phân mức trong timeline.
3. **Kiềm chế.** Với SEV1, tắt cờ liên quan qua quản trị cơ sở dữ liệu bằng `set_kill_switch` (WO16-02): `sharing`, `ai_extraction`, `outbound_notifications`, `billing_writes`. Tắt cờ không xóa quyền truy cập hồ sơ.
4. **Liên lạc nội bộ.** Ghi timeline trong kênh sự cố nội bộ. Không đưa dữ liệu nhạy cảm vào kênh chung.
5. **Khắc phục.** Sửa nguyên nhân gốc. Kiểm lại bằng kiểm thử tự động. Ghi biện pháp khắc phục.
6. **Khách và pháp lý.** Xác định khách bị ảnh hưởng. Quyết định thông báo khách và nghĩa vụ pháp lý do chủ dự án và luật sư quyết định.
7. **Trạng thái công khai.** Không để lộ dữ liệu nhạy cảm trong trang trạng thái.
8. **Sau sự cố.** Viết báo cáo gồm timeline, nguyên nhân, khách ảnh hưởng và biện pháp phòng ngừa. Lưu trong `docs/plan/evidence/`.

## Quy tắc nhật ký và giám sát

- Chỉ ghi các trường trong danh sách cho phép của `services/api/src/observability/log.ts`.
- Không ghi token, khóa, tài liệu, nội dung tài liệu, lời nhắc mô hình, dữ liệu cá nhân, thông điệp lỗi hay ngăn xếp.
- Dùng `request_id` để truy vết giữa client, API và job.

## Chưa có (cần quyết định hoặc hạ tầng)

- Nơi lưu nhật ký và thời gian giữ (chờ WO16-01 và quyết định lưu giữ).
- Danh sách người trực và đường liên lạc khẩn (HUMAN).
- Kênh thông báo khách và mẫu nội dung (chờ pháp lý).
- Cảnh báo tự động từ nhật ký (chưa có hạ tầng; INFRA).
