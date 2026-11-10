# Mức sẵn sàng phát hành (kỹ thuật)

Tách khỏi số task DONE trong backlog. Mỗi dòng phải có bằng chứng đúng SHA, hoặc ghi trạng thái trung thực.
Trạng thái dùng: VERIFIED, PARTIAL, NOT_RUN, BLOCKED, HUMAN_REQUIRED.

| Yêu cầu | Bằng chứng hiện có | Trạng thái | Còn thiếu |
|---|---|---|---|
| Hai tài khoản A/B, dữ liệu lưu thật trong Postgres, không đọc chéo, không nâng quyền, còn sau khởi động lại | `tests/db/tenant-isolation`, `tests/api/*`, T03/T04/T05 PASS | PARTIAL | Đăng nhập thật (DEC03); chưa có khởi động lại tiến trình API thật, mới là kết nối DB mới |
| Tổ chức, thành viên, phân quyền (RLS, hàm kiểm quyền, đối chiếu TS/SQL) | WO04-01..04; `policy-parity`, T06 PASS | PARTIAL | Nhật ký từ chối ở tầng API có vai trò riêng |
| Món đồ nhập tay, khóa phiên bản, cách ly | WO07; Web Desk (WO10-01) và di động (WO10-02); T18 PASS | PARTIAL | Xóa món đồ; phân trang |
| Đăng nhập (JWT) | `jwt.test.ts`; `dev/sign-in` chỉ ở local/test; TTL 15 phút; xác thực lại 5 phút trước khi xóa (WO11-02f-SESS) | PARTIAL | Đăng nhập thật (DEC03); làm mới phiên; bản di động chưa có đăng nhập nào |
| Chứng từ và lưu trữ riêng tư | WO05-01..03; T09, T10 PASS | PARTIAL | Kho byte thật chưa chọn (DEC06, WO10-03d); quét mã độc thật cần scanner đã duyệt |
| Trích xuất AI có dẫn nguồn | WO06-01..05; T11..T16, T45 PASS | PARTIAL | Provider thật; đo độ chính xác trên bộ dữ liệu được phép |
| Hồ sơ hậu mãi, trạng thái, cập nhật | WO08-01..03; T17, T19, T20 PASS; e2e đi hết luồng trên Chromium | PARTIAL | Phân trang và tìm kiếm |
| Chia sẻ tài liệu, thu hồi | WO09-01..03; T07, T08 PASS; e2e cấp và thu hồi trên trình duyệt thật | PARTIAL | Bản đã tải về không thu hồi được (đã nói rõ với người dùng) |
| Web và mobile responsive, VI/EN, sáng/tối, accessibility | WO10, WO15-01/02; T32, T33 PASS; `_headers` có CSP | PARTIAL | Màn hình thật trên thiết bị (DEV-01); screen reader thật |
| Xuất dữ liệu, xóa tài khoản | WO11-01, WO11-02a/b/c/e-*/f-SESS/g-MEM, WO11-03; T24 PASS, T25 PASS; màn Quyền riêng tư trên cả hai bản | PARTIAL | Danh mục xóa chờ luật sư (HUM-LEGAL-DEL-01); chưa có đường tải gói xuất (HUM-WO10-03a); bản di động chưa gửi được vì chưa có đăng nhập |
| Thuê bao sandbox, webhook chống replay | WO12-01/02/03; T27, T28, T29, T30, T46 PASS; `unique (provider, event_id)`, chữ ký HMAC + cửa sổ 300 giây, chống đảo thứ tự | PARTIAL | Chưa mở route HTTP cho webhook; nhà cung cấp chưa chốt; DEC09 KHÔNG CẤP; chưa đối soát với ngân hàng |
| Sao lưu và khôi phục có diễn tập | WO16-01a (diễn tập cục bộ có manifest SHA-256), WO16-01b (sổ tombstone ngoài bản sao lưu); T39 PASS, T26 MANUAL_PARTIAL | PARTIAL | Staging thật và RPO/RTO (INF-01); object storage; nơi lưu sổ còn là thư mục cục bộ |
| Hộp đen vận hành: kill switch, break-glass, country gating | WO16-02/03/04; T37, T41, T42 PASS | PARTIAL | Chưa có đường báo động tới người vận hành |
| DAST | Không chạy được | BLOCKED | Docker, `HAWK_API_KEY`, máy chủ HTTP độc lập (WO17-01b) |
| Build và kiểm trên thiết bị iOS/Android thật | Chưa có | HUMAN_REQUIRED | Thiết bị và tài khoản store (DEV-01, DEV-02) |
| Đánh giá bảo mật độc lập | Gói bằng chứng WO17-01a đã dựng | HUMAN_REQUIRED | Reviewer ngoài (DEC05, HUM-WO17-02) |
| Pháp lý, IP, store, pilot với khách | Bản nháp v0.2 trong `docs/legal` (WO18-01, DRAFT) | HUMAN_REQUIRED | Luật sư, nhãn hiệu, tài khoản store, khách thật (HUM-WO18-02, DEC09) |

**ENGINEERING_ACCEPTED: CHƯA ĐẠT.** Mọi dòng còn ở PARTIAL trở xuống. Không tuyên bố production-ready, pháp lý hay kinh doanh.

Ghi chú về cách đọc bảng này: PARTIAL nghĩa là có bằng chứng tự động chạy được, **không** nghĩa là đã dùng
được với khách thật. Không dòng nào ở đây được nâng lên VERIFIED khi chưa có staging, đăng nhập thật và
reviewer độc lập.
