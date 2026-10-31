# Checkpoint tự chủ AFTERVIA

- Cập nhật: 31/10/2026, lượt ghi tài liệu này sau 14:58 UTC.
- Trạng thái: **CONTINUE**. Chưa có `ENGINEERING_ACCEPTED`.
- Nguồn mệnh lệnh: gói `docs/spec/AUTONOMY_V1/` (đã kiểm checksum) và chỉ thị của chủ dự án trong phiên.

## Repo và nhánh
- Repo `tranhatam-collab/AFTERVIA`. Nhánh làm việc `ccr-4544c9f7-b1t50m` (writer duy nhất).
- Code gần nhất đã push: `de64fbb` (WO07-01). Commit tài liệu sau đó: xem `git log`.
- `main` là commit gốc rỗng `b809781`, không chứa ứng dụng.
- PR #1: nháp, base `main`, đang theo dõi. Chưa merge. Chưa đổi sang sẵn sàng review.

## Scheduler (một writer)
- Chuỗi `send_later` là writer duy nhất. Trigger chờ: `trig_01MDTJis9SwRZRUJUgjG8Kpj`, lúc 15:01 UTC.
- Chưa tạo Cloud Routine. Điều kiện của gói: không bật writer thứ hai khi vòng cũ còn chạy (xem `06_DECISION_QUEUE.md`, D1).

## Backlog (đã DONE, đã có bằng chứng)
WO02-01, WO03-01, WO03-02, WO03-03, WO03-04, WO04-01, WO04-02, WO04-03, WO04-04, WO07-01.

## Đang làm
- Không có. Lượt kế tiếp bắt đầu WO05-01 (upload ticket, lưu riêng tư, MIME, quarantine).

## Kết quả kiểm thử tại `de64fbb`
- `npm run verify` exit 0 với `TEST_DATABASE_URL` trỏ tới `aftervia_test` (PostgreSQL 16.15).
- Bundle 69/69. Quét bí mật 61 tệp. Vitest 80/80. Kiểm thử vòng lặp 13/13.
- Ma trận: PASS 6 (T03, T04, T05, T06, T22, T37). NOT_RUN 40. Mọi kiểm thử PASS đều có mức phủ PARTIAL.

## Blocker (phân loại)
- Đăng nhập thật: cần nhà cung cấp danh tính, Supabase project (DEC03). **HUMAN_REQUIRED**.
- DAST (HawkScan): cần Docker chạy được, `HAWK_API_KEY` trong cài đặt môi trường, và máy chủ HTTP. **BLOCKED**.
- Web và mobile: chưa có (WO10). **NOT_RUN**.
- Thiết bị thật, luật sư, pilot với khách, reviewer bảo mật độc lập: **HUMAN_REQUIRED**.

## Ngân sách và quota
- Chưa đo được (môi trường không có công cụ đo). Không dùng dịch vụ trả phí. Không đặt extra usage. Chưa có giới hạn đã duyệt (D7).

## Ranh giới đã tuân thủ
- Không force-push, không rebase, không merge, không push `main`, không tạo PR mới.
- Không dùng dữ liệu thật, không production, không thanh toán live, không tài khoản dịch vụ mới.

## Ghi chú vận hành
- Lượt 14:50 UTC thực hiện hai task liên tiếp (WO04-04 rồi WO07-01) trong một phiên. Điều này lệch khỏi giao thức "một task mỗi vòng" và được ghi trong `docs/plan/evidence/AUTO_RUNS/2026-10-31T1450Z.md`.
- Gói tự chủ yêu cầu phục hồi từ checkpoint. Phiên mới đọc tệp này, `05`, `06`, `07` và `decide` trước khi làm gì khác.
