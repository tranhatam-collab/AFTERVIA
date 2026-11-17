# AFTERVIA — Kế hoạch thực thi hoàn chỉnh

Ngày: 31/10/2026 · Nguồn đặc tả: `docs/spec/AFTERVIA_AZ_2026-10-31/` (70 tệp, 69 tệp có SHA-256) · Trạng thái: **đang thực thi bằng vòng lặp**.

## 1. Kế hoạch này là gì và không là gì

- **Là:** chuyển bộ đặc tả thành backlog có phụ thuộc, bằng chứng và cổng; định nghĩa vòng lặp phát triển tự động; ghi rõ việc máy làm được và việc chỉ người làm được.
- **Không là:** bằng chứng rằng sản phẩm khả thi về thương mại, đã an toàn, đã có khách trả tiền, hoặc đã được phép hoạt động. Mọi số tài chính là giả định.

## 2. Trạng thái xuất phát (đã kiểm chứng trước khi thực thi)

| Hạng mục | Kết quả | Cách kiểm |
|---|---|---|
| Toàn vẹn bộ đặc tả | 69/69 tệp khớp SHA-256 | `npm run check:bundle` |
| Mô hình tài chính | Chạy lại `finance/06_RECOMPUTE_MODEL.py` khớp 18/18 số làm tròn (3 kịch bản × 6 chỉ tiêu) | chạy script với `python3 -I` |
| Kiểm thử ứng dụng | 46 test, tất cả `NOT_RUN` | `docs/plan/02_ACCEPTANCE_MATRIX.csv` |
| Work order | 22 WO, tất cả `NOT_STARTED` | `ops/02_BACKLOG_WORK_ORDERS.csv` |
| Mã nguồn theo manifest | 32 đường dẫn `PLANNED_NOT_GENERATED` | `engineering/10_REPO_FILE_MANIFEST.csv` |

Các khoảng trống của bộ đặc tả được ghi ở `03_BUNDLE_AUDIT.md`.

## 3. Nguyên tắc không thương lượng

1. **Không DONE, không PASS nếu chưa có lần chạy thật.** Trạng thái T-xx chỉ được cập nhật từ báo cáo Vitest (`tools/loop/matrix.mjs from-report`). Kiểm thử bị skip = `NOT_RUN`.
2. **Vòng lặp chỉ làm `AUTO` và `AUTO_PREP`.** `HUMAN`, `DEVICE`, `INFRA` luôn `WAITING_HUMAN`. Vòng lặp không tự phê duyệt, không ký, không tạo tài khoản, không thanh toán, không tự đưa ra quyết định pháp lý.
3. **Chỉ dữ liệu synthetic.** Không production, không billing live, không store listing, không mua tên miền, không gửi thông tin ra bên ngoài.
4. **Không tự chấm bài mình.** Reviewer bảo mật phải là người khác với tác giả AI (HUM-WO17-02). Báo cáo của AI viết code không đủ để qua cổng.
5. **Mọi tuyên bố có bằng chứng kiểm được:** lệnh đã chạy, số kết quả, commit SHA.

## 4. Cổng và phân công

| Cổng | Task chính | Ai thực hiện | Điều kiện qua |
|---|---|---|---|
| G0 Công cụ và quyền | HUM-G0-01, HUM-DEC-01 | Chủ dự án, luật sư | Quyền source và license xác nhận bằng văn bản; quyết định builder được ghi lại. Trước mọi dữ liệu thật. |
| G1 Nhu cầu | WO02-01 (chuẩn bị), HUM-WO02-02/03 | Vòng lặp chuẩn bị; người phỏng vấn | 5 design partner đúng tiêu chí và pain lặp lại (E01). |
| P0 Kỹ thuật | WO03 → WO11 (AUTO) | Vòng lặp | Luồng P0 end-to-end trên synthetic; mọi test critical/high của P0 PASS trong ma trận. |
| P1 Kỹ thuật | WO12 → WO14 (AUTO) | Vòng lặp | Fixture sandbox đạt. Không mở thanh toán live. |
| G2 Kỹ thuật độc lập | WO15, WO16, WO17-01, DEV-01/02, INF-01, HUM-WO17-02 | Vòng lặp + người + thiết bị + staging | Reviewer độc lập đóng mọi CRITICAL/HIGH; build thật trên máy; khôi phục thử trên staging. |
| G3 Pháp lý và thương mại | WO18-01, HUM-WO18-02, WO19-01, HUM-WO19-02 | Luật sư; chủ dự án; người vận hành pilot | Luật sư duyệt theo quốc gia; store và billing được duyệt; pilot có phép và dữ liệu thật được cấp quyền (DEC08). |
| G4 Phát hành | WO20-01, HUM-WO20-02 | Chủ dự án | Checklist và kịch bản rollback đã chạy trên staging; quyết định phát hành riêng (DEC10). |
| G5 Tăng trưởng | HUM-WO21-01, HUM-WO22-01 | Chủ dự án, sales | Cohort, CAC, retention đo thật. Không dựa vào số giả định. |

## 5. Khối lượng công việc (đếm từ `docs/plan/backlog.json`)

- **47 task vòng lặp:** 41 `AUTO` + 6 `AUTO_PREP`. Ngân sách vòng lặp: 60 lần bắt đầu task (dư để làm lại khi lỗi).
- **13 task ngoài vòng lặp:** 10 `HUMAN`, 2 `DEVICE`, 1 `INFRA`.
- **46 kiểm thử:** 34 `AUTO`, 6 `PARTIAL`, 4 `DEVICE`, 1 `G0_EXTERNAL`, 1 `LEGAL`. Mức phủ ban đầu: 42 `PARTIAL`, 4 `NONE`, 0 `FULL`. Một test chỉ được nâng lên `FULL` khi phủ đủ nội dung của tiêu chí.

## 6. Việc chỉ người làm được (checklist cho chủ dự án)

1. Duyệt DEC01–DEC12 (bảng bên dưới) trước khi thu dữ liệu thật hoặc mở bất kỳ tài khoản nào.
2. HUM-G0-01: xác nhận builder và quyền sử dụng source. Nếu giữ builder là Claude Code trong repo (DEC-ENG-01), ghi xác nhận vào `04_DECISIONS.md`.
3. HUM-WO02-02/03: 30 phỏng vấn (15 cửa hàng, 10 khách, 5 đơn vị dịch vụ) có consent; chốt 5 design partner. Không điền số giả.
4. HUM-WO17-02: thuê hoặc chỉ định reviewer bảo mật độc lập (DEC05).
5. DEV-01/02: thiết bị iPhone và Android thật; trình duyệt Safari và Firefox. Cần chốt phiên bản mục tiêu (xem G-12 trong `03_BUNDLE_AUDIT.md`).
6. INF-01: staging độc lập để diễn tập khôi phục; RPO/RTO đo thật.
7. HUM-WO18-02: luật sư theo quốc gia, tư vấn IP, duyệt store và billing.
8. HUM-WO19-02 và HUM-WO20-02: pilot có phép và quyết định phát hành riêng.
9. HUM-WO21-01, HUM-WO22-01: kênh bán, cohort, thị trường mới — chỉ khi có dữ liệu.

**Quyết định của chủ dự án (từ `ops/03_FOUNDER_DECISIONS.md`):** trạng thái hiện tại.

| ID | Nội dung | Trạng thái |
|---|---|---|
| DEC01 | Tên làm việc AFTERVIA | PROPOSED, chưa clearance |
| DEC02 | SMB electronics và appliances, B2B trước | PROPOSED |
| DEC03 | Pháp nhân và tài khoản hạ tầng | UNASSIGNED |
| DEC04 | Hạn mức discovery và probe | NOT_APPROVED |
| DEC05 | Reviewer kỹ thuật và bảo mật độc lập | UNASSIGNED |
| DEC06 | Vendor AI, vùng dữ liệu, privacy | NOT_APPROVED |
| DEC07 | Quốc gia pilot và country pack | DISABLED |
| DEC08 | Dùng tài liệu khách thật | NOT_AUTHORIZED |
| DEC09 | Thanh toán live và store listing | NOT_AUTHORIZED |
| DEC10 | Phát hành production | NOT_AUTHORIZED |
| DEC11 | Kết nối dự án hiện hữu | NOT_AUTHORIZED |
| DEC12 | Tên miền, nhãn hiệu, IP | NOT_AUTHORIZED |

## 7. Định nghĩa "xong"

- **Phần máy làm được xong:** `node tools/loop/backlog.mjs decide` trả `STOP_HANDOFF` (mọi task `AUTO`/`AUTO_PREP` là `DONE`, không còn `BLOCKED`), và `npm run verify` xanh trên commit cuối.
- **Bộ kế hoạch xong theo đúng nghĩa của bản thuyết minh (mục Q và PRD §8):** cần thêm điều kiện bên ngoài máy — mọi kiểm thử critical/high đạt `FULL`, các cổng G0–G5 có bằng chứng do người duyệt, và pilot có khách trả tiền thật. Vòng lặp không tự đóng được các điều kiện này.

## 8. Rủi ro vận hành của chính vòng lặp

| Rủi ro | Kiểm soát |
|---|---|
| Pass giả: sửa expectation để test qua | Quy tắc trong protocol; diff của test được xem khi review PR; ma trận chỉ đọc kết quả chạy thật. |
| Lộ bí mật vào commit | `npm run check:secrets` nằm trong `verify`; `.env.example` chỉ có tên biến. |
| Đẩy thay đổi không được duyệt | Chỉ push nhánh `ccr-4544c9f7-b1t50m`; không merge `main`; PR ở trạng thái nháp. |
| Mất trạng thái giữa các vòng | Trạng thái nằm trong `backlog.json`, `02_ACCEPTANCE_MATRIX.csv`, `docs/plan/evidence/` và lịch sử git. |
| Chi phí ngoài dự kiến | Ngân sách vòng lặp 60; không gọi dịch vụ trả phí; `AI_PROVIDER=disabled`, chỉ dùng provider giả định định trong test. |
| DAST (HawkScan) chưa chạy được | Cần Docker đang chạy và máy chủ HTTP. Docker daemon hiện không chạy; ghi `BLOCKED` cho đến khi có. |
| Postgres test không sẵn sàng | Test thất bại có chủ đích (không skip), kèm bằng chứng trong `BLOCKED`. |
