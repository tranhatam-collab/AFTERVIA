# WO11-02e-EXP: nội dung gói xuất trong bảng sửa được có hạn 24 giờ (Q2, phương án C)

- Task: WO11-02e-EXP (AUTO, gate P0, phụ thuộc WO11-02c). Thực hiện Q2 phương án C, đã QUYẾT (`docs/plan/06_DECISIONS_DELEGATED.md`, dòng 25).
- Acceptance: T25 (7 kiểm thử mới trong `tests/db/export-bodies.test.ts`; 1 kiểm thử T24 đổi vị trí đọc).
- Độ phủ: T25 ở mức PARTIAL. Chưa có xóa dữ liệu theo chính sách (WO11-02d).
- Bảo mật: **chờ reviewer độc lập**. Không tự gọi là đã duyệt.

## Đã làm

- Migration `supabase/migrations/0021_export_bodies.sql` (tiến; không sửa migration đã áp dụng):
  - Bảng `export_bodies(job_id, path, body, expires_at)`, khóa chính `(job_id, path)`. RLS bật, không có chính sách; thu hồi quyền của `public`, `anon`, `authenticated`. Chỉ hàm `SECURITY DEFINER` truy cập.
  - Trigger `export_bodies_expiry_guard` (khi insert, hoặc update của `expires_at`): hạn nội dung không được vượt hạn gói (`export_jobs.expires_at`). Được phép rút ngắn.
  - Sao chép nội dung hiện có vào `export_bodies`, giữ nguyên hạn gói. Kiểm số dòng và băm trước khi bỏ cột.
  - `export_files`: bỏ cột `body`. Còn lại `job_id`, `path`, `content_type`, `sha256`, `size_bytes`, vẫn chỉ thêm (trigger cũ giữ nguyên).
  - `store_export`: ghi tham chiếu, băm và kích thước vào `export_files`; ghi nội dung cùng hạn 24 giờ vào `export_bodies`. Kiểm phạm vi và băm giữ nguyên.
  - `fetch_export_file`: đọc nội dung từ `export_bodies`, chỉ khi nội dung còn hạn và gói còn hạn. Nếu không thì trả `P0002` như không tìm thấy. Audit `export.download` giữ nguyên.
  - `purge_expired_export_bodies()`: xóa nội dung có `expires_at <= now()`, trả về số dòng, ghi audit `export.bodies_purged` với `count`. Không cấp cho `anon` và `authenticated`.
- `tests/db/export-bodies.test.ts` (mới, 7 kiểm thử T25).
- `tests/api/exports-http.test.ts`: một kiểm thử T24 đọc nội dung từ `export_bodies` thay vì `export_files`. Assertion giữ nguyên: chỉ món của người gọi, không có món của người khác. Đây là cập nhật theo vị trí lưu trữ mới, không phải nới kỳ vọng.

## Lệnh đã chạy và kết quả

- `npm run db:migrate` trên `aftervia_test` đã có dữ liệu E2E (1 gói, 5 tệp): `applied 1, already applied 21`. Kiểm sau migration: cột `body` của `export_files` còn 0; `export_bodies` có 5 dòng; sai băm 0; nội dung mồ côi 0; lệch hạn so với gói 0.
- Nhóm liên quan, 5 tệp (export-bodies, exports, migrations, restore-drill, exports-http): 31/31 pass, exit 0.
- `npm run verify`: exit 0. Bundle 69/69; quét bí mật 324 tệp, 5 luật; typecheck gốc và mobile; build landing và web; Vitest 62 tệp pass và 1 bỏ qua; 473 kiểm thử pass và 1 bỏ qua (tăng 7); test:loop đạt.
- Vitest JSON (`.loop/vitest.json`): `success=true`; 474 tổng; 473 pass; 0 fail; 1 pending.
- `node tools/loop/matrix.mjs from-report .loop/vitest.json`: không đổi dòng nào. PASS 34, NOT_RUN 12, FAIL 0; coverage PARTIAL 42, NONE 4.
- `npm run e2e:web`: đạt 12/12, gồm bước xuất gói qua `store_export` mới (`xuất gói ... (T24): trạng thái Đã xong`).

## Đột biến

- M1: purge không xóa gì (`where false`): 1/7 kiểm thử đỏ.
- M2: fetch bỏ kiểm hạn nội dung: 1/7 đỏ.
- M3: trigger không chặn hạn nội dung vượt hạn gói: 1/7 đỏ.
- Sau mỗi đột biến, `0021` được khôi phục từ bản sao, sha256 khớp. Chạy lại 7/7 pass.

## Giới hạn còn lại

1. Không có lịch chạy `purge_expired_export_bodies()`. Hàm đã có; chạy định kỳ cần tác vụ vận hành được duyệt.
2. Quyền xuất trong lúc chờ xóa vẫn chưa có quy tắc (Q6, WO11-02d).
3. Nội dung đã dọn không khôi phục được. Đây là mục đích, nhưng sao lưu cũ vẫn có thể chứa nội dung đã dọn (WO16-01).
4. Đường hết hạn tự nhiên (24 giờ thật) chưa chạy. Test rút hạn nội dung xuống quá khứ để mô phỏng.
5. Gói đã có trước migration được sao chép với hạn gói; không gói nào bị kéo dài hạn.

## HawkScan

- Không chạy: `HAWK_API_KEY` không đặt và ứng dụng không chạy.

## Rollback

- Migration tiến. Quay lại cần migration mới: thêm lại cột `body` vào `export_files`, sao chép nội dung từ `export_bodies`, khôi phục thân hàm của 0013 và xóa `export_bodies`. Nội dung đã dọn sẽ không trở lại.

## Việc tiếp theo

- WO11-02e-CONF và WO11-02e-CASE (AUTO, Q2-C), chưa làm.
- Lịch chạy `purge_expired_export_bodies()` (vận hành, cần duyệt).
