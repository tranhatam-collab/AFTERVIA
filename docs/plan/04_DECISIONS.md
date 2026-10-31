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

## C. Phê duyệt của chủ dự án

Ngày 31/10/2026, chủ dự án trả lời "All" cho câu hỏi 1–5 trong phiên. Ghi nhận như sau:

| Câu | Nội dung | Phê duyệt |
|---|---|---|
| 1 | Tạo `main` làm base cho PR nháp | Đồng ý về ý định. Cách thực hiện đã đề xuất không dùng được, xem `docs/plan/evidence/PR-STATUS.md`. Chờ chọn phương án A hoặc B. |
| 2 | Builder là Claude Code trong repo (DEC-ENG-01) | Đồng ý |
| 3 | Vòng lặp tự chạy đến khi hết việc máy làm được, tối đa 60 lượt (DEC-ENG-08) | Đồng ý. Dừng khi chủ dự án nói "dừng vòng lặp" |
| 4 | Viết mã synthetic trước khi G0 đóng (DEC-ENG-05) | Đồng ý. Không dữ liệu thật, không production, không thanh toán live khi chưa đủ G0 |
| 5 | Stack TypeScript, Node 22, PostgreSQL 16, Vitest; Expo cho mobile khi tới WO10 (DEC-ENG-02) | Đồng ý |
| 6 | Danh sách phỏng vấn và hạn mức chi cho người tham gia (DEC04) | Chưa trả lời |
| 7 | Bật HawkScan DAST | Chưa trả lời. Cần Docker chạy được và `HAWK_API_KEY` đặt trong môi trường, không dán vào chat |
| 8 | Phiên bản trình duyệt mục tiêu (T36) | Chưa trả lời |

Phê duyệt này không bao gồm: production, dữ liệu thật, thanh toán live, tài khoản dịch vụ, mua tên miền, nộp store, gửi tin cho khách. Những việc đó vẫn cần phê duyệt riêng.

## D. Cập nhật câu 6–8 (31/10/2026)

Chủ dự án trả lời "Ok all" cho câu 6–8. Câu 7 có thể ghi là đồng ý. Câu 6 và 8 cần nội dung cụ thể nên chưa ghi là đã duyệt.

| Câu | Nội dung | Trạng thái | Điều kiện hoặc việc còn lại |
|---|---|---|---|
| 6 | Danh sách phỏng vấn và hạn mức chi cho người tham gia (DEC04) | CHỜ THÔNG TIN | Cần: số người và kênh tuyển (không mua danh sách email), và có trả tiền hay không. Nếu có, cần mức tối đa. Đề xuất mặc định: không trả tiền; chỉ quà tặng nhỏ nếu anh ghi rõ mức. |
| 7 | Bật HawkScan DAST | ĐỒNG Ý CÓ ĐIỀU KIỆN, đang BLOCKED | (a) Thêm biến môi trường `HAWK_API_KEY` trong cài đặt môi trường, không dán vào chat; phiên mới mới đọc được biến. (b) Môi trường có Docker đang chạy. Hiện daemon không chạy. (c) Có máy chủ HTTP để quét, tức là sau WO09-03. |
| 8 | Phiên bản Chrome, Safari, Firefox mục tiêu (T36) | CHỜ THÔNG TIN | Đề xuất mặc định để anh đồng ý hoặc sửa: Chrome hai bản ổn định mới nhất; Safari hai bản mới nhất trên macOS và iOS; Firefox bản ổn định mới nhất và bản ESR. |

Trạng thái kiểm tra lúc ghi nhận: `HAWK_API_KEY` chưa đặt; Docker daemon không chạy; repo chưa có máy chủ HTTP (`services/api/src` chưa có tệp server).
