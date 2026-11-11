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
| D16 | Kho byte cho tài liệu (ảnh, PDF, tối đa 10 MiB) — đang chặn WO10-03d | (A) kho object riêng tư của nhà cung cấp danh tính; (B) byte trong Postgres theo mẫu `export_bodies`, chỉ cho dữ liệu tổng hợp; (C) object storage tự vận hành | A, quyết cùng DEC03. Dùng B tạm nếu cần kiểm thử đường tải lên/tải xuống trước khi có tài khoản. Đề xuất đầy đủ: `docs/plan/evidence/WO10-03d-prep.md`; dữ kiện mới 10/11 ở mục dưới bảng | OPEN, HUMAN_REQUIRED | Chủ dự án |
| D17 | Cách trả liên kết tải gói xuất trong 24 giờ — đang chặn HUM-WO10-03a | (1) route tải có phiên, chỉ chủ job; (2) mã truy cập một lần; (3) gửi qua email; (4) trả nội dung ngay | (1): không có bí mật mang đi được, kiểm quyền mỗi lần tải. Cần chủ dự án duyệt thêm route vào hợp đồng OpenAPI | OPEN, HUMAN_REQUIRED | Chủ dự án |
| D18 | Danh mục xóa và giữ lại dữ liệu — đang chặn HUM-LEGAL-DEL-01 và WO20-01 | Luật sư duyệt từng bảng: xóa / che nội dung / giữ lại; nếu giữ thì bao lâu, căn cứ nào, ai được xem | Gói cho luật sư đã dựng sẵn và **sinh từ lược đồ thật**: `docs/legal/DRAFT_danh-muc-xoa-va-giu-lai.md`. 28/32 bảng chưa quyết, trong đó 6 bảng rủi ro cao | OPEN, HUMAN_REQUIRED | Chủ dự án + luật sư |
| D19 | Người tải tệp lên cũng là người tuyên bố tệp đã qua kiểm (D-04 của kiểm toán 10/11) | (a) giữ nguyên cho tới khi có scanner đã duyệt; (b) chặn `SCANNER_UNAVAILABLE` ở các đường dùng, chấp nhận khóa luồng tài liệu; (c) yêu cầu một dịch vụ riêng ghi kết quả kiểm | (a) cho tới khi có scanner: (b) khóa toàn bộ luồng tài liệu hôm nay, (c) cần dịch vụ chưa tồn tại. Xem phần dưới bảng để biết vì sao vòng lặp KHÔNG tự sửa | OPEN, HUMAN_REQUIRED (chờ scanner, INFRA) | Chủ dự án |
| D20 | Đưa `check:mobile-bundle` (bundle Android thật) vào `npm run verify` | (a) đưa vào, thêm khoảng một phút vào CI; (b) giữ riêng như hiện tại | (a): mã di động import giá trị runtime từ `@aftervia/domain`, và `typecheck` không thấy lỗi phân giải lúc chạy. Đã chứng minh công cụ bắt được lỗi (xem `docs/plan/evidence/AUDIT-FOLLOWUP-2026-11-10.md`) | OPEN | Chủ dự án |
| D21 | Nơi và lịch chạy `tools/db/purge-export-bodies.mjs` (dọn nội dung gói xuất hết hạn) — đang chặn D-03 ở tầng hạ tầng | (a) cron trên máy của dự án; (b) job của nền tảng hosting; (c) chưa chạy cho đến khi có staging | Runner đã có và đã kiểm (lệnh `DATABASE_URL=... node tools/db/purge-export-bodies.mjs`). Nội dung hết hạn đã không đọc được, nên đây là dọn kho, không phải lỗ hổng bảo mật | OPEN, INFRA | Chủ dự án |
| D22 | Cho phép kích hoạt CI thủ công (`workflow_dispatch`) trong `ci.yml` | Có / Không | Có: chạy lại CI không cần commit mới, không nới cổng nào. Đề xuất từ 10/11, chưa có phản hồi | OPEN (đã hỏi) | Chủ dự án |

## Dữ kiện mới cho D16, phát hiện sau khi viết đề xuất 06/11

Ba điều dưới đây đổi cách cân nhắc, nên ghi lại thay vì để người quyết tự đoán:

1. **Xóa hàng trong `documents` KHÔNG xóa tệp.** Bản kiểm kê pháp lý sinh ngày 10/11 xếp `documents` vào
   nhóm rủi ro cao đúng vì lý do này. Nghĩa là kho được chọn **phải** xóa được tệp trong một thời hạn, và
   thời hạn đó là câu hỏi dành cho luật sư (D18). Một kho chỉ cho ghi thêm, hoặc chỉ xóa mềm, sẽ làm lời
   hứa xóa thành lời hứa suông.
2. **Phiên bản hóa và xóa mềm là bẫy.** WO16-01b đã chứng minh trên bản sao lưu: dữ liệu đã xóa vẫn còn
   trong bản sao lưu đến khi hết vòng, và chỉ cơ chế tombstone giữ cho nó không trở lại hoạt động. Kho
   object có versioning hoặc thùng rác mặc định sẽ có đúng vấn đề đó. Tiêu chí mới cho D16: **xóa cứng
   được, tắt được versioning**.
3. **Phương án B nay có tiền lệ trong repo.** `export_bodies` là bảng sửa được, có hạn 24 giờ và có hàm dọn
   (`purge_expired_export_bodies`). Nếu chọn B, hình dáng triển khai đã biết, và chi phí bản sao lưu đo được
   vì diễn tập khôi phục đã có (T39). Điều này **không** làm B tốt hơn A cho dữ liệu thật; nó chỉ làm B rẻ
   hơn như một bước tạm cho dữ liệu tổng hợp.

## Mã quyết định DEC06 đang trỏ vào hai việc khác nhau

`docs/plan/06_DECISIONS_DELEGATED.md` dùng **DEC06** cho cả lưu trữ tệp (đang **CHỜ NGƯỜI**) và AI
(đã **QUYẾT**: giữ tắt). Đặc tả gốc `ops/03_FOUNDER_DECISIONS.md` chỉ có một DEC06 = "Vendor AI/data
region và privacy" (NOT_APPROVED), và **không có mục nào cho lưu trữ tệp**.

Hệ quả thực tế: nếu chủ dự án viết "duyệt DEC06", không ai biết là duyệt việc nào, và một trong hai việc
đó đã được quyết từ trước. Đề xuất của vòng lặp (chưa phải quyết định): cấp mã riêng cho kho byte —
`D16` ở bảng trên dùng tạm làm mã trong hồ sơ kế hoạch. Đặc tả là bất biến nên **không** sửa; chỉ hồ sơ
kế hoạch được ghi rõ.

## Vì sao vòng lặp không tự sửa D-04 (D19)

Sự thật đã kiểm trong mã, không phải suy đoán:

- `public.record_upload_inspection` được **`grant execute ... to authenticated`** (`0004_quarantine.sql`, dòng
  cuối), và nằm trong danh sách bề mặt khách gọi được của `tests/security/function-privileges-surface.test.ts`.
- Hàm nhận `p_scan_status`, `p_reason`, `p_detected_mime`, `p_actual_size` **từ người gọi**, và chỉ kiểm
  người gọi có phải **chủ tài liệu** hay không (`v_owner <> v_uid`). Tức là người tải tệp lên cũng là người
  khai tệp đã qua kiểm.
- `SCANNER_UNAVAILABLE` được chấp nhận y như `CLEAN` ở **bốn** chỗ: `0005:87`, `0008:211`, `0012:34`, `0013:85`.
- Hôm nay **chưa khai thác được**, vì chưa có kho byte nên không có tệp thật nào được phục vụ (D16).

Ba cách sửa đều vượt quyền vòng lặp:

- Chặn `SCANNER_UNAVAILABLE` ở các đường dùng sẽ **khóa toàn bộ luồng tài liệu** ngay lập tức. Đó là quyết
  định sản phẩm, không phải sửa lỗi.
- Bắt hàm chỉ cho máy chủ gọi (`assert_server_caller`) nghe hợp lý, nhưng `withUser` của API đặt
  `set local role authenticated`, nên **chính API cũng sẽ không gọi được**. Nó chỉ dời chỗ nghẽn, và vẫn cần
  một dịch vụ kiểm tệp mà hôm nay chưa tồn tại.
- Thêm cột ghi "ai xác nhận" thì hôm nay không ai đọc, và với dữ liệu tổng hợp thì không có gì để truy ngược.

Nói thẳng: **điều kiện đủ để sửa là có một scanner đã duyệt (INFRA)**, cùng lúc với D16. Trước đó, mọi thay
đổi chỉ là đổi hình dáng của cùng một sự tin tưởng.
