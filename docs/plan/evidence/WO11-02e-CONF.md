# WO11-02e-CONF: giá trị xác nhận trường trong bảng sửa được (Q2, phương án C)

- Task: WO11-02e-CONF (AUTO, gate P0, phụ thuộc WO11-02c). Thực hiện Q2 phương án C, đã QUYẾT (`docs/plan/06_DECISIONS_DELEGATED.md`, dòng 25).
- Acceptance: T25 (6 kiểm thử mới trong `tests/db/field-confirmation-values.test.ts`). T14 vẫn đạt (7 kiểm thử; năm chỗ đổi vị trí đọc hoặc cột tham chiếu, kỳ vọng giữ nguyên).
- Độ phủ: T25 ở mức PARTIAL.
- Bảo mật: **chờ reviewer độc lập**. Không tự gọi là đã duyệt.

## Đã làm

- Migration `supabase/migrations/0022_field_confirmation_values.sql` (tiến; không sửa migration đã áp dụng):
  - Bảng `field_confirmation_values(confirmation_id, old_value, new_value)`: khóa chính `confirmation_id`. Giữ nguyên ràng buộc giá trị của bảng gốc (không JSON null, không quá 8192 byte). RLS bật.
  - Chính sách đọc: người xác nhận đọc được giá trị của xác nhận mình đã ghi. Điều kiện là một `exists` trên bảng tham chiếu, chạy dưới quyền người gọi. Quyền cột: `confirmation_id`, `old_value`, `new_value`. Người dùng cuối không có quyền ghi.
  - Trigger `field_confirmation_values_consistent` (trước insert hoặc update): tham chiếu phải tồn tại (`P0002`). Giá trị vắng mặt chỉ đi với lý do `confirmed_absent`, và giá trị có mặt không mang lý do (`22023`).
  - Không dùng khóa ngoại. Lý do: TRUNCATE trên bảng được khóa ngoại tham chiếu bị chặn trước khi trigger chạy (`0A000`), làm đổi mã lỗi của chốt chỉ thêm đã có ở T14. Tham chiếu được kiểm trong trigger. Bản ghi tham chiếu không xóa được, nên liên kết vẫn đúng.
  - Sao chép giá trị hiện có, kiểm số dòng sau khi sao chép.
  - `record_field_confirmation`: validate như cũ. Ghi dòng tham chiếu (`extraction_id, field_path, new_absent_reason, actor_user_id`) vào `field_confirmations`, rồi ghi dòng giá trị, trong một giao dịch. Audit không đổi.
  - Bỏ cột `old_value` và `new_value` khỏi `field_confirmations`. Ràng buộc và quyền cột liên quan bị bỏ theo cột.
- `tests/db/field-confirmations.test.ts` (T14), năm chỗ sửa:
  - Hai chỗ đọc giá trị qua join với `field_confirmation_values`.
  - Chốt chỉ thêm: đổi `update ... set new_value` thành `update ... set field_path`. Kỳ vọng vẫn là `42501`.
  - Một chỗ đọc giá trị còn lại qua join. Kỳ vọng `{ n: 1, v: '"2026-04-30"' }` không đổi.
  - Chèn trực tiếp: bỏ cột `new_value` khỏi câu chèn. Kỳ vọng vẫn là `42501`.
- `tests/db/field-confirmation-values.test.ts` (mới, 6 kiểm thử T25).

## Lệnh đã chạy và kết quả

- Dữ liệu thật trước migration: hai xác nhận ghi bằng hàm cũ trên `aftervia_test` (một có giá trị 120 → 129, một vắng mặt có lý do `confirmed_absent`). Sau `npm run db:migrate` (`applied 1, already applied 22`): cột giá trị còn trên bảng chỉ thêm = 0; tham chiếu = 2; dòng giá trị = 2; sai lệch nhất quán = 0; mẫu giữ nguyên (120 và 129; vắng mặt với lý do).
- Nhóm liên quan, 5 tệp (T14, T25, migrations, restore-drill, pending-deletion-writes): 27/27 pass.
- `npm run verify`: exit 0. Bundle 69/69; quét bí mật 328 tệp, 5 luật; typecheck gốc và mobile; build landing và web; Vitest 63 tệp pass và 1 bỏ qua; 479 kiểm thử pass và 1 bỏ qua (tăng 6); test:loop đạt.
- Vitest JSON (`.loop/vitest.json`): `success=true`; 480 tổng; 479 pass; 0 fail; 1 pending.
- `node tools/loop/matrix.mjs from-report .loop/vitest.json`: không đổi dòng nào. PASS 34, NOT_RUN 12, FAIL 0; coverage PARTIAL 42, NONE 4.
- E2E không chạy lại trong lượt này. `tools/e2e`, `apps/web/src` và `services/api/src` không tham chiếu `field_confirmation`, nên luồng E2E không đi qua thay đổi này.

## Đột biến

- M1, bỏ kiểm nhất quán giá trị vắng mặt (`if false`): 1 kiểm thử đỏ.
- M2, nới điều kiện chính sách đọc thành `f.actor_user_id is not null`: không kiểm thử nào đỏ. Lý do: RLS trên `field_confirmations` vẫn giới hạn subquery theo người gọi, nên hai lớp bảo vệ chồng nhau. Đây là lớp bảo vệ kép, không phải lỗ hổng.
- M2b, chính sách đọc mở hoàn toàn (`using (true or exists ...)`): 1 kiểm thử đỏ, đúng test người khác không đọc được. Test bắt được việc mở chính sách khi lớp thứ nhất thật sự bị bỏ.
- M3, ghi sai giá trị mới vào bảng giá trị (`values (v_new, p_old_value, p_old_value)`): 4 kiểm thử đỏ (T14 và T25).
- Sau mỗi đột biến, `0022` được khôi phục từ bản sao, sha256 khớp. Chạy lại 13/13 pass.

## Giới hạn còn lại

1. Chưa có hàm xóa giá trị theo yêu cầu. Bảng sửa được, nên quản trị xóa được, nhưng chưa có quy tắc và chưa có đường dùng chung (WO11-02d).
2. Quyền đọc theo tổ chức (xem xác nhận của người khác trong case) chờ bảng extraction và case, như WO06-05.
3. Giá trị đã xóa không khôi phục được. Sao lưu cũ vẫn có thể chứa giá trị (WO16-01).
4. Không có khóa ngoại. Tính toàn vẹn của tham chiếu dựa vào trigger và vào việc bản ghi tham chiếu không xóa được.

## HawkScan

- Không chạy: `HAWK_API_KEY` không đặt và ứng dụng không chạy.

## Rollback

- Migration tiến. Quay lại cần migration mới: thêm lại cột giá trị vào `field_confirmations`, sao chép từ `field_confirmation_values`, khôi phục thân hàm `record_field_confirmation` của 0006, và bỏ bảng giá trị cùng trigger. Giá trị đã xóa khỏi bảng giá trị không tự trở lại.

## Việc tiếp theo

- WO11-02e-CASE (AUTO, Q2-C): `case_events.reason` sang bảng sửa được; T17 và T19 vẫn đạt.
