# WO10-03d-prep — Đề xuất, không quyết định, cho kho byte tài liệu (WO10-03d) và cách trả link gói xuất (HUM-WO10-03a) — DONE (AUTO_PREP)

- Ngày: 06/11/2026, bắt đầu 10:51:28 UTC (theo `started_at`). Loại: AUTO_PREP. Gate: P0. Phụ thuộc: WO10-03a, WO10-03c (DONE). Không có acceptance: đây là tài liệu để chủ dự án quyết định.
- Đây là đề xuất cho chủ dự án. Không chọn nhà cung cấp, không tạo tài khoản, không đổi đặc tả, không đổi mã. Các ô quyết định để trống; chỉ chủ dự án điền.
- Ghi chú về mã quyết định: ledger `docs/plan/06_DECISIONS_DELEGATED.md` dùng **DEC06 cho hai việc khác nhau** (lưu trữ tệp ở dòng 33 và AI ở dòng 34). Trong `docs/spec/AFTERVIA_AZ_2026-10-31/ops/03_FOUNDER_DECISIONS.md`, DEC06 là "Vendor AI/data region và privacy" (NOT_APPROVED), và không có mục nào cho lưu trữ tệp. Đề xuất gán mã riêng khi chủ dự án quyết, ví dụ DEC13 cho kho byte và DEC14 cho cách trả link gói. Mã này chỉ là gợi ý.

## 1. Thực trạng (đã kiểm trong mã và đặc tả)

| Hạng mục | Trạng thái | Nguồn |
|---|---|---|
| Byte tài liệu | Chưa có kho byte. Bảng `documents` có `object_key` (định danh đối tượng), `size_bytes` trong khoảng 1 đến 10 485 760 byte (10 MiB), `sha256` tùy chọn, `scan_status` (PENDING_UPLOAD, QUARANTINED, CLEAN, REJECTED, SCANNER_UNAVAILABLE). Không có cột nào lưu byte | `supabase/migrations/0003_documents.sql` |
| Ticket tải lên | Route `/v1/documents/upload-ticket` và bảng `upload_tickets` đã có. Không nhận byte | `services/api/src/http/contract.ts`, migration 0003 |
| Gói xuất | Byte nội dung nằm trong `export_files.body` (kiểu text). Bảng chỉ thêm, không sửa, không xóa. `path` chỉ nhận 5 giá trị: items.json, items.csv, granted_documents.json, granted_documents.csv, manifest.json | `supabase/migrations/0013_exports.sql` |
| Hạn gói | `export_jobs.expires_at = created_at + 24 giờ` là ràng buộc trong DB. Chỉ lưu `token_hash` (SHA-256). API không trả mã truy cập | `0013_exports.sql`; WO10-03a |
| Đường tải gói | Đặc tả có `POST /v1/exports` (dòng 639) và `GET /v1/jobs/{job_id}` (dòng 763). **Không có route tải gói** trong đặc tả | `engineering/03_API_CONTRACT.openapi.yaml` |
| Thu hồi | "Để đáp ứng thu hồi ngay tài liệu nhạy cảm, dùng authorization proxy không public URL dài hạn." "Signed URL cũ có thể còn hiệu lực tới TTL nếu chỉ dùng storage URL." | `product/04_ROLES_PERMISSIONS_AND_CONSENT.md` dòng 22 |
| Kiến trúc lưu trữ | Upload xin signed upload URL sau xác thực, rồi vào "storage private quarantine" | `engineering/01_ARCHITECTURE_AND_WRON_FIT.md` dòng 11 |
| Thời hạn export tạm | "24 giờ. Link hết hạn; file job riêng" | `legal/04_DATA_RETENTION_AND_DELETION.md` dòng 8 |

Hệ quả hiện tại: tải lên tài liệu thật và tải tài liệu thật đang BLOCKED ở WO10-03d (DEC06). Tải gói xuất đang BLOCKED ở HUM-WO10-03a. Hai việc này độc lập với nhau, vì gói xuất đã có byte trong DB.

## 2. Quyết định 1 (WO10-03d): kho byte cho tài liệu

Câu hỏi: tài liệu gốc (ảnh JPEG, PNG, PDF, tối đa 10 MiB) lưu ở đâu sau khi qua quarantine và quét?

| Phương án | Ưu điểm | Hệ quả và ràng buộc |
|---|---|---|
| **A.** Kho object riêng tư của một nhà cung cấp (ledger đề xuất: cùng nhà cung cấp danh tính) | Khớp kiến trúc trong đặc tả (storage private, quarantine). Mở rộng tốt | Cần tài khoản, vùng dữ liệu và thỏa thuận xử lý dữ liệu (DEC06 vùng dữ liệu). Phải tải qua proxy kiểm quyền, không dùng URL dài hạn. Nếu dùng signed URL thì TTL ngắn và kiểm quyền ngay trước khi ký. Cần INFRA sau khi chọn |
| **B.** Lưu byte trong Postgres (cột bytea hoặc bảng riêng, theo mẫu `export_files`) | Không cần nhà cung cấp mới. Kiểm thử được ngay trên DB `_test`. Sao lưu cùng DB (diễn tập cục bộ đã có ở T39) | Lệch kiến trúc đặc tả, vốn là storage private. DB phình to, bản sao lưu lớn, hiệu năng phải đo. Trần 10 MiB đã có trong bảng. Chỉ phù hợp làm bước tạm cho dữ liệu tổng hợp; không đạt cho dữ liệu thật (DEC08 chưa cho phép) |
| **C.** Object storage tương thích S3, tự vận hành trong hạ tầng của chủ dự án | Không phụ thuộc nhà cung cấp thương mại | Vận hành, bản vá, sao lưu và giám sát riêng. Cần INFRA và người vận hành. Không có trong đặc tả |

**Khuyến nghị của đề xuất (không quyết định):** phương án A, quyết cùng lúc với DEC03 (nhà cung cấp danh tính), vì đặc tả đã giả định storage riêng tư và danh tính riêng. Nếu cần kiểm thử đường tải lên và tải xuống trước khi có tài khoản, chọn B tạm thời, giữ trần 10 MiB, và ghi rõ là không dùng cho dữ liệu thật.

Ô quyết định (để trống): [ ] A  [ ] B  [ ] C  [ ] Khác: ________
Mã quyết định: ________   Người quyết định: ________   Ngày: ________

## 3. Quyết định 2 (HUM-WO10-03a): cách trả link tải gói xuất trong 24 giờ

| Phương án | Ưu điểm | Hệ quả và ràng buộc |
|---|---|---|
| **1.** Route tải có phiên, chỉ chủ job: `GET /v1/exports/{job_id}/files/{path}`, với `path` thuộc 5 tệp của `export_files`. Kiểm: người gọi là chủ job, `expires_at` còn hạn, ghi audit mỗi lần tải, trả đúng Content-Type và SHA-256 theo bảng | Không có bí mật mang đi được trong URL. Kiểm quyền ở mọi lần tải. Dùng bảng hiện có, không cần migration | Phải thêm route vào đặc tả OpenAPI (đặc tả hiện không có), nên chủ dự án cần duyệt thay đổi hợp đồng. Người dùng phải đăng nhập, đúng với yêu cầu hiện có của Desk |
| **2.** Mã truy cập một lần: trả ra đúng một lần trong phản hồi `POST /v1/exports` (vẫn chỉ lưu hash), route tải nhận mã, mã dùng một lần, hết hạn 24 giờ | Tải được ở trình duyệt khác mà không cần phiên | Mã là bí mật mang đi được và có thể bị chuyển tiếp. Phải chặn mã khỏi log và URL. Cần cột `used_at` (migration mới) và đặc tả mới. Không gửi mã qua kênh nào khi chưa có quyết định riêng |
| **3.** Gửi link qua email hoặc kênh khác | Tiện cho người dùng | Không có kênh email trong mã và đặc tả (kiểm bằng tìm kiếm). Cần quyết định riêng. **Không khuyến nghị** |
| **4.** Trả nội dung ngay trong phản hồi tạo gói, không có link | Không cần route tải | Không khớp mô hình "link hết hạn" của đặc tả. Có giới hạn kích thước phản hồi. **Không khuyến nghị** cho gói lớn |

**Khuyến nghị của đề xuất (không quyết định):** phương án 1, vì không có bí mật mang đi được, kiểm quyền ở mỗi lần tải, và thời hạn 24 giờ đã được ràng buộc trong DB. Cần chủ dự án duyệt thêm route vào hợp đồng trước khi triển khai.

Ô quyết định (để trống): [ ] 1  [ ] 2  [ ] 3  [ ] 4  [ ] Khác: ________
Mã quyết định: ________   Người quyết định: ________   Ngày: ________

## 4. Ràng buộc chung cho mọi phương án

- Thu hồi phải có hiệu lực ở lần gọi kế tiếp. Không dùng URL công khai dài hạn (đặc tả, `04_ROLES` dòng 22).
- Không ghi byte, mã truy cập hoặc nội dung tài liệu vào log. Đã có kiểm trong T37 (`tests/observability/log.test.ts`).
- Gói xuất giữ 24 giờ. Gói hết hạn chưa có quy tắc dọn (đã ghi ở WO11-01 và `05_AUTONOMY_STATUS.md`).
- Xuất trong lúc chờ xóa vẫn chưa có quy tắc (WO11-02d).
- Mọi phương án phải có kiểm thử vượt quyền (người khác không tải được) trước khi đánh dấu PASS. Không đánh dấu PASS chỉ vì route tồn tại.

## 5. Việc cần chủ dự án trả lời

1. Chọn kho byte (A, B, C hoặc khác), hoặc yêu cầu thêm thông tin.
2. Chọn cách trả link gói (1, 2, 3 hoặc 4). Nếu chọn 1 hoặc 2, duyệt thay đổi hợp đồng OpenAPI.
3. Gán mã quyết định cho kho byte và cho cách trả link. Ledger hiện trùng DEC06.
4. Cho biết quý dự kiến cho DEC03 (nhà cung cấp danh tính), vì ảnh hưởng đến phương án A.

## 6. Nếu chưa quyết

WO10-03d, HUM-WO10-03a, WO16-01b, WO17-01b và WO20-01 tiếp tục chờ. WO11-03 (phần xóa và xác thực lại) cũng chờ WO11-02d..g. DEV-02 (T36) chưa chạy được trên trình duyệt mục tiêu. Ma trận và trạng thái phát hành không đổi.

## 7. Kiểm chứng

- Chỉ là tài liệu, không đổi mã và không thêm kiểm thử. `npm run verify` exit 0, Vitest JSON `success=true`, `from-report` không đổi trạng thái. Chi tiết trong receipt của lượt.
- Các đường dẫn, số dòng và giá trị trích dẫn lấy từ lệnh đọc và tìm kiếm trong lượt, trên commit `c74a747`.

## 8. Giới hạn

- Đề xuất dựa trên mã và đặc tả trong repo. Repo không có thông tin về giá, hiệu năng hay điều khoản của nhà cung cấp nên các phương án không được so sánh theo những tiêu chí đó.
- Mã quyết định gợi ý (DEC13, DEC14) không có hiệu lực cho đến khi chủ dự án chấp nhận.

## 9. Rollback

- Revert commit. Lượt không đổi mã, không đổi migration, không đổi đặc tả.
