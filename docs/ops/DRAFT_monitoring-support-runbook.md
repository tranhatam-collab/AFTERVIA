# DRAFT — Monitoring và Support cho AFTERVIA (chưa duyệt, chưa vận hành)

Ngày lập: 2026-11-13. Trạng thái: **BẢN NHÁP để chủ dự án duyệt**. Lấp hai ô trống của bảng
G4 (`docs/plan/evidence/WO20-01-prep.md`): "Monitoring: không có" và "Support: không có quy
trình". Chưa có hệ thống nào được cài; mọi mục dưới đây là đề xuất. Các ô 【...】 cần chủ dự
án điền hoặc quyết.

## 1. Giám sát — đo gì (theo thứ tự giá trị)

| # | Tín hiệu | Nguồn có sẵn trong mã | Ngưỡng đề xuất ban đầu |
|---|---|---|---|
| 1 | Tỷ lệ 5xx của API | log của `services/api` (chưa có exporter) | > 1% trong 5 phút |
| 2 | p95 thời gian trả lời | cùng nguồn; đã có bài đo p95 cục bộ (`tests/perf`) | > 2× số đo baseline staging |
| 3 | Webhook billing bị từ chối bất thường | `billing_events` + lý do từ chối trong log ingest | chuỗi ≥ 5 lần `bad_signature` liên tiếp |
| 4 | Kill switch đang bật | bảng kill switch (WO16-02) | bất kỳ switch nào bật quá 【X】 giờ |
| 5 | Kết nối DB / disk | metric của nhà cung cấp Postgres (chưa chọn — INF-01) | theo mặc định nhà cung cấp |
| 6 | Thất bại đăng nhập hàng loạt | audit `authz.denied` (đã ghi từ `recordDenial`) | ≥ 【N】/phút từ một nguồn |
| 7 | Sao lưu chạy đúng lịch | quy trình WO16-01a khi có staging | 1 lần trượt = cảnh báo |

Chưa quyết (chủ dự án): công cụ (nhà cung cấp Postgres kèm sẵn? Grafana Cloud? khác?),
kênh nhận cảnh báo 【email / Telegram / khác】, và ai trực 【tên】.

## 2. Support — đường vào và phân loại

- **Đường vào đề xuất**: một địa chỉ email hỗ trợ duy nhất 【support@...】, hiển thị trong
  ứng dụng ở màn Cài đặt và trên landing (khi có). Chưa tạo.
- **Cam kết phản hồi ban đầu** (pilot): ghi nhận trong 【24】giờ làm việc.
- **Phân mức**:
  - SEV1 — mất dữ liệu, truy cập trái phép, thanh toán sai: dừng tính năng bằng kill switch
    trước, điều tra sau (trình tự trong `WO20-01-prep.md` mục 4).
  - SEV2 — một luồng chính hỏng với nhiều người dùng: sửa trong 【3】ngày.
  - SEV3 — lỗi lẻ, câu hỏi cách dùng: gom theo tuần.
- **Nhật ký sự cố**: mỗi sự cố một mục theo mẫu ở phần 3, lưu trong 【nơi chủ dự án chọn】.

## 3. Mẫu nhật ký sự cố

```
ID:            INC-YYYYMMDD-NN
Mức:           SEV1 | SEV2 | SEV3
Bắt đầu (UTC): ...
Phát hiện bởi: cảnh báo nào / ai báo
Phạm vi:       tính năng, số người ảnh hưởng (ước lượng)
Hành động:     (giờ UTC → việc đã làm, kill switch nào đã bật)
Nguyên nhân:   ...
Kết thúc:      ...
Việc sau sự cố: (mở task trong backlog, không sửa nóng)
```

## 4. Điều kiện để bản nháp này thành thật

1. Chủ dự án điền các ô 【...】 và duyệt.
2. Có staging (INF-01) để đặt baseline cho ngưỡng.
3. Có đích triển khai (D14) để biết metric nào nhà cung cấp cho sẵn.
4. Đường báo động tới người vận hành được nối (hiện "Hộp đen vận hành" trong
   `07_RELEASE_READINESS.md` ghi rõ: chưa có).
