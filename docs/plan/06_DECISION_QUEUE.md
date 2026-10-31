# Hàng đợi quyết định

Quyết định nào cũng ghi: câu hỏi, lựa chọn, đề xuất, trạng thái, người quyết định. Không tự quyết khi thuộc phạm vi chủ dự án.

| ID | Câu hỏi | Lựa chọn | Đề xuất | Trạng thái | Người quyết |
|---|---|---|---|---|---|
| D1 | Writer nào điều khiển vòng lặp? | (a) giữ chuỗi `send_later`; (b) chuyển sang một Cloud Routine ghi | (a) cho đến khi có dry run đã kiểm | OPEN | Chủ dự án |
| D2 | Đưa PR #1 sang sẵn sàng review, mời reviewer ngoài, hoặc kích hoạt CodeRabbit | Giữ nháp / chuyển sang sẵn sàng | Giữ nháp cho đến khi chủ dự án ủy quyền | OPEN | Chủ dự án |
| D3 | Nhà cung cấp danh tính cho đăng nhập thật | Supabase project hoặc khác | Supabase project thuộc chủ dự án (DEC03) | OPEN, HUMAN_REQUIRED | Chủ dự án |
| D4 | DAST HawkScan | Đã đồng ý có điều kiện (câu 7) | Đặt `HAWK_API_KEY` trong cài đặt môi trường, đảm bảo Docker, rồi chạy sau WO09-03 | OPEN (điều kiện chưa đủ) | Chủ dự án |
| D5 | Vai trò kết nối API cho production (không superuser) | Vai trò `aftervia_api` chỉ có quyền cần thiết | Tự làm trong kỹ thuật, trước khi có môi trường staging | OPEN (kỹ thuật) | Architect (Claude) |
| D6 | Có kích hoạt `.claude/loop.md` trong repo không? | Có / Không | Không, cho đến khi D1 có quyết định | OPEN | Chủ dự án |
| D7 | Ngân sách và quota cho vòng tự chủ | Số lượt mỗi ngày, mức chi nếu có | Chủ dự án đặt; hiện chưa có số | OPEN | Chủ dự án |
| D8 | Phỏng vấn khách (câu 6): danh sách và hạn mức chi | Danh sách do chủ dự án cung cấp; trả tiền hay không | Không mua danh sách, không trả tiền cho đến khi có quyết định | OPEN, HUMAN_REQUIRED | Chủ dự án |
| D9 | Trình duyệt mục tiêu (câu 8) | Chính sách đã có | Chrome và Firefox: hai bản stable gần nhất; Safari: các bản macOS/iOS được hỗ trợ; ghim phiên bản khi chạy DEV-02 | DECIDED (chính sách); ghim khi chạy | Chủ dự án |
| D10 | Thứ tự ưu tiên lát cắt | Gói cũ ghi WO04-02 → WO04-03 → WO07-01 | Đã xác minh qua repo: WO04-02, WO04-03, WO07-01 đã DONE; ưu tiên tiếp theo theo backlog | DECIDED (theo bằng chứng) | Architect (Claude) |
| D11 | Áp dụng gói tự chủ vào repo | Lưu trữ, dùng checkpoint, không kích hoạt routine | Đã lưu trữ tại `docs/spec/AUTONOMY_V1/`; đã áp dụng checkpoint và receipt | DECIDED (một phần) | Chủ dự án |
| D12 | Hai writer cùng lúc | Cho phép hay không | Không. Không bật routine ghi khi chuỗi `send_later` còn chạy | DECIDED | Chủ dự án |
| D13 | Công khai landing page tại AFTERVIA.iai.one khi tên AFTERVIA chưa clearance | Công khai / chờ clearance | Chủ dự án chốt AFTERVIA là tên làm việc, chưa xác nhận độc quyền. Chỉ công khai khi có quyền hosting và DNS, và nội dung đã duyệt (HUM-WEB-03, luật sư) | PARTIAL: tên làm việc đã chốt; công khai còn chờ duyệt | Chủ dự án |
| D14 | Nhà cung cấp hosting và DNS cho AFTERVIA.iai.one | Cloudflare Pages (nếu iai.one ở Cloudflare) hoặc nhà cung cấp khác | Chủ dự án chọn Cloudflare Pages làm hosting ưu tiên. Chưa biết DNS của iai.one đang ở đâu; cần xác nhận trước WEB-02 | PARTIAL: hosting đã chọn; DNS chưa xác nhận | Chủ dự án |
| D15 | Cách cấp quyền triển khai | Cloudflare connector trên claude.ai (mở phiên mới sau khi thêm) hoặc API token trong biến môi trường | Biến môi trường, không dán vào chat, không ghi vào repo. Chưa cấp token nào; chưa có connector Cloudflare trong phiên | DECIDED (cơ chế); CHƯA CẤP QUYỀN | Chủ dự án |
