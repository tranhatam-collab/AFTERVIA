# Checkpoint tự chủ AFTERVIA

- Cập nhật: 31/10/2026, sau lượt WO09-02 (lượt kích hoạt 17:46:11 UTC; ghi lúc khoảng 17:52 UTC).
- Trạng thái: **CONTINUE**. Chưa có `ENGINEERING_ACCEPTED`.
- Nguồn mệnh lệnh: gói `docs/spec/AUTONOMY_V1/` (đã kiểm checksum); chỉ thị của chủ dự án trong phiên ngày 31/10 (Cloudflare Pages là hosting ưu tiên; landing VI/EN; không form, không email hiển thị, không thanh toán; công khai chỉ khi có quyền và nội dung đã duyệt; quyền qua biến môi trường); ảnh bảng nhận diện do chủ dự án gửi cùng lệnh "Áp dụng".

## Repo và nhánh
- Repo `tranhatam-collab/AFTERVIA`. Nhánh làm việc `ccr-4544c9f7-b1t50m` (writer duy nhất).
- Commit code mới nhất của task: `0dc0175` (WO09-02). Trước đó: `05b1e27` (checkpoint WO09-01), `22ff4b3` (WO09-01), `387e6d8` (checkpoint WO08-03), `dd363d0` (WO08-03), `d896638` (checkpoint WO08-02), `6f1282c` (WO08-02), `cc9b231` (checkpoint WO08-01), `19a9dab` (WO08-01), `173f5a0` (checkpoint WO07-04), `4b5db22` (WO07-04), `7345f6b` (checkpoint WO07-03), `d4ed4f6` (WO07-03), `ee5baaf`, `22443ea` (WO07-02), `ede043d`, `c7f5e6f` (WO06-05), `f93fd2a`, `27bfa61`, `3c09cf7` (WO06-04), `b13cab3`, `1470146` (WO06-03), `081c2cd`, `8160beb`, `c477d0e`, `64eea75`.
- Commit checkpoint này nằm ngay sau `0dc0175` (xem `git log`).
- `main` là commit gốc rỗng `b809781`, không chứa ứng dụng.
- PR #1: nháp, base `main`, chưa merge, chưa đổi sang sẵn sàng review, chưa có reviewer.

## Scheduler (một writer)
- Chuỗi `send_later` là writer duy nhất. Trigger vừa chạy: `trig_018kBgkebaUdfcHdAt98Jw3R` (17:46:11 UTC), đã xong.
- Lượt kế tiếp: `send_later` đặt ngay sau commit này, 2 phút, theo Bước 7 của `01_LOOP_PROTOCOL.md`. Lượt đó ghi trigger của mình trong receipt.
- Chưa tạo Cloud Routine. Không bật writer thứ hai (D1, D12).

## Backlog (DONE, có bằng chứng)
WO02-01, WO03-01, WO03-02, WO03-03, WO03-04, WO04-01, WO04-02, WO04-03, WO04-04, WO05-01, WO05-02, WO05-03, WO06-01, WO06-02, WO06-03, WO06-04, WO06-05, WO07-01, WO07-02, WO07-03, WO07-04, WO08-01, WO08-02, WO08-03, WO09-01, WO09-02, WEB-01.

## Bị chặn và chờ người
- WEB-02 (INFRA, BLOCKED): đưa landing lên `aftervia.iai.one`. Chờ quyền Cloudflare Pages qua biến môi trường (D15) và xác nhận DNS của `iai.one` (D14).
- HUM-WEB-03 (HUMAN): chủ dự án và luật sư duyệt nội dung công khai, miễn trừ và tên AFTERVIA (D13). Tên và tagline chưa kiểm tra nhãn hiệu.
- Đăng nhập thật (DEC03, D3): cần chọn nhà cung cấp danh tính và Supabase project. Hiện chỉ có đăng nhập giả lập cục bộ, được ghi rõ là giả lập.
- Upload thật (DEC06 và INFRA): WO05-03 hoàn tất phần idempotent và cổng trạng thái. Upload thật vẫn BLOCKED cho đến khi có kho lưu trữ byte đã chọn và scanner mã độc đã duyệt.
- Luồng tải byte tài liệu (DEC06): WO09-02 chỉ quyết định và ghi audit. Chưa có bộ lưu byte, nên chưa có stream thật và chưa có khóa lưu trữ.
- Provider AI thật (DEC06, HUMAN): WO06-02 chỉ có cổng với provider mặc định tắt. WO06-04 chỉ có chống lỗi và ngân sách trong bộ nhớ, kiểm bằng nhà cung cấp giả. Chưa gọi model, chưa đo độ trễ, timeout hay độ chính xác trên trường quan trọng.
- Danh sách trường quan trọng (WO06-03): đội phát triển chọn ngày mua, số tiền, tiền tệ và serial. Cần chủ dự án xác nhận.
- Chính sách giờ đặc biệt của lịch nhắc (WO07-02): giờ không tồn tại dời tới sau khoảng trống; giờ lặp lại lấy lần đầu. Cần chủ dự án duyệt.
- Quyền push thật trên thiết bị (DEV-01, DEVICE, WAITING_HUMAN): cần thiết bị thật để kiểm T21 đầy đủ. WO07-03 chỉ kiểm phần máy chủ; dòng T21 là PASS ở mức PARTIAL.
- Bản dịch VI/EN (WO07-04): cần người bản ngữ rà soát. Landing vẫn giữ chuỗi riêng cho đến WO10-01.
- Danh sách outcome đóng case và chính sách mở lại sau khi đóng (WO08-01): cần chủ dự án xác nhận. Đề xuất hiện tại: `repaired`, `replaced`, `refunded`, `credited`, `no_remedy`; mở lại chỉ từ `resolved`.
- Bằng chứng chưa quét và lý do hiển thị cho hai bên (WO08-02): cần chủ dự án xác nhận chính sách trước khi chia sẻ thật. Tổ chức SUSPENDED cũng cần quyết định.
- Phạm vi inbox và quyền phân công (WO08-03): cần chủ dự án xác nhận. Đề xuất hiện tại: inbox theo toàn tổ chức; chỉ owner và manager phân công.
- Hạn chia sẻ (WO09-01): tối đa 30 ngày; chỉ vai trò partner; người tham gia thấy timeline; lý do từ chối đầy đủ chỉ cho người liên quan. Cần chủ dự án xác nhận trước khi chia sẻ thật.
- Quyền đọc của chủ sở hữu không phụ thuộc trạng thái case (WO09-02): cần chủ dự án xác nhận.

## Việc kế tiếp
- Vòng kế tiếp (2 phút sau commit này): đầu vòng kiểm CI của commit mới nhất trên nhánh. Sau đó `decide` đề xuất WO09-03: "HTTP API cho 13 thao tác của OpenAPI và kiểm hợp đồng (operationId khớp, lỗi không lộ đối tượng)" (phụ thuộc WO09-02; acceptance T04, T05; P0). Đọc `docs/spec` về OpenAPI và danh sách 13 thao tác trước khi thiết kế.

## Kết quả kiểm thử tại `0dc0175`
- `npm run verify` exit 0 với `TEST_DATABASE_URL` trỏ tới `aftervia_test` (PostgreSQL 16.15), trên cùng mã đã commit.
- Bundle 69/69. Quét bí mật 156 tệp (5 luật). Vitest 228/228 trong 31 tệp. Kiểm thử vòng lặp 13/13. Báo cáo JSON của Vitest 228/228, mã thoát 0.
- Ma trận: PASS 24 (T03, T04, T05, T06, T07, T08, T09, T10, T11, T12, T13, T14, T15, T16, T17, T18, T19, T20, T21, T22, T32, T37, T38, T45), NOT_RUN 22, FAIL 0. T07 và T08 PASS ở mức PARTIAL: quyết định và audit; luồng tải byte chờ DEC06. T38 PASS: không có đường đọc theo URL và không có cột URL. T33 vẫn NOT_RUN.
- CI: `05b1e27` có `verify` success (run 41225884643). `0dc0175` và commit checkpoint chưa kiểm trong lượt này; lượt kế tiếp kiểm ngay đầu vòng.

## Lỗi trong lượt và cách khắc phục
- Lỗ hổng: hàm đọc tài liệu không kiểm trạng thái quét. Tài liệu `QUARANTINED` vẫn được phục vụ nếu grant còn hiệu lực. Phát hiện khi rà lại sau khi kiểm thử đã pass. Đã sửa bằng migration `0012` (thay hàm, cùng chữ ký), thêm kiểm thử `T07`, và ghi trong evidence. Migration `0011` không sửa vì đã áp dụng.

## Bảo mật
- HawkScan (DAST): **BLOCKED**. Không chạy vì `HAWK_API_KEY` chưa đặt và chưa có máy chủ HTTP đang chạy. Hook gợi ý quét sau mỗi commit, kể cả `0dc0175`; đã ghi nhận nhưng không đủ điều kiện.
- Các module chờ reviewer độc lập: chữ ký tệp và quarantine (WO05-02), hoàn tất idempotent (WO05-03), kiểm đầu ra trích xuất (WO06-01), cổng AI (WO06-02), cổng xác nhận và hành động (WO06-03), chống lỗi và ngân sách AI (WO06-04), xác nhận trường chỉ thêm (WO06-05), lịch nhắc và hộp thư (WO07-03), máy trạng thái case (WO08-01), bảng case, RLS, hàm `SECURITY DEFINER` và khóa đồng thời (WO08-02), inbox và phân công Desk (WO08-03), người tham gia và grant tài liệu (WO09-01), proxy đọc tài liệu và ghi audit (WO09-02). Không tự gọi là đã duyệt.
- WO06-05 chưa kiểm quyền sở hữu extraction vì chưa có bảng extraction. Cần sửa ở task extraction và reviewer xác nhận.
- WO07-02 chưa kiểm quyền của người xác nhận múi giờ trên món đồ. WO07-03 kiểm quyền chủ sở hữu khi tạo lịch nhắc; reviewer cần xác nhận.
- WO08-02: bằng chứng `SCANNER_UNAVAILABLE` chỉ là tham chiếu, chưa có chia sẻ tài liệu cho merchant. Tổ chức SUSPENDED chưa được chặn khi chuyển trạng thái.
- WO08-03: khi thành viên bị thu hồi, case đang gán vẫn giữ người được gán (chưa có chính sách gán lại). Từ chối do không thuộc tổ chức không được ghi audit (lựa chọn có chủ đích, cần xác nhận).
- WO09-01 và WO09-02: đường đọc chưa có byte thật. Mọi lần đọc phải đi qua `read_case_document` và chế độ `view` phải được thực thi ở tầng HTTP. Bản đã tải hợp lệ không thu hồi được; người dùng phải được thông báo rõ.
- CSP và header bảo mật của landing: chờ reviewer độc lập.

## Blocker (phân loại)
- Đăng nhập thật: cần nhà cung cấp danh tính và Supabase project (DEC03). **HUMAN_REQUIRED**.
- Lưu byte tệp thật: cần chọn kho đối tượng riêng tư (DEC06). **HUMAN_REQUIRED**. Chặn luồng tải byte thật.
- Scanner mã độc cho upload thật: cần scanner đã duyệt (INFRA). **BLOCKED** cho upload thật.
- Provider AI thật và dữ liệu gửi đi: cần duyệt vendor và quyền riêng tư (DEC06). **HUMAN_REQUIRED**.
- Danh sách trường quan trọng: cần chủ dự án xác nhận. **HUMAN_REQUIRED**.
- Chính sách giờ đặc biệt của lịch nhắc: cần chủ dự án duyệt. **HUMAN_REQUIRED**.
- Danh sách outcome đóng case và chính sách mở lại sau khi đóng: cần chủ dự án xác nhận. **HUMAN_REQUIRED**.
- Bằng chứng chưa quét, lý do hiển thị cho hai bên và tổ chức SUSPENDED: cần chủ dự án quyết định. **HUMAN_REQUIRED**.
- Phạm vi inbox và quyền phân công: cần chủ dự án quyết định. **HUMAN_REQUIRED**.
- Hạn chia sẻ, vai trò partner, quyền xem timeline và lý do từ chối: cần chủ dự án quyết định. **HUMAN_REQUIRED**.
- Quyền đọc của chủ sở hữu không phụ thuộc trạng thái case: cần chủ dự án quyết định. **HUMAN_REQUIRED**.
- Quyền push thật trên thiết bị (DEV-01): cần thiết bị thật. **DEVICE / WAITING_HUMAN**.
- Rà soát bản dịch VI/EN: cần người bản ngữ. **HUMAN_REQUIRED**.
- Ngân sách và quota thật: chưa có giới hạn đã duyệt (D7); ngân sách của WO06-04 chưa lưu DB và chưa gắn owner. **HUMAN_REQUIRED**.
- Quyền Cloudflare Pages và DNS `iai.one` (WEB-02): **HUMAN_REQUIRED**.
- DAST (HawkScan): **BLOCKED**.
- Web và mobile đầy đủ (WO10): chưa bắt đầu. Bộ nhận diện trong `docs/design/BRAND_TOKENS.md` là chuẩn cho WO10. Bộ văn bản VI/EN của WO07-04 là nguồn chuỗi cho WO10.
- Bộ biểu tượng ứng dụng và SVG gốc của logo: **HUMAN_REQUIRED** (designer).
- Thiết bị thật, luật sư, pilot với khách, reviewer bảo mật độc lập: **HUMAN_REQUIRED**.

## Ngân sách và quota
- Chưa đo được. Không dùng dịch vụ trả phí. Không đặt extra usage. Chưa có giới hạn đã duyệt (D7).
- Vòng lặp: 27/60 đã dùng (sau WO09-02).

## Ranh giới đã tuân thủ
- Không force-push, không rebase, không merge, không push `main`, không tạo PR mới.
- Không dùng dữ liệu thật, không production, không thanh toán live, không tài khoản dịch vụ mới, không mua tên miền, không đổi DNS.
- Không gọi model AI, không gửi push thật, không tải byte thật, không đưa khóa vào repo. `TEST_DATABASE_URL` lấy từ cấu hình CI, không in ra màn hình.
- Font Inter được tự host kèm giấy phép; không tải từ CDN.
- Không đưa tên model vào commit hoặc tài liệu.

## Ghi chú vận hành
- Lượt 17:46 UTC: WO09-02. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1746Z.md`.
- Lượt 17:37 UTC: WO09-01. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1737Z.md`.
- Lượt 17:30 UTC: WO08-03. Lượt 17:20 UTC: WO08-02. Lượt 17:11 UTC: WO08-01. Lượt 17:03 UTC: WO07-04. Lượt 16:53 UTC: WO07-03. Lượt 16:43 UTC: WO07-02. Lượt 16:31 UTC: WO06-05. Lượt 16:20 UTC: WO06-04. Lượt 16:14 UTC: WO06-03. Lượt 16:07 UTC: WO06-02. Lượt 16:01 UTC: WO06-01. Lượt 15:53 UTC: WO05-03. Lượt 15:38 UTC: WO05-02. Lượt 15:08 UTC: WEB-01.
