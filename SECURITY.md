# Bảo mật và xử lý sự cố (tạm thời)

Trạng thái: bản tạm thời cho giai đoạn P0. Chưa có đội trực 24/7 và không hứa SLA. Chưa có chứng nhận bảo mật nào, không tuyên bố SOC 2 hay ISO 27001.

## Báo cáo lỗ hổng

- Gửi qua kênh riêng: **[địa chỉ liên hệ bảo mật, chủ dự án điền trước khi mở repo công khai]**.
- Không công khai chi tiết khi chưa xử lý xong.
- Không gửi dữ liệu thật của khách trong báo cáo. Mô tả bước tái hiện bằng dữ liệu giả.

## Mức độ nghiêm trọng

Theo `docs/spec/AFTERVIA_AZ_2026-10-31/engineering/12_OBSERVABILITY_AND_RESILIENCE.md`:

- **Severity 1:** rò dữ liệu, hỏng dữ liệu, thu tiền trùng. Dừng chức năng liên quan và gọi người trực được phân công.
- **Severity 2:** luồng chính không dùng được. Có cách thay thế và lịch cập nhật.
- **Severity 3:** lỗi giao diện hoặc không ảnh hưởng luồng chính.

## Phản ứng ban đầu

1. Tắt cờ liên quan: AI extraction, thông báo, chia sẻ, ghi billing, kích hoạt quốc gia. Tắt AI không được chặn quyền truy cập vào hồ sơ đã có.
2. Thu hồi phiên và khóa bị lộ. Tạo khóa mới trước khi điều tra.
3. Giữ bằng chứng cần thiết. Log không chứa tài liệu, token hay số thanh toán.
4. Phân loại ảnh hưởng và ghi timeline sự cố.
5. Báo chủ dự án. Luật sư đánh giá nghĩa vụ thông báo theo nơi áp dụng, theo `docs/spec/.../engineering/05_SECURITY_AND_THREAT_MODEL.md`. Không có thời hạn chung cho mọi quốc gia.

## Bí mật

- Không commit khóa, token hay mật khẩu. `.env` nằm trong `.gitignore`.
- Biến bí mật đặt trong cài đặt môi trường. Không dán vào chat hay tài liệu.
- `npm run check:secrets` và kiểm thử T37 quét mẫu bí mật trong file đã theo dõi. Đây không phải thay thế cho quét đầy đủ.

## Đánh giá độc lập

Đánh giá bảo mật độc lập do người khác với tác giả AI thực hiện (HUM-WO17-02). Kết quả đánh giá chưa tồn tại tại thời điểm viết tệp này.
