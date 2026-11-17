# Billing và entitlement
Trạng thái: thiết kế; nhà cung cấp/thị trường/pháp nhân chưa chốt.

## Phân luồng
B2B web dùng provider được chấp thuận cho pháp nhân và thị trường. Mobile Family dùng cơ chế phù hợp App Store/Google Play theo storefront và loại dịch vụ; RevenueCat có thể làm lớp quản lý nhưng không bỏ nghĩa vụ store [S30][S31][S32].
Không hướng dẫn né IAP. Không xử lý tiền hoàn của món hàng; cửa hàng/hãng xử lý ngoài hệ thống, app chỉ ghi kết quả có chứng cứ.

## Event processing
Webhook signature + timestamp validation → idempotency(event_id,provider) → billing_event immutable → transaction update entitlement → audit/outbox. Thứ tự sự kiện có thể đảo; dùng effective_time/version/provider authoritative state. Replay không tăng quota hoặc ngày thuê bao.
Customer identity link phải chứng minh chủ tài khoản; không tự nối theo email chưa xác minh.
Phân biệt trial, active, grace, past_due, canceled_at_period_end, expired, refunded, disputed. Không xóa hồ sơ vì expired.

## Reconciliation
Hằng ngày đối chiếu billing events với provider export; hằng tháng revenue, refund, fee, settlement và bank cash. Không dùng số liệu UI nội bộ làm bằng chứng tiền đã vào.
Quyền chuyển plan, proration, refund và thuế cần test sandbox, không giả định giống mọi provider.

## Limits
Quota đếm server-side; upload thất bại không đếm đôi; model retry idempotent. Hết quota không làm mất chứng từ. Thông báo trước khi khóa tác vụ AI; thêm gói phải có hành động xác nhận. Có spending cap do owner đặt, mặc định không overage.

## Chính sách thương mại
Giá hiển thị rõ kỳ thanh toán, thuế, auto-renew, cách hủy và phần mất/giữ sau hủy. Hủy subscription không tự xóa tài khoản; xóa tài khoản không mặc nhiên hủy store subscription nếu store yêu cầu thao tác riêng, phải hướng dẫn chính xác.
