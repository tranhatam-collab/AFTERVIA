# Quan sát, khả năng phục hồi và vận hành
## Chỉ số kỹ thuật
API latency/error theo route không PII; queue depth/oldest job; extraction success/review corrections/cost; failed notifications; failed exports; auth anomaly; blocked cross-tenant attempts; billing reconciliation difference.
request_id xuyên client/API/job giúp điều tra. Không log raw documents hoặc model prompt chứa thông tin khách.

## Mục tiêu pilot
API phổ biến p95<800ms cùng region; job extraction p95<60s với file thử đúng giới hạn; availability mục tiêu99,5% beta. Chỉ báo đạt khi có cửa sổ đo và định nghĩa downtime; chưa có đo thực.
AI/provider outage không ngăn nhập tay, xem hồ sơ hoặc export đã có. Queue retries giới hạn và dead letter queue có người xử lý.

## Backup/restore
Backup DB và private objects cùng manifest; mã hóa; kiểm quyền; retention theo chính sách. Mục tiêu ban đầu RPO24h/RTO8h, diễn tập hàng tháng trong beta; không bảo đảm nếu chưa test.
Restore sang isolated environment, xác minh row counts/hash, ownership/grants, billing idempotency và khả năng đọc file. Không chỉ kiểm “backup job success”.

## Support và escalation
Pilot công bố giờ hỗ trợ thực tế, không ghi24/7 nếu chưa có on-call. Severity1: data leak/corruption/billing double-charge, dừng chức năng liên quan và gọi người trực được phân. Severity2: main flow unavailable, workaround và lịch cập nhật. Severity3: UI/noncritical.
Lưu incident timeline, remediation, khách ảnh hưởng và quyết định pháp lý; không lộ dữ liệu nhạy cảm trong status page.

## Kill switches
AI extraction, outbound notifications, sharing, billing writes, country activation là cờ riêng. Tắt AI không tắt quyền truy cập hồ sơ. Tắt payments không xóa entitlements đang hợp lệ trước khi rà soát.
