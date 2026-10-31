# Kiến trúc đích và cổng kiểm tra Wron
## Những gì công khai và chưa xác minh
Wron công bố mobile/web, chỉnh code và tích hợp Supabase/RevenueCat [S01]. Chưa xác minh quyền xuất toàn bộ source, build độc lập, khả năng nhiều frontend, migration, test automation, log truy cập hoặc quyền thương mại đầy đủ của generated code [S02]. Mọi thiết kế sau là yêu cầu đề xuất, không nói Wron đã hỗ trợ.

## Kiến trúc MVP
Client mobile: Expo/React Native TypeScript nếu builder xuất được source và build được. Web Desk: React/TypeScript đáp ứng desktop; có thể web chung Expo nếu chứng minh accessibility/table/SEO phù hợp. Không bắt framework mà Wron không hỗ trợ rồi giả vờ đã build.
Shared: domain types, validation, localization, API client. Backend: Postgres/Supabase auth, private storage, server functions hoặc API service đã được kiểm tra. Job worker cho extraction/export/notification; idempotent jobs và dead-letter queue.
AI gateway server-side: provider adapter, budgets, schema validation, source ranges, timeout/retry; không expose secret. Nhà cung cấp cụ thể chọn sau review privacy, chi phí, vùng dữ liệu và benchmark.

## Luồng
Upload xin signed upload URL sau xác thực → storage private quarantine → malware/type validation → document record → extraction job → reviewed draft → human confirmation → item. Case API transaction kiểm participant/grant → append audit event → outbox notification. Không gọi model trực tiếp từ browser bằng master key.
Export job tạo tập dữ liệu authorized, download có thời hạn và audit. Delete job thu hồi quyền trước, xử lý dữ liệu chính rồi backup lifecycle.

## Cấu hình môi trường
dev chỉ synthetic; staging độc lập với test tenant; production chỉ tạo sau approval. Tài khoản domain/cloud/DB/repo thuộc chủ dự án; builder được cấp quyền tối thiểu. Không đưa service_role vào client, Git hoặc prompt. Không dùng database production cho demo.

## Gate0
Thử một record end-to-end; persistence sau restart; kiểm hai tài khoản và hai tenant; export repository; clean build trên máy độc lập; xác nhận license/ownership từ nhà cung cấp.
Không có source export hoặc quyền khai thác rõ: Wron chỉ dựng prototype synthetic, không là production platform. Có source nhưng test yếu: chuyển repo sang tool engineering độc lập, không cố dán một prompt “fix all”.

## Bản đồ trách nhiệm
Wron viết scaffolding/UI/tác vụ hẹp; kỹ sư sở hữu kiến trúc/migrations/review; reviewer khác kiểm security; founder duyệt tiền, IP và release. Nhân viên AI không được tự cấp quyền cho chính mình.
