# Quyết định

## A. Quyết định kỹ thuật do vòng lặp đề xuất (có thể đảo bằng lệnh của chủ dự án)

| ID | Quyết định | Lý do | Rủi ro còn lại |
|---|---|---|---|
| DEC-ENG-01 | Builder là Claude Code trong repo này. Wron không dùng trong vòng lặp. | Repo thuộc chủ dự án (`tranhatam-collab`). Vòng lặp chạy được và kiểm được ngay. Lối thoát đã được bản đặc tả nêu: repo đã xuất và môi trường lập trình độc lập. | Quyền IP của mã do AI viết cần được luật sư xác nhận (HUM-G0-01). Không thay thế được việc kiểm quyền. |
| DEC-ENG-02 | TypeScript strict, Node 22, PostgreSQL 16 với RLS và shim `auth.uid()` tương thích Supabase khi kiểm thử cục bộ. Vitest 4.1.12, pg 8.23.1, ajv 8.20.0, typescript 5.9.3. | Ghim phiên bản, đã kiểm ngày phát hành (Vitest 4.1.12 phát hành 15/10/2026). Postgres thật cho kết quả RLS đáng tin hơn mô phỏng. | Supabase thật cần tài khoản (DEC03). Shim không bằng Supabase; cần kiểm lại trên staging. |
| DEC-ENG-03 | Một package, cấu trúc thư mục theo `10_REPO_FILE_MANIFEST.csv` (`packages/domain`, `services/api`, `supabase/migrations`, `tests/security`). `apps/web` và `apps/mobile` thêm ở WO10. | Tránh cấu hình workspace khi chưa cần. | Manifest liệt kê `apps/` từ đầu; sẽ tạo khi tới WO10. |
| DEC-ENG-04 | `.npmrc` có `legacy-peer-deps=true`. | npm 10.9.9 gặp lỗi `Cannot read properties of null (reading 'edgesOut')` khi giải quyết peer của bộ phụ thuộc này (đã tái hiện). | Cần thử lại khi nâng npm; CI dùng cùng `.npmrc`. |
| DEC-ENG-05 | Vòng lặp làm code tổng hợp trước khi WO01 (G0) đóng. Không có dữ liệu thật và không production cho đến khi G0 đóng. | Bản đặc tả cho phép prototype synthetic khi chưa xác minh quyền. Chờ người mới bắt đầu sẽ làm đứng vòng lặp. | G0 vẫn là cổng release. Nếu G0 không đạt, sản phẩm chỉ là prototype. |
| DEC-ENG-06 | Trạng thái kiểm thử chỉ đến từ báo cáo Vitest; manual có tiền tố `MANUAL_` và không bị ghi đè. | Ngăn PASS tự khai. | Kiểm thử thiết bị và pháp lý vẫn phải ghi thủ công, có bằng chứng. |
| DEC-ENG-07 | Commit và PR không có tên model. Trailer dùng `Claude <noreply@anthropic.com>` và dòng `Claude-Session`. PR kết thúc bằng dòng "Generated with Claude Code". | Quy tắc hệ thống cấm đưa định danh model vào artifact đẩy lên repo; trailer chung vẫn ghi nhận AI đã đóng góp. | Nếu chủ dự án muốn tên model trong trailer, họ phải ghi quyết định riêng. |
| DEC-ENG-08 | Vòng lặp tự lên lịch bằng `send_later`, mỗi vòng một lượt. Dừng khi `decide` trả `STOP_*`, khi hết ngân sách 60 lượt, hoặc khi chủ dự án yêu cầu. | Đáp ứng yêu cầu "tự tạo vòng lặp liên tục cho tới khi xong". | Vòng lặp chạy khi chủ dự án vắng mặt. Hủy bằng yêu cầu trong phiên hoặc hủy lịch đã đặt. |
| DEC-ENG-09 | HawkScan DAST chạy khi có máy chủ HTTP (sau WO09-03). Hiện Docker daemon không chạy và `HAWK_API_KEY` không có: ghi `BLOCKED` với bằng chứng. | Quy tắc hook bảo mật yêu cầu quét sau thay đổi có ý nghĩa. | Không có DAST trước khi Docker và máy chủ sẵn sàng. |

## B. Quyết định cần chủ dự án (DEC01–DEC12)

Xem bảng trạng thái trong `00_EXECUTION_PLAN.md` mục 6. Không quyết định nào trong số này được coi là đã duyệt vì file này tồn tại.
