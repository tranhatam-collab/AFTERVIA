# Phạm vi hợp đồng API
OpenAPI là thiết kế lát cắt P0, chưa phải server chạy. 13 operation là giao diện lõi cho probe/MVP; auth/session do identity provider, list/search/pagination, invitations, notifications, billing webhooks, account recovery và admin API cần hoàn thiện trong work orders trước release.
Không công bố “API hoàn thiện” chỉ vì YAML parse được. Error responses phải tránh tiết lộ object tồn tại. Paged list cần cursor, deterministic sort và policy giống detail. Download API phải kiểm grant, không trả URL public.

Webhook billing là inbound endpoint riêng theo provider: không dùng JWT client để xác minh; bắt buộc kiểm signature/provider event id. Không đưa vào một hợp đồng giả khi provider chưa được chọn.
Chấp nhận JSON schema phải đi kèm semantic validation: currency ISO được duyệt; amount_minor nguyên; purchased_on date hợp lệ; state transitions allowlist; reviewer hiện tại được phép. Schema đơn thuần không chứng minh dữ liệu đúng hoặc có quyền.
