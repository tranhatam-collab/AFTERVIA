# WO11-02e-CASE: lý do trong lịch sử case nằm trong bảng sửa được (Q2, phương án C)

- Task: WO11-02e-CASE (AUTO, gate P0, phụ thuộc WO11-02c). Thực hiện Q2 phương án C, đã QUYẾT (`docs/plan/06_DECISIONS_DELEGATED.md`, dòng 25).
- Acceptance: T25 (6 kiểm thử mới trong `tests/db/case-event-reasons.test.ts`). T17 và T19 vẫn đạt. Hai kiểm thử đọc lý do (T20 và Desk) đổi sang join với bảng lý do; kỳ vọng giữ nguyên.
- Độ phủ: T25 ở mức PARTIAL.
- Bảo mật: **chờ reviewer độc lập**. Không tự gọi là đã duyệt.

## Đã làm

- Migration `supabase/migrations/0023_case_event_reasons.sql` (tiến; không sửa migration đã áp dụng):
  - Bảng `case_event_reasons(event_id, reason)`: khóa chính `event_id`, `reason` từ 1 đến 500 ký tự. RLS bật. Chính sách đọc theo cùng quy tắc với `case_events` (người tạo case hoặc thành viên tổ chức). Quyền cột đọc `event_id, reason` cho người đã đăng nhập. Không có quyền ghi cho người dùng cuối.
  - Trigger `case_events_reason_out` (trước insert trên `case_events`): đưa `reason` ra bảng riêng trước khi sự kiện được lưu, rồi đặt `reason` của sự kiện thành NULL. Ba hàm ghi hiện có (`create_case`, `transition_case` và hàm của Desk) không đổi.
  - Không dùng khóa ngoại. Trigger không kiểm tham chiếu, vì trigger chạy trước khi sự kiện được lưu. Giao dịch bảo đảm không có dòng lý do mồ côi: nếu insert sự kiện thất bại thì dòng lý do bị hủy cùng.
  - Sao chép lý do đã có vào `case_event_reasons`, rồi xóa khỏi `case_events` trong một câu lệnh có tắt tạm trigger chặn sửa `case_events_append_only`. Trigger được bật lại ngay, và kiểm số dòng trước khi tiếp tục.
  - Ràng buộc `case_events_reason_absent` (`reason is null`) thay cho ràng buộc cũ của cột. Ràng buộc này vẫn chặn khi trigger bị tắt.
  - Thu hồi quyền đọc cột `reason` của `case_events` đối với người đã đăng nhập. Lý do đọc qua `case_event_reasons`.
- `tests/db/cases.test.ts` (T20): câu đọc lịch sử đổi sang join với `case_event_reasons`. Kỳ vọng `reason: 'Lỗi vẫn còn sau sửa'` không đổi.
- `tests/db/desk.test.ts`: câu đọc lịch sử đổi sang join. Kỳ vọng `reason: 'Giao cho nhân viên'` không đổi.
- `tests/db/case-event-reasons.test.ts` (mới, 6 kiểm thử T25).

## Lệnh đã chạy và kết quả

- Kiểm chứng dữ liệu thật trên DB thử `aftervia_scratch_test` (tạo rồi xóa trong cùng lượt): dựng đến migration `0022`, tạo một case có lý do bằng `create_case`, chụp md5 của cặp (mã sự kiện, lý do), rồi áp dụng `0023`. Kết quả: cột `reason` vẫn còn nhưng không có giá trị; 0 sự kiện còn lý do; 1 dòng lý do; digest khớp tuyệt đối (`8a9102468d1cb7e8be1befbb147ac562`).
- `npm run db:migrate` trên `aftervia_test` (không có sự kiện có lý do ở thời điểm đó): `applied 1, already applied 23`.
- Nhóm liên quan, 6 tệp (case-event-reasons, cases, desk, case-kpis, migrations, restore-drill): 35/35 pass, exit 0.
- `npm run verify`: exit 0. Bundle 69/69; quét bí mật 332 tệp, 5 luật; typecheck gốc và mobile; build landing và web; Vitest 64 tệp pass và 1 bỏ qua; 485 kiểm thử pass và 1 bỏ qua (tăng 6); test:loop đạt.
- Vitest JSON (`.loop/vitest.json`): `success=true`; 486 tổng; 485 pass; 0 fail; 1 pending. Báo cáo có đủ 6 kiểm thử của `case-event-reasons`.
- `node tools/loop/matrix.mjs from-report .loop/vitest.json`: không đổi dòng nào. PASS 34, NOT_RUN 12, FAIL 0; coverage PARTIAL 42, NONE 4.
- `npm run e2e:web`: đạt 12/12. Luồng Desk mở case, phân loại, xử lý, giải quyết và đóng đi qua các chuyển trạng thái có lý do.

## Đột biến

- M1, không đưa lý do ra bảng riêng (bỏ insert trong trigger): 4/6 kiểm thử đỏ.
- M2, điều kiện khớp sự kiện là `or true`: không kiểm thử nào đỏ. Lý do: subquery vẫn chịu RLS của `cases` và `case_events`, nên người ngoài không thấy dòng nào. Lớp bảo vệ kép, không phải lỗ hổng.
- M2b, điều kiện hiển thị theo case là `and (true)`: không kiểm thử nào đỏ, cùng lý do như M2.
- M2c, chính sách bảng lý do mở hoàn toàn (`using (true or exists ...)`): 1/6 kiểm thử đỏ, đúng test người ngoài không đọc được.
- M3, giữ quyền đọc cột `reason` cho người đã đăng nhập: 1/6 đỏ.
- Sau mỗi đột biến, `0023` được khôi phục từ bản sao, sha256 khớp. Chạy lại 6/6 pass.

## Giới hạn còn lại

1. Cột `reason` của `case_events` vẫn còn, luôn NULL. Xóa hẳn cột cần viết lại ba hàm ghi (`create_case`, `transition_case` và hàm của Desk) để không insert vào cột đó. Việc này để lượt sau.
2. Người tham gia case (partner) không đọc được lý do, như trước. Quyền đọc theo người tham gia chờ quyết định.
3. Không có hàm xóa lý do theo yêu cầu. Bảng sửa được nên quản trị xóa được, nhưng chưa có quy tắc và đường dùng chung (WO11-02d).
4. Bước xóa lý do cũ tắt trigger chặn sửa của `case_events` trong đúng một câu lệnh của migration. Đây là thao tác có chủ đích, chỉ chạy một lần khi áp migration; ghi rõ để reviewer xem.
5. Sao lưu cũ vẫn có thể chứa lý do đã xóa (WO16-01).

## HawkScan

- Không chạy: `HAWK_API_KEY` không đặt và ứng dụng không chạy.

## Rollback

- Migration tiến. Quay lại cần migration mới: thêm lại cột `reason` vào `case_events` (nullable, rồi ràng buộc cũ), sao chép từ `case_event_reasons`, khôi phục hàm ghi, rồi bỏ trigger và bảng lý do. Lý do đã xóa không tự trở lại.

## Việc tiếp theo

- Viết lại ba hàm ghi để bỏ cột `reason` khỏi `case_events` hoàn toàn.
- Quyết định quyền đọc lý do cho người tham gia case (chờ người quyết).
- Reviewer độc lập cho các module bảo mật WO11-02.
