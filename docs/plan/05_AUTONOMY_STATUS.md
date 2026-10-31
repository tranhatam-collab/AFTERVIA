# Checkpoint tự chủ AFTERVIA

- Cập nhật: 31/10/2026, sau lượt WO06-04 (lượt kích hoạt 16:20:53 UTC; ghi lúc khoảng 16:27 UTC).
- Trạng thái: **CONTINUE**. Chưa có `ENGINEERING_ACCEPTED`.
- Nguồn mệnh lệnh: gói `docs/spec/AUTONOMY_V1/` (đã kiểm checksum); chỉ thị của chủ dự án trong phiên ngày 31/10 (Cloudflare Pages là hosting ưu tiên; landing VI/EN; không form, không email hiển thị, không thanh toán; công khai chỉ khi có quyền và nội dung đã duyệt; quyền qua biến môi trường); ảnh bảng nhận diện do chủ dự án gửi cùng lệnh "Áp dụng".

## Repo và nhánh
- Repo `tranhatam-collab/AFTERVIA`. Nhánh làm việc `ccr-4544c9f7-b1t50m` (writer duy nhất).
- Commit mới nhất của task: `3c09cf7` (WO06-04). Trước đó: `b13cab3` (checkpoint WO06-03), `1470146` (WO06-03), `081c2cd` (checkpoint WO06-02), `8160beb` (WO06-02), `c477d0e` (checkpoint WO06-01), `64eea75` (WO06-01).
- Commit checkpoint này nằm ngay sau `3c09cf7` (xem `git log`).
- `main` là commit gốc rỗng `b809781`, không chứa ứng dụng.
- PR #1: nháp, base `main`, chưa merge, chưa đổi sang sẵn sàng review, chưa có reviewer.

## Scheduler (một writer)
- Chuỗi `send_later` là writer duy nhất. Trigger vừa chạy: `trig_01UuCpeDiPyi6uk5kQe7G3pg` (16:20:53 UTC), đã xong.
- Lượt kế tiếp: một `send_later` 2 phút sau lượt này (khoảng 16:28 UTC), theo Bước 7 của `01_LOOP_PROTOCOL.md`. ID trigger do công cụ trả về, ghi trong báo cáo cuối của lượt.
- Chưa tạo Cloud Routine. Không bật writer thứ hai (D1, D12).

## Backlog (DONE, có bằng chứng)
WO02-01, WO03-01, WO03-02, WO03-03, WO03-04, WO04-01, WO04-02, WO04-03, WO04-04, WO05-01, WO05-02, WO05-03, WO06-01, WO06-02, WO06-03, WO06-04, WO07-01, WEB-01.

## Bị chặn và chờ người
- WEB-02 (INFRA, BLOCKED): đưa landing lên `aftervia.iai.one`. Chờ quyền Cloudflare Pages qua biến môi trường (D15) và xác nhận DNS của `iai.one` (D14).
- HUM-WEB-03 (HUMAN): chủ dự án và luật sư duyệt nội dung công khai, miễn trừ và tên AFTERVIA (D13). Tên và tagline chưa kiểm tra nhãn hiệu.
- Đăng nhập thật (DEC03, D3): cần chọn nhà cung cấp danh tính và Supabase project. Hiện chỉ có đăng nhập giả lập cục bộ, được ghi rõ là giả lập.
- Upload thật (DEC06 và INFRA): WO05-03 hoàn tất phần idempotent và cổng trạng thái. Upload thật vẫn BLOCKED cho đến khi có kho lưu trữ byte đã chọn và scanner mã độc đã duyệt.
- Provider AI thật (DEC06, HUMAN): WO06-02 chỉ có cổng với provider mặc định tắt. WO06-04 chỉ có chống lỗi và ngân sách trong bộ nhớ, kiểm bằng nhà cung cấp giả. Chưa gọi model, chưa đo độ trễ, timeout hay độ chính xác trên trường quan trọng.
- Danh sách trường quan trọng (WO06-03): đội phát triển chọn ngày mua, số tiền, tiền tệ và serial. Cần chủ dự án xác nhận.

## Việc kế tiếp
- Vòng kế tiếp (khoảng 16:28 UTC): đầu vòng kiểm CI của `3c09cf7` và commit checkpoint. Sau đó `decide` đề xuất WO06-05: "Dịch vụ xác nhận trường: field_confirmations append-only với actor, thời gian, giá trị cũ và mới" (phụ thuộc WO06-04, acceptance T14, P0). Task này dự kiến có migration mới, kiểm theo quy tắc 8 của `01_LOOP_PROTOCOL.md`.

## Kết quả kiểm thử tại `3c09cf7`
- `npm run verify` exit 0 với `TEST_DATABASE_URL` trỏ tới `aftervia_test` (PostgreSQL 16.15).
- Bundle 69/69. Quét bí mật 116 tệp. Vitest 163/163 trong 21 tệp. Kiểm thử vòng lặp 13/13. Báo cáo JSON của Vitest 163/163, mã thoát 0.
- Ma trận: PASS 16 (T03, T04, T05, T06, T09, T10, T11, T12, T13, T14, T15, T16, T22, T37, T38, T45), NOT_RUN 30, FAIL 0. Các mục AI đều PASS với mức phủ PARTIAL và được kiểm bằng provider giả, không phải mô hình thật. T33 vẫn NOT_RUN.
- CI: `verify` run #16 xanh trên `b13cab3`. `3c09cf7` và commit checkpoint chưa kiểm trong lượt này; lượt kế tiếp kiểm ngay đầu vòng.

## Lỗi trong lượt và cách khắc phục
- Báo cáo JSON của Vitest chạy thiếu `TEST_DATABASE_URL` làm `from-report` đưa T03, T04, T05, T10, T38 về NOT_RUN. Đã chạy lại báo cáo JSON với `TEST_DATABASE_URL` trong cùng lệnh, rồi `from-report`; các dòng PASS được khôi phục. Prompt của các vòng tiếp theo có quy tắc này.

## Bảo mật
- HawkScan (DAST): **BLOCKED**. Không chạy vì `HAWK_API_KEY` chưa đặt và chưa có máy chủ HTTP đang chạy. Hook gợi ý quét sau commit `3c09cf7`; đã ghi nhận nhưng không đủ điều kiện.
- Các module chờ reviewer độc lập: chữ ký tệp và quarantine (WO05-02), hoàn tất idempotent (WO05-03), kiểm đầu ra trích xuất (WO06-01), cổng AI (WO06-02), cổng xác nhận và hành động (WO06-03), chống lỗi và ngân sách AI (WO06-04). Không tự gọi là đã duyệt.
- CSP và header bảo mật của landing: chờ reviewer độc lập.

## Blocker (phân loại)
- Đăng nhập thật: cần nhà cung cấp danh tính và Supabase project (DEC03). **HUMAN_REQUIRED**.
- Lưu byte tệp thật: cần chọn kho đối tượng riêng tư (DEC06). **HUMAN_REQUIRED**.
- Scanner mã độc cho upload thật: cần scanner đã duyệt (INFRA). **BLOCKED** cho upload thật.
- Provider AI thật và dữ liệu gửi đi: cần duyệt vendor và quyền riêng tư (DEC06). **HUMAN_REQUIRED**.
- Danh sách trường quan trọng: cần chủ dự án xác nhận. **HUMAN_REQUIRED**.
- Ngân sách và quota thật: chưa có giới hạn đã duyệt (D7); ngân sách của WO06-04 chưa lưu DB và chưa gắn owner. **HUMAN_REQUIRED**.
- Quyền Cloudflare Pages và DNS `iai.one` (WEB-02): **HUMAN_REQUIRED**.
- DAST (HawkScan): **BLOCKED**.
- Web và mobile đầy đủ (WO10): chưa bắt đầu. Bộ nhận diện trong `docs/design/BRAND_TOKENS.md` là chuẩn cho WO10.
- Bộ biểu tượng ứng dụng và SVG gốc của logo: **HUMAN_REQUIRED** (designer).
- Thiết bị thật, luật sư, pilot với khách, reviewer bảo mật độc lập: **HUMAN_REQUIRED**.

## Ngân sách và quota
- Chưa đo được. Không dùng dịch vụ trả phí. Không đặt extra usage. Chưa có giới hạn đã duyệt (D7).
- Vòng lặp: 18/60 đã dùng (sau WO06-04).

## Ranh giới đã tuân thủ
- Không force-push, không rebase, không merge, không push `main`, không tạo PR mới.
- Không dùng dữ liệu thật, không production, không thanh toán live, không tài khoản dịch vụ mới, không mua tên miền, không đổi DNS.
- Không gọi model AI và không đưa khóa vào repo.
- Font Inter được tự host kèm giấy phép; không tải từ CDN.
- Không đưa tên model vào commit hoặc tài liệu.

## Ghi chú vận hành
- Lượt 16:20 UTC: WO06-04, theo giao thức, một task. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1620Z.md`.
- Lượt 16:14 UTC: WO06-03. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1614Z.md`.
- Lượt 16:07 UTC: WO06-02. Lượt 16:01 UTC: WO06-01. Lượt 15:53 UTC: WO05-03. Lượt 15:38 UTC: WO05-02. Lượt 15:08 UTC: WEB-01.
