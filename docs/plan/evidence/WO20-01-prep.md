# WO20-01 (chuẩn bị, KHÔNG phải nghiệm thu): checklist phát hành G4 và kịch bản rollback

- Loại: AUTO_PREP. Trạng thái task: **vẫn TODO** — phụ thuộc WO17-01b và HUM-LEGAL-DEL-01 chưa xong, nên vòng lặp không được bắt đầu task này.
- Mục đích: đầu vào cho quyết định HUM-WO20-02 của chủ dự án. Không phát hành, không chạm production, không chạy gì trên staging.
- Bảo mật: **chờ reviewer độc lập**.

## 1. Cổng G4 theo đặc tả

`validation/02_RELEASE_GATES.md`: G4 Release cần **reviewer độc lập; monitoring/support/rollback; owner approve**, và bằng chứng là **release receipt, commit, builds**. Không phát hành nếu thiếu.

## 2. Bảng kiểm G4 với trạng thái thật

| Mục | Trạng thái | Bằng chứng / lý do |
|---|---|---|
| Test tự động toàn bộ | **PASS trên máy, CI chưa xác nhận** | `npm run verify` exit 0 (681 đạt, 1 bỏ qua) tại `e015526`. Actions đang lỗi ở tầng hạ tầng: run không tạo bước nào |
| E2E trên trình duyệt | **PASS trên máy** | `npm run e2e:web` exit 0, gồm bước xóa tài khoản (T25) |
| Bundle ứng dụng di động | **PASS trên máy, chưa trong verify** | `npm run check:mobile-bundle` (Android, Metro thật); đề xuất đưa vào verify: D20 |
| Quét bí mật và bundle | PASS | 578 tệp sạch; `check:bundle` 69/69 |
| Audit phụ thuộc production | **Không xác nhận được hiện tại** | Bước 7 của CI từng đạt (run 42803201074); CI hiện không chạy |
| DAST (HawkScan) | **BLOCKED** | Cần máy chủ đang chạy và `HAWK_API_KEY`; đó là điều kiện D4 |
| Reviewer độc lập | **WAITING_HUMAN** | HUM-WO17-02 (DEC05) |
| Thiết bị iPhone và Android thật | **WAITING_HUMAN** | DEV-01; không có thiết bị trong phiên này |
| Trình duyệt mục tiêu (Chrome, Safari, Firefox) | **WAITING_HUMAN** | DEV-02; chỉ có Chromium. Không cài trình duyệt khác từ phiên này |
| Staging và khôi phục thật, đo RPO/RTO | **WAITING_HUMAN** | INF-01; hiện chỉ có diễn tập cục bộ (T39) |
| Pháp lý: danh mục xóa, điều khoản, IP, store | **Chưa đạt** | HUM-LEGAL-DEL-01, HUM-WO18-02 (bản nháp: `docs/legal/`) |
| Quyết định DEC01–DEC12 | **WAITING_HUMAN** | HUM-DEC-01 |
| **Monitoring** | **Không có** | Repo không có hệ thống giám sát nào; không có cảnh báo tự động |
| **Support** | **Không có quy trình** | Có break-glass (WO16-02) nhưng chưa có quy trình vận hành hỗ trợ |
| Đích triển khai | **Không có** | Hosting chưa chọn (D14); DNS chưa xác nhận (WEB-02, BLOCKED) |
| Release receipt | **Không có** | Cần build từ CI thật; CI hiện không chạy được |

**Kết luận: G4 không đạt.** Có 5 mục cần người (reviewer, thiết bị, trình duyệt, staging, pháp lý) và 3 mục hạ tầng chưa có (monitoring, support, đích triển khai). Không có mục nào trong bảng này do vòng lặp tự đóng được.

## 3. Đòn bẩy rollback có sẵn (đã kiểm trong mã)

- **Kill switch theo tính năng** (WO16-02, `set_kill_switch` chỉ gọi được bởi máy chủ): `ai_extraction`, `billing_writes`, `country_activation`, `outbound_notifications`, `sharing`. Tắt tính năng mà không đổi mã. **Chưa kiểm trên staging.**
- **Không có migration đảo ngược.** `supabase/migrations/` không có tệp down hay rollback nào (đếm: 0). Mọi thay đổi schema là một chiều. Rollback dữ liệu nghĩa là khôi phục từ bản sao lưu logic.
- **Khôi phục từ bản sao lưu**: có diễn tập cục bộ (`tools/db/restore-drill.mjs`, WO16-01a) và sổ tombstone ngoài bản sao lưu (WO16-01b). Chưa đo RPO/RTO thật, và **chưa có script khôi phục cho production** — đó là khoảng trống.
- **Rollback phiên bản ứng dụng**: không có, vì chưa có đích triển khai.

## 4. Kịch bản rollback (CHƯA CHẠY, chỉ là thứ tự thao tác)

1. **Xác định phạm vi sự cố** và ghi lại thời điểm bắt đầu.
2. **Bật kill switch đúng tính năng** bằng vai trò dịch vụ, kèm lý do ngắn. Nếu là lỗi ghi dữ liệu, bật `billing_writes` hoặc `sharing` trước. Đây là bước đầu, không phải bước cuối.
3. **Không sửa trực tiếp production.** Nếu dữ liệu hỏng: khôi phục bản sao lưu logic vào một DB cô lập, kiểm số dòng và hash bằng cùng cơ chế của diễn tập (WO16-01a), rồi mới quyết định thay thế. Việc thay thế cần owner duyệt.
4. **Đối chiếu tombstone** trên bản khôi phục (WO16-01b) để không đưa tài khoản đã xóa trở lại ACTIVE.
5. **Ghi biên nhận sự cố** và thông báo người dùng theo quy trình hỗ trợ — **quy trình này chưa tồn tại**.
6. **Thoát khỏi rollback** chỉ khi owner duyệt và kiểm tra lại các test G4.

**Chưa kiểm bước nào trong số trên trên staging.** Bước 3 phụ thuộc INF-01.

## 5. Việc cần người khác (không vòng lặp nào làm thay)

- Reviewer độc lập (HUM-WO17-02).
- Thiết bị thật và trình duyệt mục tiêu (DEV-01, DEV-02).
- Staging, RPO/RTO thật, và quyết định nơi lưu sao lưu ngoài cơ sở dữ liệu (INF-01; D16 và D21 liên quan).
- Pháp lý: danh mục xóa (HUM-LEGAL-DEL-01), điều khoản và IP (HUM-WO18-02).
- Quyết định DEC01–DEC12 (HUM-DEC-01).
- Chọn hosting và xác nhận DNS (D14, WEB-02) — DNS là việc không được đổi nếu chưa có quyết định của chủ dự án.
- Quy trình monitoring và support — chưa có ai nhận việc này.
- Duyệt phát hành G4 (HUM-WO20-02).
