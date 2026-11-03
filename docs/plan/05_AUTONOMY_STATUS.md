# Checkpoint tự chủ AFTERVIA

- Cập nhật: 03/11/2026, sau lượt WO10-03b (lượt theo lịch 02:16 UTC; ghi trong cùng commit của lượt).
- Trạng thái: **CONTINUE** (vòng lặp liên tục theo yêu cầu của chủ dự án ngày 03/11; làm tối đa việc tự động, rồi bàn giao dev local). Chưa có `ENGINEERING_ACCEPTED`.
- Nguồn mệnh lệnh: gói `docs/spec/AUTONOMY_V1/` (đã kiểm checksum); chỉ thị của chủ dự án trong phiên ngày 31/10 (Cloudflare Pages là hosting ưu tiên; landing VI/EN; không form, không email hiển thị, không thanh toán; công khai chỉ khi có quyền và nội dung đã duyệt; quyền qua biến môi trường); ảnh bảng nhận diện do chủ dự án gửi cùng lệnh "Áp dụng".

## Repo và nhánh
- Repo `tranhatam-collab/AFTERVIA`. Nhánh làm việc `ccr-4544c9f7-b1t50m` (writer duy nhất).
- Commit mới nhất của task: lượt WO10-03b (xem `git log`). Trước đó: `426ac0f` (WO10-03a), `c578bd2` (WO11-02c), `ae3ca6d` (WO11-02b), `f8e9fd7` (WO11-02a), `2a1595a` (tách backlog, thêm WO26-01). Cũ hơn: lượt WO19-01 (kế hoạch pilot DRAFT, sổ đo và SLA dự thảo; DONE ở mức kế hoạch). Ngay trước đó: lượt WO18-01 (bản nháp pháp lý và checklist DRAFT; BLOCKED ở T46). Trước đó: lượt WO16-04 (cổng country pack, T41). Trước đó: lượt WO11-02 (`0014`, T25/T26, BLOCKED), `24ab351` (WO10-03, BLOCKED), `e1906bc` (WO11-01), `219559c` (đính chính CI WO10-02), `d16538d` (checkpoint WO10-02), `9351ca1` (WO10-02), `5b8b870` (checkpoint WO10-01), `0bbd654` (WO10-01), `0c9bf30` (checkpoint WO09-03), `08fb6c0` (WO09-03), `31a8ab0` (checkpoint WO09-02), `0dc0175` (WO09-02), `05b1e27` (checkpoint WO09-01), `22ff4b3` (WO09-01), `387e6d8` (checkpoint WO08-03), `dd363d0` (WO08-03), `d896638` (checkpoint WO08-02), `6f1282c` (WO08-02), `cc9b231` (checkpoint WO08-01), `19a9dab` (WO08-01), `173f5a0` (checkpoint WO07-04), `4b5db22` (WO07-04), `7345f6b` (checkpoint WO07-03), `d4ed4f6` (WO07-03), `ee5baaf`, `22443ea` (WO07-02), `ede043d`, `c7f5e6f` (WO06-05), `f93fd2a`, `27bfa61`, `3c09cf7` (WO06-04), `b13cab3`, `1470146` (WO06-03), `081c2cd`, `8160beb`, `c477d0e`, `64eea75`.
- Commit của lượt WO16-03 là `5d64678`; lượt WO16-04 là `c003703`; lượt WO18-01 là `bd9be9c`; lượt WO19-01 nằm ngay sau (xem `git log`).
- `main` là commit gốc rỗng `b809781`, không chứa ứng dụng.
- PR #1: nháp, base `main`, chưa merge, chưa đổi sang sẵn sàng review, chưa có reviewer.

## Scheduler (một writer)
- Chuỗi `send_later` là writer duy nhất. Lượt WO10-03b chạy theo lịch 02:16 UTC. Sau khi ghi xong lượt này, nếu `decide` trả về START hoặc RESUME thì lên lịch vòng kế tiếp bằng `send_later`. Check-in PR 1 của 3 vẫn không đăng ký check-in 2 của 3; chờ chủ dự án xác nhận.
- Lượt kế tiếp: WO10-03c (`decide` = START, 03/11; xem Việc kế tiếp).
- Chưa tạo Cloud Routine. Không bật writer thứ hai (D1, D12).

## Backlog (DONE, có bằng chứng)
WO02-01, WO03-01, WO03-02, WO03-03, WO03-04, WO04-01, WO04-02, WO04-03, WO04-04, WO05-01, WO05-02, WO05-03, WO06-01, WO06-02, WO06-03, WO06-04, WO06-05, WO07-01, WO07-02, WO07-03, WO07-04, WO08-01, WO08-02, WO08-03, WO09-01, WO09-02, WO09-03, WO10-01, WO10-02, WO11-01, WO13-01, WO14-01, WO15-01, WO15-02, WO16-02, WO16-03, WO16-04, WO19-01, WO23-01, WO24-01, WO25-01, WO11-02a, WO11-02b, WO11-02c, WO10-03a, WO10-03b, WEB-01.

## Bị chặn và chờ người
- WO18-01 (BLOCKED ở T46): bản nháp và checklist ở mức DRAFT đã xong trong `docs/legal/`. T46 cần tài khoản store thật; DEC09 đang NOT_AUTHORIZED. Bằng chứng: `docs/plan/evidence/WO18-01.md`. HUM-WO18-02 (luật sư và IP) chờ WO18-01.
- WO11-02 (BLOCKED; tách 03/11 thành a, b, c (DONE: `docs/plan/evidence/WO11-02a.md`, `WO11-02b.md`, `WO11-02c.md`) và d..g (HUMAN). Lát cắt 1 xong: thu hồi quyền, tombstone chỉ thêm, áp lại sau khôi phục; T25 và T26 PASS ở mức PARTIAL, không phải nghiệm thu). Còn chờ: xóa dữ liệu theo chính sách (HUMAN); cơ chế cho bảng chỉ thêm; xác minh danh tính và thu hồi phiên (DEC03); tombstone nằm ngoài backup (WO16-01); quyền bên nhận khi khách xóa; thành viên tổ chức; thu hồi dòng gia đình khi xóa tài khoản (cổng đọc của WO13-01 đã chặn chia sẻ, phần thu hồi dòng còn chờ). Bằng chứng: `docs/plan/evidence/WO11-02.md`. WO11-03, WO12-01 và WO16-01 chờ WO11-02.
- WO10-03 (BLOCKED, đã tách 03/11): WO10-03a DONE (HTTP `createExport` và `getJob`, T24 giữ PASS, độ phủ PARTIAL; `docs/plan/evidence/WO10-03a.md`). WO10-03b DONE ở mức lớp yêu cầu HTTP của Desk (T38; `docs/plan/evidence/WO10-03b.md`); còn thiếu điều khiển giao diện, là WO10-03e (AUTO, mới). WO10-03c (Desk: chia tài liệu và nút xuất; T38) là AUTO, đang chờ. WO10-03d (HUMAN, DEC06): kho byte và luồng hoàn tất tải lên. HUM-WO10-03a (HUMAN): cách trả link tải gói. Bằng chứng: `docs/plan/evidence/WO10-03.md`. WO17-01 và DEV-02 phụ thuộc WO10-03 và đang chờ.
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
- Hợp đồng HTTP (WO09-03): `Transition` không có outcome, nên `resolved` và `closed` không đi được qua HTTP. Danh sách mã lỗi, giới hạn mô tả (500 theo DB, 4000 theo hợp đồng) và cách gắn `shared_document_ids` (bằng chứng, không cấp grant) cần chủ dự án xác nhận. `UploadRequest` của hợp đồng (`mime`, `sha256`) chưa khớp route legacy (`declared_mime`).
- Web Desk (WO10-01): font Inter chưa tự host trong Desk; CSP và header bảo mật của Desk chưa có (cần trước khi triển khai); đăng nhập thật chưa có (DEC03); bản dịch `common.retry` cần người bản ngữ rà soát.
- Mobile shell (WO10-02, T23 DEVICE): chưa chạy trên thiết bị; T23 vẫn NOT_RUN đến khi DEV-01 có bằng chứng mất mạng thật. Chưa có đăng nhập, nên bản nháp dừng ở "chờ đồng bộ". Máy chủ chưa khử trùng `POST /v1/items` theo `Idempotency-Key`: gửi lại sau "chưa xác nhận" có thể tạo bản trùng, phải sửa trước khi bật đồng bộ thật. Bản nháp lưu bằng AsyncStorage, chưa mã hóa, chưa kiểm trên thiết bị.
- npm audit (sau WO10-02): 31 cảnh báo (5 cao) trong cây Expo/React Native (`query-string`, `decode-uri-component`, `image-size`, `postcss`, `expo-router`). Gợi ý của npm là nhảy phiên bản chính (Expo 58, RN 0.88), không dùng được trong SDK 54. Cần quyết định trước khi build phát hành (WO17).
- **CI đỏ tại `9351ca1`** (run 41230732500): bước `Dependency audit (production, high+)` (`npm audit --omit=dev --audit-level=high` trong `ci.yml`) thoát 1; `npm ci` và `npm run verify` đều xanh. Nguyên nhân là 5 cảnh báo cao của cây Expo SDK 54 do WO10-02 thêm vào. Đã báo trên PR #1 kèm bốn lựa chọn cho chủ dự án. Không nới cổng audit. Cùng lỗi ở `d16538d` (run 41230813371); không đăng thêm bình luận vì blocker đã báo.
- Xuất dữ liệu (WO11-01, WO10-03a): gói JSON, CSV và manifest SHA-256 chỉ chứa món đồ của người dùng và tài liệu được grant còn hiệu lực; kiểm phạm vi trong cơ sở dữ liệu; liên kết tạm 24 giờ bằng mã băm. HTTP `createExport` và `getJob` đã có (WO10-03a), nhưng chưa có đường tải gói: đặc tả OpenAPI không có route tải, và mã truy cập không được trả ra (HUM-WO10-03a). Xuất trong lúc chờ xóa chưa có quy tắc (WO11-02d, Q6). Gói hết hạn chưa được dọn dẹp (ảnh hưởng xóa tài khoản, WO11-02); nội dung cá nhân trong gói cần đánh giá riêng tư trước khi dùng dữ liệu thật.

## Việc kế tiếp
- Vòng kế tiếp: WO10-03c (Desk: chia tài liệu và nút xuất gói qua HTTP; T38; `decide` = START, 03/11). Sau đó: WO10-03e (AUTO, điều khiển giao diện của Desk), WO26-01 (AUTO_PREP, hướng dẫn dev local), theo `decide`. Bản đề xuất sáu quyết định của WO11-02 nằm ở `docs/plan/evidence/WO11-02c.md`, đang chờ chủ dự án. Theo yêu cầu của chủ dự án ngày 03/11: vòng lặp liên tục, làm tối đa việc tự động, rồi bàn giao dev local. Đã tách WO11-02 và WO10-03 thành lát kỹ thuật; các quyết định chính sách và kho byte nằm trong backlog dưới dạng việc HUMAN (WO11-02d..g, WO10-03d) và vẫn chặn chuỗi phụ thuộc của chúng. Cổng audit CI vẫn đỏ, chờ quyết định của chủ dự án.

## Kết quả kiểm thử

- Lượt WO10-03b: `npm run verify` exit 0 (typecheck gốc và mobile; bundle 69/69; quét bí mật 272 tệp, 5 luật; Vitest 51 tệp pass và 1 bỏ qua, 382 kiểm thử pass và 1 bỏ qua; test:loop 18/18). JSON: 382 pass, 0 fail, 1 pending, `success=true`, trên 383 kiểm thử. Lệnh riêng: 3 tệp Desk 28/28. Matrix: `from-report` không đổi dòng nào; PASS 33, NOT_RUN 13, FAIL 0. Đột biến: bỏ kiểm tra UUID làm đỏ 2 kiểm thử; đã khôi phục, checksum khớp.

- Lượt WO10-03a: `npm run verify` exit 0 (bundle 69/69; quét bí mật 267 tệp, 5 luật; Vitest 49 tệp pass và 1 tệp bỏ qua, 366 kiểm thử pass và 1 bỏ qua; test:loop 18/18). JSON: 366 pass, 0 fail, 1 pending, `success=true`, trên 367 kiểm thử. Lệnh riêng: `exports-http` và `contract` 22/22. Matrix: `from-report` không đổi dòng nào; PASS 33, NOT_RUN 13, FAIL 0. Đột biến: đọc gói không qua RLS làm đỏ 1 kiểm thử (`expected 200 to be 404`); đã khôi phục file, checksum khớp.

- Lượt WO19-01: `npm run verify` exit 0 (bundle 69/69; quét bí mật 250 tệp, 5 luật; Vitest 352 pass và 1 bỏ qua có chủ đích, trong 46 tệp; test:loop 13/13). JSON 352/352 pass, 0 fail, `success=true`. Matrix: không đổi dòng nào; PASS 33, NOT_RUN 13, FAIL 0. E02 và E03 vẫn NOT_STARTED. Không đổi mã nên không có đột biến.

- Lượt WO18-01: `npm run verify` exit 0 (bundle 69/69; quét bí mật 245 tệp, 5 luật; Vitest 352 pass và 1 bỏ qua có chủ đích, trong 46 tệp; test:loop 13/13). JSON 352/352 pass, 0 fail, `success=true`. Matrix: không đổi dòng nào (T41 PASS ở mức PARTIAL; T46 NOT_RUN); PASS 33, NOT_RUN 13, FAIL 0. Không đổi mã nên không có đột biến.

- Lượt WO16-04: `npm run verify` exit 0 (bundle 69/69; quét bí mật 241 tệp, 5 luật; Vitest 352 pass và 1 bỏ qua có chủ đích, trong 46 tệp). JSON 352/352, `success=true`. Matrix: T41 NOT_RUN → PASS ở mức PARTIAL; PASS 33, NOT_RUN 13, FAIL 0. Đột biến: bỏ kiểm tra cờ, bỏ kiểm tra hết hạn, thêm trường lạ vào pack; mỗi lần làm đỏ đúng một kiểm thử; đã khôi phục file.

- Lượt WO16-03: `npm run verify` exit 0 (bundle 69/69; quét bí mật 235 tệp, 5 luật; Vitest 347 pass và 1 bỏ qua có chủ đích, trong 44 tệp). JSON 347/347, `success=true`. Matrix: không đổi dòng nào (T37 đã PASS từ WO03-01 và WO03-04); PASS 32, NOT_RUN 14, FAIL 0. Đột biến: bỏ danh sách trường cho phép (2 kiểm thử đỏ), bỏ mẫu Bearer (1 kiểm thử đỏ); đã khôi phục file.

- Lượt WO16-02: `npm run verify` exit 0 (bundle 69/69; quét bí mật 228 tệp, 5 luật; Vitest 341 pass và 1 bỏ qua có chủ đích, trong 42 tệp). JSON 341/341, `success=true`. Matrix: T42 NOT_RUN → PASS ở mức PARTIAL; PASS 32, NOT_RUN 14, FAIL 0. Đột biến: bỏ kiểm tra duyệt, bỏ kiểm tra hết hạn, bỏ kiểm tra cờ sharing; mỗi lần làm đỏ đúng các kiểm thử tương ứng; đã khôi phục file.

- Lượt WO15-02: `npm run verify` exit 0 (bundle 69/69; quét bí mật 223 tệp, 5 luật; Vitest 332 pass và 1 bỏ qua có chủ đích, trong 41 tệp). Lần chạy có cờ đo: 333/333 pass. Matrix: T40 NOT_RUN → PASS ở mức PARTIAL; PASS 31, NOT_RUN 15, FAIL 0. Đo cục bộ 300 yêu cầu đọc một món, đồng thời 5, loopback: p95 13,63 ms, 0 lỗi (không phải tải pilot, không phải SLA).

- Lượt WO15-01: `npm run verify` exit 0 (bundle 69/69; quét bí mật 216 tệp, 5 luật; typecheck gồm tests; Vitest 330/330 trong 39 tệp). JSON 330/330, `success=true`. Matrix: T33 NOT_RUN → PASS ở mức PARTIAL; PASS 30, NOT_RUN 16, FAIL 0. Đối chứng dương: axe báo đúng ba vi phạm trên HTML hỏng có chủ đích.

- Lượt WO14-01: `npm run verify` exit 0 (bundle 69/69; quét bí mật 213 tệp, 5 luật; Vitest 307/307 trong 38 tệp). JSON 307/307, `success=true`. Matrix: T43 NOT_RUN → PASS ở mức PARTIAL; PASS 29, NOT_RUN 17, FAIL 0. Đột biến: `resolved` đếm sự kiện thay vì case phân biệt làm đỏ 3 kiểm thử; đã khôi phục file.

- Lượt WO13-01: `npm run verify` exit 0 (bundle 69/69; quét bí mật 209 tệp, 5 luật; Vitest 303/303 trong 37 tệp). JSON 303/303, `success=true`. Matrix: T31 NOT_RUN → PASS ở mức PARTIAL; PASS 28, NOT_RUN 18, FAIL 0. Đột biến: bỏ trạng thái thu hồi của chia sẻ, và bỏ cổng tombstone; mỗi lần làm đỏ đúng 2 kiểm thử; đã khôi phục file.

- Lượt WO11-02: `npm run verify` exit 0 với `TEST_DATABASE_URL` từ cấu hình CI (bundle 69/69; quét bí mật 206 tệp, 5 luật; Vitest 294/294 trong 36 tệp). JSON 294/294, `success=true`. Matrix: T25 và T26 NOT_RUN → PASS ở mức PARTIAL; PASS 27, NOT_RUN 19, FAIL 0. Kiểm đột biến: bỏ nhánh thu hồi theo người cấp làm đỏ đúng một kiểm thử; đã khôi phục file.

- Lượt WO10-03 (trên cây làm việc, trước commit): `npm run verify` exit 0 với `TEST_DATABASE_URL` nạp từ `.github/workflows/ci.yml` (không in giá trị). Bundle 69/69; quét bí mật 202 tệp (5 luật); Vitest 286/286 trong 35 tệp; Vitest JSON 286/286, `success=true`; `from-report` không đổi dòng nào.
- Tại `e1906bc` (lượt WO11-01):
- `npm run verify` exit 0 với `TEST_DATABASE_URL` trỏ tới `aftervia_test` (PostgreSQL 16.15), trên cùng mã đã commit.
- Bundle 69/69. Quét bí mật 199 tệp (5 luật). Vitest 286/286 trong 35 tệp. Kiểm thử vòng lặp 13/13. Báo cáo JSON của Vitest 286/286, mã thoát 0. T24: 7 kiểm thử pass (WO11-01). T23: 0 kiểm thử mang tiền tố (đúng chủ ý, DEVICE). T32 (10 kiểm thử) và T38 (9) đều pass. Typecheck gồm `apps/mobile`: exit 0. Kiểm trình duyệt ngoài repo cho Desk: 30/30.
- Ma trận: PASS 25 (T03, T04, T05, T06, T07, T08, T09, T10, T11, T12, T13, T14, T15, T16, T17, T18, T19, T20, T21, T22, T32, T37, T38, T45, T24 từ WO11-01), NOT_RUN 21, FAIL 0. T07 và T08 PASS ở mức PARTIAL: quyết định và audit; luồng tải byte chờ DEC06. T38 PASS: không có đường đọc theo URL và không có cột URL. T33 vẫn NOT_RUN.
- CI: `5b8b870` có `verify` success (run 41229554503). `9351ca1`, `d16538d`: `npm ci` ✓, `npm run verify` ✓, bước `Dependency audit (production, high+)` ✗ (runs 41230732500 và 41230813371). `e1906bc` chưa có kết quả CI khi ghi. Lỗi do phụ thuộc Expo của WO10-02; xem mục "CI đỏ" trong phần bảo mật. Lượt kế tiếp kiểm lại đầu vòng.

## Lỗi trong lượt và cách khắc phục
- WO13-01: chia sẻ gia đình của chủ đã yêu cầu xóa vẫn đọc được (lỗ hổng do WO11-02 để lại, phát hiện khi rà lại). Đã sửa trong WO13-01 bằng cổng tombstone ở tầng đọc và ghi, có kiểm thử đột biến. Chưa thu hồi dòng gia đình khi xóa tài khoản: việc này thuộc WO11-02 khi được mở lại.
- WO11-02: chú thích migration gọi `reminders` là bảng chỉ thêm (sai). Đã sửa theo trigger thật ở 0007, 0008 và 0013 trước commit.
- WO11-02 (thiết kế): tombstone chỉ có trong bảng được khôi phục. Backup cũ hơn yêu cầu xóa sẽ không có tombstone. Ghi là giới hạn; cần quyết định ở WO16-01.
- WO10-03: `start` chạy trước khi tách task (quy tắc 7), vì công cụ không có thao tác tách. Ghi nhận là lệch quy trình; task đã được chặn có bằng chứng.
- Verify đầu lượt chạy trong shell không có `TEST_DATABASE_URL`: exit 1, 20 tệp kiểm thử DB đỏ ngay khi báo thiếu biến, trước khi kết nối. Đã nạp biến từ cấu hình CI trong cùng lệnh và chạy lại: exit 0.
- Lỗ hổng: hàm đọc tài liệu không kiểm trạng thái quét. Tài liệu `QUARANTINED` vẫn được phục vụ nếu grant còn hiệu lực. Phát hiện khi rà lại sau khi kiểm thử đã pass. Đã sửa bằng migration `0012` (thay hàm, cùng chữ ký), thêm kiểm thử `T07`, và ghi trong evidence. Migration `0011` không sửa vì đã áp dụng.

## Bảo mật
- HawkScan (DAST): **BLOCKED**. Không chạy vì `HAWK_API_KEY` chưa đặt và chưa có máy chủ HTTP đang chạy. Hook gợi ý quét sau mỗi commit, kể cả `0dc0175`, `08fb6c0`, `0bbd654` và `9351ca1`; đã ghi nhận nhưng không đủ điều kiện.
- Các module chờ reviewer độc lập: chữ ký tệp và quarantine (WO05-02), hoàn tất idempotent (WO05-03), kiểm đầu ra trích xuất (WO06-01), cổng AI (WO06-02), cổng xác nhận và hành động (WO06-03), chống lỗi và ngân sách AI (WO06-04), xác nhận trường chỉ thêm (WO06-05), lịch nhắc và hộp thư (WO07-03), máy trạng thái case (WO08-01), bảng case, RLS, hàm `SECURITY DEFINER` và khóa đồng thời (WO08-02), inbox và phân công Desk (WO08-03), người tham gia và grant tài liệu (WO09-01), proxy đọc tài liệu và ghi audit (WO09-02), HTTP cho 13 thao tác và lỗi không lộ đối tượng (WO09-03); lớp thoát nội dung và biên giới mạng của Desk (WO10-01); thu hồi quyền và tombstone xóa tài khoản (WO11-02); hàm chia sẻ gia đình và cổng tombstone (WO13-01); hàm KPI hậu mãi (WO14-01); kiểm truy cập tự động và `eval` nạp axe trong kiểm thử (WO15-01); hàm break-glass và trigger cờ sharing (WO16-02); ghi nhật ký có lọc và phân mức sự cố (WO16-03); HTTP tạo và đọc gói xuất, cùng phạm vi gói (WO10-03a); lớp yêu cầu của Desk và chặn XSS/SSRF (WO10-03b). Không tự gọi là đã duyệt.
- WO06-05 chưa kiểm quyền sở hữu extraction vì chưa có bảng extraction. Cần sửa ở task extraction và reviewer xác nhận.
- WO07-02 chưa kiểm quyền của người xác nhận múi giờ trên món đồ. WO07-03 kiểm quyền chủ sở hữu khi tạo lịch nhắc; reviewer cần xác nhận.
- WO08-02: bằng chứng `SCANNER_UNAVAILABLE` chỉ là tham chiếu, chưa có chia sẻ tài liệu cho merchant. Tổ chức SUSPENDED chưa được chặn khi chuyển trạng thái.
- WO08-03: khi thành viên bị thu hồi, case đang gán vẫn giữ người được gán (chưa có chính sách gán lại). Từ chối do không thuộc tổ chức không được ghi audit (lựa chọn có chủ đích, cần xác nhận).
- WO09-01 và WO09-02: đường đọc chưa có byte thật. Mọi lần đọc phải đi qua `read_case_document` và chế độ `view` phải được thực thi ở tầng HTTP. Bản đã tải hợp lệ không thu hồi được; người dùng phải được thông báo rõ.
- WO09-03: lần từ chối 403 của transitionCase, grantDocument và revokeGrant chưa ghi authz.denied ở tầng API. Route legacy vẫn trả `{error}`, không phải hình dạng hợp đồng. Cần làm trước khi coi ranh giới HTTP là đầy đủ.
- CSP và header bảo mật của landing: chờ reviewer độc lập.

## Blocker (phân loại)
- Tài khoản store thật và kiểm hủy/xóa (T46, WO18-01): cần tài khoản store và DEC09. **HUMAN_REQUIRED**.
- Runbook sự cố là DRAFT (WO16-03): người trực, đường liên lạc khẩn, nơi lưu nhật ký, mẫu thông báo khách và nội dung pháp lý. **HUMAN_REQUIRED**. Chưa có hệ thống giám sát, cảnh báo tự động và quét crash report thật. **INFRA**.
- Quyết định về cờ kill switch (WO16-02): tắt sharing có chặn đọc chia sẻ hiện có không; ai duyệt break-glass; thời hạn tối đa; quy trình cấp hỗ trợ viên. **HUMAN_REQUIRED**. Điểm thực thi cho ai_extraction, outbound_notifications, billing_writes và country_activation chờ WO06, WO12, WO16-04.
- Profile pilot đã công bố (T40, HUM-WO19-02): số yêu cầu, số người dùng đồng thời và mẫu thao tác. **HUMAN_REQUIRED**. Chưa có profile này nên T40 chỉ đo cục bộ theo profile khai báo; web p95 và extraction p95 chưa đo.
- Kiểm truy cập bằng screen reader thật và trình duyệt thật (T33, DEV-01): cần thiết bị và người kiểm. **DEVICE / WAITING_HUMAN**. Các luồng auth, upload, case, grant và delete chưa có màn hình trong web nên T33 chưa kiểm các luồng này.
- Xóa dữ liệu theo chính sách và danh mục giữ lại (WO11-02): chủ dự án và luật sư duyệt; `legal/04` là thiết kế đề xuất. **HUMAN_REQUIRED**.
- Xác minh danh tính và thu hồi phiên (WO11-02, DEC03): cần nhà cung cấp danh tính thật. **HUMAN_REQUIRED**.
- Đăng nhập thật: cần nhà cung cấp danh tính và Supabase project (DEC03). **HUMAN_REQUIRED**.
- Lưu byte tệp thật: cần chọn kho đối tượng riêng tư (DEC06). **HUMAN_REQUIRED**. Chặn luồng tải byte thật.
- Scanner mã độc cho upload thật: cần scanner đã duyệt (INFRA). **BLOCKED** cho upload thật.
- Provider AI thật và dữ liệu gửi đi: cần duyệt vendor và quyền riêng tư (DEC06). **HUMAN_REQUIRED**.
- Danh sách trường quan trọng: cần chủ dự án xác nhận. **HUMAN_REQUIRED**.
- Cách trả link tải gói xuất 24 giờ (WO10-03a, HUM-WO10-03a): đặc tả OpenAPI không có route tải; chọn route trong đặc tả, hoặc trả mã truy cập một lần (cần reviewer độc lập). **HUMAN_REQUIRED**.
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
- Web và mobile đầy đủ (WO10): WO10-01 (Desk danh sách với đủ trạng thái) và WO10-02 (mobile shell với hàng đợi, phần logic) đã xong. Còn lại: WO10-03 (E2E web trên Chromium, BLOCKED), thiết bị thật (DEV-01) cho T23 và T32, DEV-02 cho T36 (Safari, Firefox), cùng đăng nhập thật. Bộ nhận diện trong `docs/design/BRAND_TOKENS.md` là chuẩn cho WO10. Bộ văn bản VI/EN của WO07-04 là nguồn chuỗi cho WO10.
- Bộ biểu tượng ứng dụng và SVG gốc của logo: **HUMAN_REQUIRED** (designer).
- Thiết bị thật, luật sư, pilot với khách, reviewer bảo mật độc lập: **HUMAN_REQUIRED**.

## Ngân sách và quota
- Chưa đo được. Không dùng dịch vụ trả phí. Không đặt extra usage. Chưa có giới hạn đã duyệt (D7).
- Vòng lặp: 50/60 đã dùng (sau WO10-03b; còn 10 lượt).

## Ranh giới đã tuân thủ
- Không force-push, không rebase, không merge, không push `main`, không tạo PR mới.
- Không dùng dữ liệu thật, không production, không thanh toán live, không tài khoản dịch vụ mới, không mua tên miền, không đổi DNS.
- Không gọi model AI, không gửi push thật, không tải byte thật, không đưa khóa vào repo. `TEST_DATABASE_URL` lấy từ cấu hình CI, không in ra màn hình.
- Font Inter được tự host kèm giấy phép; không tải từ CDN.
- Không đưa tên model vào commit hoặc tài liệu.

## Ghi chú vận hành
- Lượt 03/11 02:16 UTC: WO10-03b DONE ở mức lớp yêu cầu (T38; giao diện chưa có, WO10-03e mới thêm vào backlog). `apps/web/src/actions.ts`: thêm món, mở case, chuyển trạng thái; mỗi lần bấm gửi đúng một yêu cầu, không thử lại; đường dẫn cố định; 16 kiểm thử T38 mới (11 lớp yêu cầu, 5 tích hợp với API thật). Một kiểm thử đỏ do dữ liệu kiểm thử (resolved cần bằng chứng, 0008_cases.sql); Desk báo đúng là invalid; đã sửa dữ liệu kiểm thử. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-11-03T0216Z.md`.
- Lượt 03/11 02:00 UTC: WO10-03a DONE (AUTO; lát cắt HTTP, T24 giữ PASS, độ phủ PARTIAL). `createExport` và `getJob` qua HTTP; `Idempotency-Key` bắt buộc; phản hồi không có mã truy cập; 4 kiểm thử T24 mới; đột biến làm đỏ đúng kiểm thử chủ sở hữu. Chưa có đường tải gói (đặc tả không có route), nên link 24 giờ chưa trả ra: HUM-WO10-03a (HUMAN) đã thêm vào backlog. Xuất trong lúc chờ xóa chưa khóa (Q6). HawkScan BLOCKED: không có `hawk`, `HAWK_API_KEY` chưa đặt, chưa có `stackhawk.yml`. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-11-03T0201Z.md`.
- Lượt 03/11 01:53 UTC: WO11-02c DONE (AUTO_PREP): bản đề xuất sáu quyết định cho chủ dự án (danh mục xóa và grace; bảng chỉ thêm có nội dung cá nhân; DEC03 và phiên; thành viên tổ chức; bên nhận; xuất dữ liệu). Mỗi mục có phương án, khuyến nghị, hệ quả và ô quyết định để trống. Không chọn thay chủ dự án. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-11-03T0153Z.md`.
- Lượt 03/11 01:37 UTC: WO11-02b DONE (T25 giữ PARTIAL): trigger `refuse_writes_while_pending_deletion` (migration 0018) trên 12 bảng chặn INSERT và UPDATE nội dung khi tài khoản PENDING_DELETION; thu hồi và ghi không có phiên vẫn được. Sửa `tests/support/local-auth-shim.sql`: GUC rỗng là không có phiên. Chưa khóa: export_jobs, export_files (quyết định WO11-02d). Receipt: `docs/plan/evidence/AUTO_RUNS/2026-11-03T0137Z.md`.
- Lượt 03/11 01:32 UTC: tách WO11-02 (a, b: AUTO; c: AUTO_PREP; d..g: HUMAN) và WO10-03 (a..c: AUTO; d: HUMAN, DEC06) bằng `backlog.mjs split`; thêm WO26-01 (hướng dẫn dev local). WO11-02a DONE: phiên cũ bị 401 ở mọi route sau yêu cầu xóa, route requestDeletion thật; T25 giữ PARTIAL, thêm 5 kiểm thử HTTP. Bước 0 có Postgres 16 khởi động lại trong container (worker restart làm mất DB). Receipt: `docs/plan/evidence/AUTO_RUNS/2026-11-03T0132Z.md`.
- Lượt 02/11 (iter 45): WO25-01 DONE (AUTO, T17/T19/T20). `transitionCase` (HTTP) nay đọc và xác thực `outcome`, truyền thật vào `public.transition_case` — case resolve/close qua API không còn bị DB từ chối. **Máy này tìm được `/Applications/Postgres.app` (có `psql`/`pg_ctl`/`initdb` thật ở `Contents/Versions/17/bin`, chỉ không nằm trong PATH) — đã dựng cluster cục bộ (cổng 5433, data dir ngoài repo), chạy `node tools/db/migrate.mjs --with-shim`, và chạy được `npm run verify` với DB thật lần đầu trong phiên này: 353 pass, 1 skip, 0 fail trong 46/47 tệp.** Nhận định "máy không có Postgres" ở ghi chú 01/11 bên dưới chỉ đúng tại thời điểm đó (chưa tìm kỹ); môi trường cục bộ vẫn khác CI (không có Docker, không ảnh hưởng tới DB test). Receipt: `docs/plan/evidence/WO25-01.md`.
- **Phiên 01/11/2026 chạy trên máy cục bộ của chủ dự án, không phải môi trường CI/cloud của các lượt trước.** Máy này không có `psql`/`pg_ctl`/`docker`/`brew` trong PATH — không tự nâng được DB `_test` **ở thời điểm đó**. 26/47 tệp Vitest chạm DB không chạy được trong phiên này (172 pass + 180 skip ngoài DB). Các lượt trước ghi "Vitest 330/330" vì chạy ở môi trường có Postgres sẵn (CI hoặc sandbox khác) — không phải vì DB test đã hết cần thiết. Không giả PASS cho phần DB trong phiên này.
- Lượt 01/11 (iter 44): WO24-01 DONE (AUTO_PREP, không gắn T-xx). Pin `actions/checkout` và `actions/setup-node` theo SHA (tag v4, đọc qua GitHub API); sinh SBOM cây phụ thuộc (`docs/plan/evidence/sbom/2026-11-01.json`); xác nhận `npm audit --omit=dev` trong CI không bắt được `image-size` (chỉ là devDependency qua expo→metro). CI vẫn một job duy nhất, chưa tách theo thành phần (NOT_CHECKED, cần chủ dự án quyết quy mô). Receipt: `docs/plan/evidence/WO24-01.md`.
- Lượt 01/11 (iter 43): WO23-01 DONE (AUTO_PREP, không gắn T-xx). Thêm lệnh `split`/`add` cho `tools/loop/backlog.mjs` (gỡ đúng lý do BLOCKED của WO10-03: "công cụ không tách được task"). `npm ci` khôi phục `node_modules` (lockfile không đổi). `image-size` High (GHSA-5p2g-fcmc-qvqq) xác nhận còn mở, không vá được bằng `npm audit fix` không `--force`; đường duy nhất là qua `metro` (build-time của Expo), không có mã nguồn nào trong `services`/`apps` import trực tiếp. Đối chiếu ZIP v2 bên ngoài vào `docs/plan/08_V2_RECONCILIATION.md`: sửa 29/46 dòng mapping (nhiều hơn 13/46 mà một audit trước đó tìm ra); xác nhận chỉ 2 việc mới thật (công cụ split/add vừa làm, và SBOM/CI-pin WO24-01). Receipt: `docs/plan/evidence/WO23-01.md`.
- Phát hiện chưa sửa trong phiên này (cần xác minh DB trước khi coi là DONE): `services/api/src/http/app.ts` (`transitionCase`, dòng ~468-473) luôn truyền `outcome = null` cho `public.transition_case(...)`; theo `supabase/migrations/0008_cases.sql` (dòng ~306-320), chuyển sang `resolved` hoặc `closed` đòi `p_outcome` khác null — nghĩa là case **không thể resolve/close qua API hiện tại**. Hợp đồng HTTP (`contractBody` cho `transitionCase`) cũng chưa khai báo trường `outcome`. Chưa sửa: cần chạy `tests/db/cases.test.ts` thật trên Postgres `_test` để xác nhận không phá vỡ ràng buộc khác trước khi coi là DONE; máy phiên này không có Postgres.
- Lượt 20:51 UTC: WO19-01 DONE ở mức kế hoạch (AUTO_PREP; E02 và E03 NOT_STARTED, cần HUM-WO19-02). Bộ chuẩn bị nằm trong `docs/pilot/`: kế hoạch, sổ đo chỉ có tiêu đề, SLA dự thảo. `decide` sau đó trả về STOP_STUCK; không lên lịch vòng kế tiếp. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T2051Z.md`.
- Lượt 20:36 UTC: WO18-01 BLOCKED ở T46 (cần tài khoản store thật; DEC09 NOT_AUTHORIZED). Phần AUTO_PREP ở mức DRAFT: hai bản nháp v0.2 và hai checklist trong `docs/legal/`. Không xuất bản; không có luật sư nào duyệt. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T2036Z.md`. Dòng đồng tác giả dùng `Claude <noreply@anthropic.com>`, không đưa tên model (mục 3, quy tắc 5 của giao thức).
- Lượt 20:27 UTC: WO16-04 DONE ở mức mã và kiểm thử (T41 PARTIAL). Mọi pack là DISABLED; quốc gia pilot chưa quyết định (DEC07). Đã khôi phục nhầm lẫn phụ thuộc ajv về HEAD. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T2027Z.md`.
- Lượt 20:17 UTC: WO16-03 DONE ở mức mã và kiểm thử. API ghi nhật ký có cấu trúc lần đầu (hai đường 500, chỉ tên lớp lỗi). Runbook sự cố là DRAFT. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T2017Z.md`.
- Lượt 20:06 UTC: WO16-02 DONE ở mức cơ sở dữ liệu (T42 PARTIAL). Tắt sharing chỉ chặn chia sẻ mới; bốn cờ khác chưa có điểm thực thi. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T2006Z.md`.
- Lượt 19:55 UTC: WO15-02 DONE ở mức đo cục bộ (T40 PARTIAL; chưa có profile pilot đã công bố). Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1955Z.md`.
- Lượt 19:44 UTC: WO15-01 DONE ở mức tự động (T33 PARTIAL: chưa có màn hình cho auth, upload, case, grant, delete; screen reader thật thuộc DEV-01). Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1944Z.md`.
- Lượt 19:34 UTC: WO14-01 DONE ở mức cơ sở dữ liệu (T43 PARTIAL; phần tách số mô hình chưa có số để kiểm). Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1934Z.md`.
- Lượt 19:22 UTC: WO13-01 DONE ở mức cơ sở dữ liệu (T31 PARTIAL). Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1922Z.md`.
- Lượt 19:09 UTC: WO11-02 BLOCKED sau lát cắt 1. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1909Z.md`.
- Lượt 18:56 UTC: WO10-03 BLOCKED. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1856Z.md`.
- Quy tắc vận hành: mọi `npm run verify` và lệnh Vitest JSON phải có `TEST_DATABASE_URL` trong cùng lệnh, lấy từ `.github/workflows/ci.yml`, không in giá trị ra màn hình.
- Lượt 18:46 UTC: WO11-01. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1846Z.md`.
- Lượt 18:31 UTC: WO10-02. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1831Z.md`.
- Lượt 18:14 UTC: WO10-01. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1814Z.md`.
- Lượt 17:54 UTC: WO09-03. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1754Z.md`.
- Lượt 17:46 UTC: WO09-02. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1746Z.md`.
- Lượt 17:37 UTC: WO09-01. Receipt: `docs/plan/evidence/AUTO_RUNS/2026-10-31T1737Z.md`.
- Lượt 17:30 UTC: WO08-03. Lượt 17:20 UTC: WO08-02. Lượt 17:11 UTC: WO08-01. Lượt 17:03 UTC: WO07-04. Lượt 16:53 UTC: WO07-03. Lượt 16:43 UTC: WO07-02. Lượt 16:31 UTC: WO06-05. Lượt 16:20 UTC: WO06-04. Lượt 16:14 UTC: WO06-03. Lượt 16:07 UTC: WO06-02. Lượt 16:01 UTC: WO06-01. Lượt 15:53 UTC: WO05-03. Lượt 15:38 UTC: WO05-02. Lượt 15:08 UTC: WEB-01.
