# Checkpoint tự chủ AFTERVIA

- Cập nhật: 31/10/2026, sau lượt WEB-01 (lượt kích hoạt 15:08:42 UTC; ghi lúc khoảng 15:36 UTC).
- Trạng thái: **CONTINUE**. Chưa có `ENGINEERING_ACCEPTED`.
- Nguồn mệnh lệnh: gói `docs/spec/AUTONOMY_V1/` (đã kiểm checksum) và chỉ thị của chủ dự án trong phiên ngày 31/10: Cloudflare Pages là hosting ưu tiên; landing VI/EN xây ngay; không hiển thị email khi chưa xác thực; không form, không analytics theo dõi cá nhân, không thanh toán; công khai chỉ khi có quyền hosting/DNS và nội dung đã duyệt; quyền triển khai qua biến môi trường.

## Repo và nhánh
- Repo `tranhatam-collab/AFTERVIA`. Nhánh làm việc `ccr-4544c9f7-b1t50m` (writer duy nhất).
- Code WEB-01 đã commit: `9e81d80`. Commit checkpoint này nằm ngay sau đó (xem `git log`).
- `main` là commit gốc rỗng `b809781`, không chứa ứng dụng.
- PR #1: nháp, base `main`, chưa merge, chưa đổi sang sẵn sàng review, chưa có reviewer.

## Scheduler (một writer)
- Chuỗi `send_later` là writer duy nhất. Trigger chờ: `trig_01VT2LKkKb48K8b4qx3Pimnm`, lúc 15:37:00 UTC.
- Trigger trước `trig_01PSVFKta4VvhUHbQgENxJAQ` đã chạy xong lúc 15:08:42 UTC và không còn chờ.
- Chưa tạo Cloud Routine. Không bật writer thứ hai (D1, D12).

## Backlog (DONE, có bằng chứng)
WO02-01, WO03-01, WO03-02, WO03-03, WO03-04, WO04-01, WO04-02, WO04-03, WO04-04, WO05-01, WO07-01, WEB-01.

## Bị chặn và chờ người
- WEB-02 (INFRA, BLOCKED): đưa landing lên `aftervia.iai.one`. Chờ quyền Cloudflare Pages qua biến môi trường (D15) và xác nhận DNS của `iai.one` (D14). `developers.cloudflare.com` không phân giải được từ phiên, nên cấu hình trong `apps/landing/README.md` chưa đối chiếu với tài liệu chính thức.
- HUM-WEB-03 (HUMAN): chủ dự án và luật sư duyệt nội dung công khai, miễn trừ và tên AFTERVIA (D13).
- Đăng nhập thật (DEC03, D3): cần chọn nhà cung cấp danh tính và Supabase project. Hiện chỉ có đăng nhập giả lập trong môi trường cục bộ, được ghi rõ là giả lập.

## Việc kế tiếp
- WO05-02 (AUTO, READY): kiểm tệp theo chữ ký nhị phân JPEG, PNG, PDF; giới hạn 10 MB; từ chối MIME giả; trạng thái quarantine. Phụ thuộc WO05-01 (DONE). Chưa cần kho đối tượng.
- WO05-03 sau đó: cần chọn kho lưu trữ riêng tư (D6, DEC06) cho upload thật; nếu chưa có thì ghi BLOCKED cho phần upload thật.

## Kết quả kiểm thử tại `9e81d80`
- `npm run verify` exit 0 với `TEST_DATABASE_URL` trỏ tới `aftervia_test` (PostgreSQL 16.15).
- Bundle 69/69. Quét bí mật 85 tệp (5 luật). Vitest 115/115 (trước WEB-01 là 91; thêm 24 kiểm thử landing). Kiểm thử vòng lặp 13/13.
- Ma trận: PASS 7 (T03, T04, T05, T06, T22, T37, T38), NOT_RUN 39. Không đổi trong lượt này. T33 vẫn NOT_RUN vì landing chỉ là tập con của phạm vi.
- CI: `verify` đã xanh trên `62993cf` (run #10). CI trên `9e81d80` và trên commit checkpoint chưa kiểm trong lượt này; lượt kế tiếp kiểm ngay đầu vòng.
- Trình duyệt thật: 12 tổ hợp không tràn ngang, không lỗi console, không vi phạm CSP. Ảnh chụp không đưa vào repo.

## Bảo mật
- HawkScan (DAST): **BLOCKED**. Không chạy trong lượt này vì `HAWK_API_KEY` chưa đặt trong môi trường và chưa có máy chủ HTTP đang chạy cho landing (landing là trang tĩnh build vào `apps/landing/dist`). Điều kiện theo quyết định Q7 vẫn còn nguyên.
- CSP và header bảo mật của landing: chờ reviewer độc lập. Không tự gọi là đã duyệt.

## Blocker (phân loại)
- Đăng nhập thật: cần nhà cung cấp danh tính và Supabase project (DEC03). **HUMAN_REQUIRED**.
- Lưu byte tệp thật (WO05-03): cần chọn kho đối tượng riêng tư và nhà cung cấp (DEC06). **HUMAN_REQUIRED**.
- Quyền Cloudflare Pages và DNS `iai.one` (WEB-02): **HUMAN_REQUIRED**.
- DAST (HawkScan): **BLOCKED**, xem mục Bảo mật.
- Web và mobile đầy đủ (WO10): chưa bắt đầu. Landing không thay thế WO10.
- Thiết bị thật, luật sư, pilot với khách, reviewer bảo mật độc lập: **HUMAN_REQUIRED**.

## Ngân sách và quota
- Chưa đo được. Không dùng dịch vụ trả phí. Không đặt extra usage. Chưa có giới hạn đã duyệt (D7).
- Vòng lặp: 12/60 đã dùng (sau WEB-01).

## Ranh giới đã tuân thủ
- Không force-push, không rebase, không merge, không push `main`, không tạo PR mới.
- Không dùng dữ liệu thật, không production, không thanh toán live, không tài khoản dịch vụ mới, không mua tên miền, không đổi DNS.
- Không đưa tên model vào commit hoặc tài liệu. Commit WEB-01 không có dòng Co-Authored-By mang tên model, theo quy tắc hệ thống.

## Ghi chú vận hành
- Lượt 14:50 UTC thực hiện hai task liên tiếp (WO04-04 rồi WO07-01). Đã ghi trong `docs/plan/evidence/AUTO_RUNS/2026-10-31T1450Z.md`.
- Lượt 15:08 UTC: WEB-01, theo chỉ thị của chủ dự án và ưu tiên trước WO05-02 (DEC-ENG-12, DEC-ENG-13). Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1508Z.md`.
