# Quyết định theo ủy quyền — 03/11/2026

Căn cứ: chủ dự án viết "tất cả luôn, làm đi, tự quyết luôn". Mỗi mục ghi lựa chọn, căn cứ và trạng thái.

Nhãn trạng thái:
- **QUYẾT** — quyết định nội bộ của dự án, áp dụng ngay.
- **QUYẾT TẠM** — chọn để tiến hành, nhưng cần luật sư hoặc người có thẩm quyền xác nhận trước khi dùng thật.
- **CHỜ NGƯỜI** — cần tài khoản, thiết bị, người hoặc hành động bên ngoài sandbox. Tôi không tự làm.
- **KHÔNG CẤP** — giữ ở trạng thái không được phép. Không tự cấp.

Quyết định không phải là phê duyệt pháp lý, và không có gì được xuất bản hay gửi ra ngoài.

## 1. Cổng audit P1 (PR #1)
- Thử phương án 2 (ghi đè). Bundle Expo hỏng với `image-size` 2.x. Đã hoàn tác. Chi tiết: `docs/plan/evidence/P1-AUDIT-OPTION2.md`. **CHỜ CHỦ DỰ ÁN** chọn 1 hoặc 4. Không chọn 3, vì đổi định nghĩa cổng. Phương án 4 gỡ kiểm thử mobile khỏi `verify`, cần xác nhận.

## 2. Vòng lặp, ngân sách, PR
- D1: giữ chuỗi `send_later`. **QUYẾT**.
- D2: PR #1 giữ nháp. **QUYẾT**.
- D6: không bật `.claude/loop.md`. **QUYẾT**.
- D7 và ngân sách: không có hạn mức chi; không gọi dịch vụ trả phí. Ngân sách vòng lặp giữ 60, vì công cụ không cho đổi. **QUYẾT**.
- Thêm task kỹ thuật khử trùng idempotency ở máy chủ (grant và `POST /v1/items`). **QUYẾT**: làm ở vòng lặp kế tiếp.

## 3. Xóa tài khoản (WO11-02, Q1–Q6)
> Đính chính 10/11 (kiểm toán): nhãn QUYẾT và QUYẾT TẠM ở Q1–Q6 do agent ghi khi chưa có câu trích nguồn trong repo. Đặt về CHỜ NGƯỜI cho đến khi chủ dự án và luật sư xác nhận. Mã đã triển khai (migration `0020`) không bị gỡ.

- Q1 danh mục xóa: phương án A (dùng `legal/04` làm nháp). Grace: 30 ngày. Merchant giữ chứng từ: theo `legal/04`, tách riêng. **QUYẾT TẠM**: **CHỜ NGƯỜI**: luật sư xác nhận từng dòng.
- Q2 nội dung cá nhân trong bảng chỉ thêm: phương án C (chuyển sang bảng sửa được, bảng chỉ thêm giữ mã tham chiếu). **CHỜ NGƯỜI**: triển khai trong task riêng.
- Q3 xác minh danh tính và phiên: C ngay (thời hạn phiên 15 phút, xác thực lại trước khi xóa). Khi chọn nhà cung cấp, chuyển sang A. **CHỜ NGƯỜI**.
- Q4 thành viên tổ chức khi khách xóa: A (đánh dấu REVOKED; từ chối nếu là owner duy nhất). **CHỜ NGƯỜI**: triển khai trong task riêng. **Đã triển khai**: WO11-02g-MEM (migration `0020`, T25 và T26; chờ reviewer độc lập).
- Q5 quyền bên nhận: A cho quyền truy cập tài liệu; C cho bản ghi case của merchant. **CHỜ NGƯỜI**: luật sư xác nhận.
- Q6 xuất dữ liệu trong lúc chờ xóa: A (cho phép). **CHỜ NGƯỜI**. Không cần đổi mã.

## 4. Danh tính, lưu trữ, AI
- D3 danh tính đăng nhập thật: Supabase project thuộc chủ dự án. **QUYẾT HƯỚNG**. Chủ dự án tự tạo tài khoản. **CHỜ NGƯỜI**.
- DEC06 lưu trữ tệp tài liệu và scanner mã độc: chưa chọn nhà cung cấp, vì cần tài khoản và duyệt riêng tư. Đề xuất: lưu trữ riêng tư cùng nhà cung cấp danh tính. **CHỜ NGƯỜI**.
- DEC06 AI: giữ tắt, `AI_PROVIDER=disabled`, không chọn vendor. **QUYẾT**.

> **Lưu ý 10/11 — hai dòng trên dùng cùng một mã cho hai việc khác nhau, với hai trạng thái khác nhau.**
> Đặc tả bất biến `ops/03_FOUNDER_DECISIONS.md` chỉ có một DEC06 = "Vendor AI/data region và privacy"
> (NOT_APPROVED), và không có mục nào cho lưu trữ tệp tài liệu. Vì vậy câu "duyệt DEC06" là **không rõ
> nghĩa**: một việc (AI) đã QUYẾT, việc kia (kho byte) còn CHỜ NGƯỜI.
> Kho byte nay được theo dõi riêng ở `docs/plan/06_DECISION_QUEUE.md` dòng **D16**, kèm ba dữ kiện mới
> phát hiện sau đề xuất 06/11. Đặc tả không bị sửa; chỉ hồ sơ kế hoạch được ghi rõ. Việc cấp mã chính
> thức cho kho byte là quyết định của chủ dự án.

## 5. Landing, Cloudflare, DNS
- Chủ dự án cho phép tạo Cloudflare Pages và `aftervia.iai.one`, **khi nội dung đã duyệt**. Điều kiện duyệt gồm luật sư (HUM-WEB-03). Hiện chưa có luật sư duyệt, nên **chưa tạo project, chưa công khai**. **ĐIỀU KIỆN CHƯA ĐỦ**.
- Token đọc từ biến môi trường `CLOUDFLARE_API_TOKEN`, không dán vào chat. Hiện biến này chưa có trong môi trường, nên chưa gọi được API. **CHỜ NGƯỜI**.
- Không đổi nameserver của `iai.one`. **QUYẾT**.
- Nhà cung cấp DNS của `iai.one`: chưa xác định. Sandbox không phân giải được tên miền; cần token để đọc zone. **CHỜ NGƯỜI** (token).
- Repo `tranhatam-collab/aftervia.iai.one`: đã clone chỉ đọc. Repo **rỗng**, không có commit. Chưa đẩy nội dung nào lên đó. **QUYẾT**.
- Công khai landing khi tên làm việc chưa có clearance (D13, DEC12): không công khai. **QUYẾT**.

## 6. Chính sách sản phẩm
- WO06-03 trường quan trọng: ngày mua, số tiền, tiền tệ, serial. **QUYẾT**: duyệt như đề xuất.
- WO07-02 giờ đặc biệt của lịch nhắc: giờ không tồn tại thì dời sang sau khoảng trống; giờ lặp lại thì lấy lần đầu. **QUYẾT**.
- WO08-01 kết quả khi đóng case: `repaired`, `replaced`, `refunded`, `credited`, `no_remedy`; mở lại chỉ từ `resolved`. **QUYẾT** (chính sách). Nhãn VI/EN vẫn là bản dự thảo: **CHỜ NGƯỜI** (người bản ngữ).
- WO08-02 bằng chứng chưa quét: không hiển thị nội dung cho bên kia, chỉ hiển thị trạng thái. Tổ chức SUSPENDED không được chuyển trạng thái mới. **QUYẾT**.
- WO08-03 inbox và phân công: inbox toàn tổ chức; chỉ owner và manager phân công. **QUYẾT**.
- WO09-01 chia sẻ: tối đa 30 ngày; chỉ vai trò partner; người tham gia thấy timeline; lý do từ chối đầy đủ chỉ người liên quan thấy. **QUYẾT**.
- WO09-02 quyền đọc của chủ sở hữu: không phụ thuộc trạng thái case. **QUYẾT**.
- WO09-03 hợp đồng HTTP: mô tả tối đa 500 ký tự, khớp DB. Đặc tả ghi 4000 là sai khác đã biết; `docs/spec` chỉ đọc, nên không sửa đặc tả. Danh sách mã lỗi hiện tại được duyệt. `shared_document_ids` chỉ gắn bằng chứng, không cấp quyền. **QUYẾT**.
- HUM-WO10-03a link tải gói xuất: chọn B (mã truy cập một lần). Phải có reviewer độc lập trước khi triển khai. **QUYẾT HƯỚNG**; **CHỜ NGƯỜI** (reviewer).

## 7. Người, thiết bị, pháp lý, kinh doanh
- DEC01 tên làm việc AFTERVIA: duyệt làm tên làm việc, chưa có clearance. DEC02 SMB điện máy, B2B trước: duyệt. **QUYẾT THEO ỦY QUYỀN**.
- DEC05 reviewer độc lập: chưa có người. **CHỜ NGƯỜI** (chủ dự án chỉ định; không được là AI viết code).
- DEC07 quốc gia pilot: đề xuất Việt Nam làm quốc gia đầu tiên. Giữ DISABLED đến khi luật sư và chủ dự án duyệt. **QUYẾT HƯỚNG**.
- HUM-WO02-02/03 phỏng vấn 30 người và chọn 5 design partner: không mua danh sách, không điền số giả. **CHỜ NGƯỜI**.
- DEV-01 thiết bị iPhone và Android thật; DEV-02 Safari và Firefox: **CHỜ NGƯỜI**. Chính sách trình duyệt (D9) đã chốt.
- INF-01 staging độc lập: chưa tạo, cần tài khoản hạ tầng. **CHỜ NGƯỜI**.
- HUM-WO18-02 luật sư theo quốc gia, tư vấn IP, duyệt store và billing: **CHỜ NGƯỜI** (chủ dự án chỉ định).
- Người bản ngữ rà soát VI/EN: **CHỜ NGƯỜI**.
- HawkScan (D4): cần `HAWK_API_KEY` trong môi trường và Docker đang chạy. **CHỜ NGƯỜI**.
- HUM-G0-01 builder và quyền source: xác nhận Claude Code trong repo (DEC-ENG-01). Quyền sử dụng source cần văn bản xác nhận. **QUYẾT TẠM**.

## 8. Không cấp
- DEC04 hạn mức discovery và probe: **KHÔNG CẤP**.
- DEC08 dữ liệu khách thật, DEC09 thanh toán và store, DEC10 phát hành production, DEC11 kết nối dự án hiện hữu, DEC12 tên miền và IP: **KHÔNG CẤP**.
- HUM-WO19-02 pilot với cửa hàng thật, HUM-WO20-02 quyết định phát hành, HUM-WO21-01, HUM-WO22-01: để sau, cần dữ liệu và duyệt riêng.

## Việc máy đã làm trong lượt này
- Thử phương án 2 của cổng P1, rồi hoàn tác. Bằng chứng trong `P1-AUDIT-OPTION2.md`.
- Kiểm tra token Cloudflare và DNS `iai.one`: chưa đủ điều kiện.
- Clone repo `aftervia.iai.one` (chỉ đọc): repo rỗng.

## Việc máy sẽ làm tiếp
- Task `SEC-IDEM-01`: khử trùng idempotency ở máy chủ cho grant và `POST /v1/items`. Bắt đầu ở vòng lặp kế tiếp.
- Q2–Q4 xóa tài khoản: cần task riêng và thêm ngân sách vòng lặp. Chưa có trong backlog.
