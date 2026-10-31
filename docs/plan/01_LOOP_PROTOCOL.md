# Giao thức vòng lặp phát triển tự động

Vòng lặp chạy trong repo này, mỗi lượt xử lý đúng một task. Trạng thái nằm ở repo, không nằm trong trí nhớ phiên làm việc. Mỗi vòng bắt đầu bằng việc đọc tệp này.

## 1. Nguồn trạng thái

| Tệp | Vai trò | Ai được ghi |
|---|---|---|
| `docs/plan/backlog.json` | Task, phụ thuộc, trạng thái, ngân sách vòng | Chỉ qua `node tools/loop/backlog.mjs` |
| `docs/plan/02_ACCEPTANCE_MATRIX.csv` | Trạng thái 46 kiểm thử | Chỉ qua `node tools/loop/matrix.mjs from-report` |
| `docs/plan/evidence/<TASK-ID>.md` | Bằng chứng từng task: lệnh, kết quả, file đổi, giới hạn, rollback | Vòng lặp, trong cùng vòng với `done` |
| `docs/spec/AFTERVIA_AZ_2026-10-31/` | Đặc tả gốc, chỉ đọc | Không ai (đã có checksum) |
| Lịch sử git trên nhánh `ccr-4544c9f7-b1t50m` | Lịch sử thay đổi | Vòng lặp (commit theo task) |

## 2. Một vòng (iteration)

**Bước 0 — Kiểm tra trước.** `npm run verify` phải xanh trên commit hiện tại trước khi bắt đầu. Nếu đỏ sẵn, đó là task đầu tiên cần sửa, không phải task mới.

**Bước 1 — Quyết định.** Chạy `node tools/loop/backlog.mjs decide` và làm theo `action`:

- `RESUME` → tiếp tục task đang `IN_PROGRESS`; đọc `docs/plan/evidence/<id>.md` nếu có.
- `START` → chạy `node tools/loop/backlog.mjs start <id>`.
- `STOP_BUDGET`, `STOP_HANDOFF`, `STOP_STUCK`, `STOP_BLOCKED`, `STOP_INCONSISTENT` → **không lên lịch vòng kế tiếp**. Viết báo cáo cuối theo mục 5.

**Bước 2 — Đọc đúng đặc tả.** Đọc dòng task trong `backlog.json`, các dòng kiểm thử liên quan trong `02_ACCEPTANCE_MATRIX.csv`, và tệp đặc tả được trích trong `tools/loop/` hoặc `docs/spec/`. Không đọc toàn bộ bộ đặc tả trong một vòng.

**Bước 3 — Làm một lát cắt nhỏ.** Chỉ làm phần task yêu cầu. Mỗi kiểm thử có tiền tố mã (ví dụ `T04 ...`) để báo cáo Vitest gắn được vào ma trận. Không viết test giả để tăng số lượng.

**Bước 4 — Kiểm chứng.** Chạy theo thứ tự:

```bash
npm run verify
npx vitest run --reporter=json --outputFile=.loop/vitest.json
node tools/loop/matrix.mjs from-report .loop/vitest.json
```

**Bước 5 — Xử lý kết quả.**

- *Xanh:* viết `docs/plan/evidence/<id>.md` (lệnh đã chạy, số test pass/fail, file đổi, migration nếu có, giới hạn còn lại, cách rollback), rồi `node tools/loop/backlog.mjs done <id> --evidence "..."` (nhiều lần `--evidence` nếu cần).
- *Đỏ:* sửa nguyên nhân gốc. Tối đa 3 lần cho cùng một lỗi. Sau đó `node tools/loop/backlog.mjs block <id> --reason "<lỗi kèm đường dẫn, mã lỗi>"` và chuyển sang vòng kế tiếp. Không tắt test, không đổi expectation để qua, không dùng `skip`.
- *Thiếu hạ tầng* (ví dụ không kết nối được Postgres): `block` với bằng chứng lệnh và thông báo lỗi. Không giả PASS.

**Bước 6 — Lưu và đẩy.**

```bash
git add -A
git commit -m "<task-id>: <mô tả ngắn>"   # không đưa tên model vào commit
git push -u origin ccr-4544c9f7-b1t50m
```

Nếu chưa có PR nháp cho nhánh, tạo PR nháp và đăng ký theo dõi (`subscribe_pr_activity`). Nếu đã có, chỉ cập nhật tiêu đề/mô tả khi cần.

**Bước 7 — Lên lịch vòng kế tiếp.** Sau khi commit và push, chạy `node tools/loop/backlog.mjs decide` lại:

- Nếu `START` hoặc `RESUME`: dùng `send_later` (khoảng 2 phút) với đúng nội dung prompt ở mục 4.
- Nếu là `STOP_*`: không lên lịch. Viết báo cáo cuối.

## 3. Quy tắc cứng

1. Không đánh dấu `DONE` hoặc `PASS` khi chưa có lệnh chạy thật và kết quả đọc được.
2. Không chạy task `HUMAN`, `DEVICE`, `INFRA`. Không tự nhận vai trò pháp lý, tài chính hay phê duyệt.
3. Không dùng dữ liệu thật, không kết nối production, không dùng khóa live, không tạo tài khoản dịch vụ, không mua tên miền hoặc gói.
4. Không đưa secret, token, khóa service role vào repo, log, prompt hay client. Không in giá trị bí mật ra màn hình. Không tắt xác minh TLS.
5. Không ghi tên model vào commit, PR, comment hay bất kỳ tệp nào được push.
6. Không force-push, không merge, không đổi nhánh `main`, không ghi đè nhánh khác nhánh được chỉ định.
7. Mỗi vòng chỉ một task. Nếu task quá lớn, tách thành lát cắt nhỏ bằng cách cập nhật mô tả trong `backlog.json` trước khi bắt đầu (qua công cụ, không sửa tay).
8. Mọi migration phải có số thứ tự và được kiểm bằng `npm run db:migrate` lên DB `_test`. Không chạy trên DB không có hậu tố `_test`.
9. Task liên quan bảo mật được ghi nhận là "chờ reviewer độc lập" trong evidence. Không tự gọi là đã được duyệt.
10. Nội dung pháp lý, chính sách và điều khoản luôn ở trạng thái DRAFT, không xuất bản.

## 4. Prompt của vòng lặp (dùng cho `send_later`)

> Tiếp tục vòng lặp phát triển AFTERVIA. Đọc `docs/plan/01_LOOP_PROTOCOL.md` trong repo `/home/user/AFTERVIA` rồi thực hiện đúng một vòng: chạy `node tools/loop/backlog.mjs decide` và làm theo giao thức. Không chạy task HUMAN, DEVICE hoặc INFRA. Nếu decide trả về STOP_*, viết báo cáo cuối và không lên lịch vòng kế tiếp.

## 5. Báo cáo cuối khi dừng

Mỗi lần dừng phải có:

- Lý do dừng (`STOP_*`) và số vòng đã dùng trên ngân sách.
- Danh sách task `DONE` trong lượt này, commit SHA và kết quả `npm run verify`.
- Danh sách `BLOCKED` kèm lý do và bằng chứng.
- Danh sách `WAITING_HUMAN` kèm việc cụ thể cần làm (lấy từ mục 6 của `00_EXECUTION_PLAN.md`).
- Trạng thái ma trận: số PASS, FAIL, NOT_RUN theo `node tools/loop/matrix.mjs summary`.

## 6. Dừng khẩn

Nếu phát hiện lỗ hổng rò dữ liệu, đăng nhập sai tenant, thanh toán ngoài dự kiến hoặc lệnh có thể xóa dữ liệu thật: dừng vòng ngay, không lên lịch vòng kế tiếp, và báo cáo bằng chứng.

## 7. Trạng thái PR

Nếu tạo PR nháp thất bại vì thiếu nhánh base, ghi lại trong `docs/plan/evidence/PR-STATUS.md`, không thử lại mỗi vòng, không tạo nhánh base khi chưa có phê duyệt rõ ràng, và tiếp tục vòng lặp trên nhánh làm việc.
