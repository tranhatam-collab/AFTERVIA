# SEC-IDEM-01 — Khử trùng ở máy chủ theo Idempotency-Key cho POST /v1/items và cấp grant (T38) — DONE

- Ngày: 04/11/2026, bắt đầu 00:54:45 UTC (theo `started_at` của backlog). Loại: AUTO. Gate: P0. Phụ thuộc: WO10-03c (DONE). Acceptance: T38.
- Ma trận: dòng T38 giữ `test_status` PASS, coverage PARTIAL. `from-report` không đổi trạng thái dòng nào (`changes: []`).
- Liên quan bảo mật: hàm `SECURITY DEFINER` mới và khóa tư vấn. **Chờ reviewer độc lập** (quy tắc 9 của giao thức). Không tự gọi là đã duyệt.

## Phạm vi đã làm

- `supabase/migrations/0019_idempotent_creates.sql` (mới):
  - Cột `create_request_id` (text, null, 8–128 ký tự) trên `items` và `case_document_grants`; chỉ mục unique `items_owner_request_idx (owner_user_id, create_request_id)` và `case_document_grants_granter_request_idx (granted_by, create_request_id)`.
  - `create_item_keyed(...)`: lấy khóa tư vấn theo `(người dùng, khóa)` trước khi đọc. Cùng khóa, cùng nội dung: trả món cũ (`out_replayed = true`). Cùng khóa, khác nội dung: 23505.
  - `grant_case_document_keyed(...)`: cùng cách. Gửi lại trả grant cũ với trạng thái hiện tại (`active` hoặc `revoked`), không kích hoạt lại grant đã thu hồi. Phần kiểm còn lại giống `grant_case_document`: chủ case, case đang mở, hạn không quá 30 ngày, có bằng chứng, người nhận còn hiệu lực.
  - Hàm cũ `create_item` và `grant_case_document` giữ nguyên chữ ký.
- `services/api/src/http/app.ts`:
  - `POST /v1/items`: không có header thì đi đường cũ. Có header thì gọi `create_item_keyed` qua `withUser`, không qua `runRead` (vì `runRead` đổi 23505 thành `already_member`). 23505 trả 409 `conflict`.
  - `grantDocument`: dùng khóa đã kiểm (trước đây kiểm rồi bỏ đi), gọi `grant_case_document_keyed`, trả `{ id, status }`.
- `apps/web/src/actions.ts`: `addItem(options, input, idempotencyKey?)`. Khóa sai độ dài trả `invalid` trước khi gửi.
- `apps/web/src/DeskForms.tsx`: `ItemForm` giữ khóa theo nội dung bằng `keyFor`, như form mở case. Thành công thì xóa khóa đang giữ.
- Kiểm thử:
  - `tests/api/idempotency-http.test.ts` (mới): 11 kiểm thử T38, HTTP thật trên DB `aftervia_test`.
  - `tests/web/desk-forms-dom.test.ts`: +1 kiểm thử T38 cho form tạo món.
  - `tests/web/desk-actions.test.ts`: +2 expectation T38 cho `addItem` với khóa 5 ký tự và 129 ký tự.
- `docs/plan/02_ACCEPTANCE_MATRIX.csv`: chỉ cột `last_run` đổi sang 2026-11-04 (do `from-report`). Không đổi trạng thái.
- Không đổi `package.json`, dependency, đặc tả (`docs/spec`), hay cấu hình CI.

## Điều đã sửa trong lượt

- Báo cáo trước nói gửi lại chia tài liệu có thể tạo grant trùng. **Điều này không đúng.** Chỉ mục unique một phần `case_document_grants_one_active_idx (case_id, document_id, recipient_id) where revoked_at is null` đã chặn grant hoạt động thứ hai. Kiểm thử "T38 a second active grant for the same document and recipient is refused under a new key" xác nhận điều này. Rủi ro thật là: (a) `POST /v1/items` không có ràng buộc nào nên gửi lại tạo món trùng; (b) gửi lại grant trả lỗi xung đột thay vì kết quả cũ. Cả hai đã xử lý.
- Kiểm thử đồng thời qua HTTP bản đầu không bắt được việc bỏ khóa tư vấn: các yêu cầu đến sau khi giao dịch đầu đã commit nên không đua thật. Đã thay bằng kiểm thử xác định: một giao dịch giữ khóa khi chưa commit, giao dịch thứ hai phải chờ rồi trả đúng kết quả của giao dịch đầu.
- Bản đầu của `desk-actions` không kiểm khóa sai độ dài trong `addItem`: đột biến D3 vẫn xanh. Đã thêm hai expectation vào đúng kiểm thử T38 khóa không hợp lệ; D3 nay bị bắt.
- Đột biến D2 ban đầu bị bỏ qua vì chuỗi neo khớp ba lần (ba dòng `keyFor` giống nhau). Đã neo lại bằng chú thích duy nhất của `ItemForm`.

## Kiểm chứng (trên trạng thái cuối)

| Lệnh | Kết quả |
|---|---|
| `npm run verify`, với `TEST_DATABASE_URL` lấy từ `.github/workflows/ci.yml` trong cùng lệnh (không in giá trị) | exit 0. Bundle 69/69. Quét bí mật 307 tệp, 5 luật. Typecheck gốc và mobile. Vitest 59 tệp pass và 1 bỏ qua; 449 kiểm thử pass và 1 bỏ qua. `test:loop` 18/18 |
| `npx vitest run --reporter=json --outputFile=.loop/vitest.json` | `success: true`; 450 tổng, 449 pass, 0 fail, 1 pending |
| `node tools/loop/matrix.mjs from-report .loop/vitest.json` | `changes: []`; PASS 33, NOT_RUN 13, FAIL 0; PARTIAL 42, NONE 4 |
| Đột biến, bảng dưới | 11/11 làm đỏ ít nhất một kiểm thử |
| HawkScan (DAST) | **BLOCKED**: không có `hawk`; `HAWK_API_KEY` chưa đặt; không có `stackhawk.yml`; ứng dụng không chạy |

Đột biến: script nằm ngoài repo và không commit. Mỗi đột biến thay đúng một chuỗi (chuỗi phải khớp đúng một lần), chạy 3 tệp T38 bằng Vitest JSON, rồi khôi phục tệp gốc và so sha256 trước và sau: khớp (`restored: true`). Nền chạy một lần trước khi áp đột biến: 30/30 pass.

| Mã | Đột biến | Kiểm thử đỏ |
|---|---|---|
| M1 | SQL item: replay không trả dòng nào | 3: "a repeated item request with the same key…", "concurrent identical requests…", "a request that races another…" |
| M2 | SQL item: khác nội dung không báo 23505 | 1: "the same item key with another body is refused with 409…" |
| M3 | SQL item: bỏ khóa tư vấn | 2: "concurrent identical requests…", "a request that races another…" |
| M4 | SQL grant: replay luôn báo `active` | 1: "after revocation the replayed grant reports revoked…" |
| M5 | SQL grant: khác nội dung không báo 23505 | 1: "the same grant key with another body is refused with 409" |
| M6 | SQL grant: bỏ khóa tư vấn | 1: "a grant request that races another…" |
| M7 | HTTP `POST /v1/items` bỏ qua khóa | 5 |
| M8 | HTTP nới độ dài khóa tối thiểu xuống 1 | 1: "a key shorter than 8 characters is refused before any write" |
| D1 | Desk: form tạo món không gửi khóa | 1: "the item form sends an Idempotency-Key…" |
| D2 | Desk: khóa không đổi khi nội dung đổi | 1: cùng kiểm thử với D1 |
| D3 | Desk actions: `addItem` không kiểm độ dài khóa | 1: "an idempotency key outside 8 to 128 characters…" |

Lưu ý về M3: bản đột biến chạy lần đầu chỉ bị bắt bởi kiểm thử đua xác định. Lần chạy sau bị bắt bởi cả hai. Kiểm thử HTTP đồng thời phụ thuộc thời gian, nên bằng chứng ổn định là kiểm thử xác định.

## Giới hạn và phần còn lại

1. Khóa Desk giữ trong state của form. Nếu người dùng tải lại trang sau lỗi mạng, form cấp khóa mới và có thể tạo món trùng. Cần lưu khóa vào `sessionStorage` nếu muốn bảo vệ qua lần tải lại. Chưa làm.
2. Yêu cầu không có khóa (client cũ) không được khử trùng. Route giữ hành vi cũ có chủ đích.
3. Không có bảng khóa riêng: khóa nằm trên dòng món hoặc grant đã tạo thành công. Lỗi 4xx và 5xx không tạo dòng nên không được ghi nhớ, và gửi lại sau lỗi được xử lý lại từ đầu. Trường hợp đã commit nhưng phản hồi mất do mạng thì gửi lại với cùng khóa trả đúng bản đã tạo.
4. Chờ reviewer độc lập cho hàm `SECURITY DEFINER` và khóa tư vấn.
5. DAST: chưa có kết quả quét HawkScan. Không được coi là đã kiểm DAST.

## Rollback

- Revert commit. Migration 0019 không tự rollback. Muốn bỏ thì cần migration mới xóa hai hàm `*_keyed`, hai chỉ mục unique và hai cột `create_request_id`. Dữ liệu hiện có chỉ là dữ liệu tổng hợp.
