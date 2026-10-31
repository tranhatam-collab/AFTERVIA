# Capability probe
Mục tiêu là biết Wron có thể là công cụ phát triển có khả năng thoát hay chỉ prototype. Chưa có tài khoản Wron đã được kiểm thử trong lượt lập kế hoạch.

| Câu hỏi | Bằng chứng cần | Trạng thái |
|---|---|---|
| Full source export? | ZIP/repo gồm frontend/backend/migrations/deps/assets | UNVERIFIED |
| Quyền thương mại/self-host/transfer? | Điều khoản ràng buộc hoặc phụ lục xác nhận | UNVERIFIED |
| Persistence? | DB record qua refresh/restart, không local mock | NOT_RUN |
| Tenant isolation? | Negative API/storage tests A/B | NOT_RUN |
| Clean web/mobile build? | Logs môi trường độc lập và build artifact | NOT_RUN |
| Data export/delete? | Export đọc được và deletion test | NOT_RUN |
| Budget và no hidden charges? | Usage/cost receipt, quota stop | UNVERIFIED |

PASS chỉ khi các cổng bắt buộc có evidence. Nếu export hoặc quyền thương mại không rõ: synthetic prototype only. Nếu độc lập build không được: không gọi mã nguồn đã có là deployable product.
