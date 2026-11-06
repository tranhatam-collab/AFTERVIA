# WO11-02g-MEM: thu hồi thành viên tổ chức khi xóa tài khoản; từ chối owner duy nhất

- Task: WO11-02g-MEM (AUTO, gate P0, phụ thuộc WO11-02a/b/c). Thực hiện quyết định Q4, phương án A, đã QUYẾT (`docs/plan/06_DECISIONS_DELEGATED.md`, dòng 27).
- Acceptance: T25 (kiểm thử mới và cũ) và T26 (áp lại tombstone sau khôi phục, có thành viên).
- Độ phủ: T25 và T26 ở mức PARTIAL. Đây không phải nghiệm thu WO11-02 toàn bộ.
- Bảo mật: **chờ reviewer độc lập**. Không tự gọi là đã duyệt.

## Đã làm

- Migration `supabase/migrations/0020_deletion_membership.sql` (migration tiến, không sửa migration đã áp dụng):
  - `public.sole_owner_organizations(p_user uuid) returns integer` (mới): số tổ chức mà người dùng là owner đang hoạt động và không còn owner đang hoạt động nào khác. Security definer, `search_path` cố định, không cấp cho `anon` và `authenticated`.
  - `public.request_account_deletion(text)` (create or replace), giữ nguyên các bước cũ (kiểm đăng nhập, kiểm mã yêu cầu, khóa hồ sơ, trả lại receipt khi đã có yêu cầu hoặc tombstone), thêm:
    1. Khóa mọi dòng owner đang hoạt động của các tổ chức mà người này là owner: `order by id ... for update`.
    2. Nếu `sole_owner_organizations > 0`: lỗi `55000` trước mọi thay đổi. API ánh xạ thành `409 invalid_state` qua `contractDbError`, đã có sẵn.
    3. Thu hồi thành viên ACTIVE của người này (`status = 'REVOKED'`, `revoked_at = now()`), đếm vào `access_revoked.memberships`.
    4. Bỏ `organization_membership` khỏi `pending`. Audit `account.delete.requested` ghi thêm `memberships_revoked`.
  - `public.reapply_account_tombstones()` (create or replace): sau khi khôi phục backup, thu hồi lại thành viên ACTIVE của mọi người có tombstone (T26). Audit `account.tombstone.reapplied` ghi thêm `memberships_revoked` và `organizations_without_active_owner` (đếm trên toàn DB, sau thu hồi). Không tự cấp owner.
- Không đổi `services/api`. Lỗi `55000` đã đi qua `contractDbError` (`services/api/src/http/app.ts`).
- Test:
  - `tests/db/account-deletion-membership.test.ts` (mới, 8 kiểm thử): owner duy nhất bị từ chối và không đổi gì; owner còn owner khác được thu hồi và owner kia giữ quyền; agent được thu hồi và không còn thấy tổ chức; cùng mã trả cùng receipt; owner bị từ chối gửi lại sau khi chỉ định owner khác; hai owner xin xóa cùng lúc (đúng một thành công, tổ chức còn owner); T26 khôi phục rồi áp lại tombstone; audit của bước áp lại.
  - `tests/api/account-deletion-http.test.ts` (+1): owner duy nhất qua HTTP nhận `409 invalid_state`, hồ sơ vẫn `ACTIVE`.
  - `tests/db/account-deletion.test.ts` (sửa expectation T25 cũ): `access_revoked` có `memberships: 0`; `pending` không chứa `organization_membership`.

## Lệnh đã chạy và kết quả

- `npm run db:migrate` với `TEST_DATABASE_URL` lấy từ `.github/workflows/ci.yml` (không in giá trị), trên `aftervia_test` đã có dữ liệu từ lần chạy trước: `migrate OK on aftervia_test: applied 1, already applied 20`. Áp gia tăng đúng.
- Nhóm liên quan: Vitest trên 6 tệp (account-deletion, account-deletion-membership, account-deletion-http, family-sharing, pending-deletion-writes, migrations): 40/40 pass, exit 0.
- `npm run verify`: exit 0. Bundle 69/69; quét bí mật 318 tệp, 5 luật; typecheck gốc và mobile; build landing và web; Vitest 61 tệp pass và 1 bỏ qua có chủ đích, 463 kiểm thử pass và 1 bỏ qua; test:loop đạt.
- `npx vitest run --reporter=json --outputFile=.loop/vitest.json`: `success=true`; 464 tổng, 463 pass, 0 fail, 1 pending.
- `node tools/loop/matrix.mjs from-report .loop/vitest.json`: không đổi dòng nào. Summary: PASS 34, NOT_RUN 12, FAIL 0; coverage PARTIAL 42, NONE 4.
- Ổn định: `account-deletion-membership.test.ts` chạy 3 lần liên tiếp, 8/8 mỗi lần.

## Đột biến (kiểm test có bắt được lỗi không)

- A. Bỏ kiểm owner duy nhất (`if false`): 5/14 kiểm thử đỏ (4 trong bộ membership, 1 HTTP). Đỏ tất định.
- B. Bỏ `for update` trên các dòng owner: 2/8 kiểm thử đỏ ở cả 5 lần chạy (kiểm đua, và kiểm audit "tổ chức không còn owner"). Test bắt được việc bỏ khóa.
- Sau mỗi đột biến, `0020` được khôi phục từ bản sao, sha256 khớp với bản gốc; chạy lại 14/14 pass.

## Quyền và ranh giới

- `request_account_deletion` vẫn chỉ cấp cho `authenticated`. `sole_owner_organizations` không cấp cho `anon` và `authenticated`. `reapply_account_tombstones` vẫn không cấp cho người dùng cuối (T26 kiểm).
- Trigger `refuse_writes_while_pending_deletion` (0018) không can thiệp ở đường này: thu hồi chạy trước khi hồ sơ chuyển sang `PENDING_DELETION`, và đường khôi phục không có `auth.uid()`. Nhánh `PENDING_DELETION` của trigger vẫn cho đổi sang `REVOKED` (đọc trong mã), nhưng chưa có kiểm thử riêng cho nhánh đó.
- Không dùng dữ liệu thật, không production, không khóa thật.

## Giới hạn còn lại

1. Owner duy nhất phải chỉ định owner khác trước khi xin xóa. Đường HTTP có sẵn là `POST /v1/organizations/{id}/members` (gọi `invite_member`) trong `services/api/src/http/app.ts`. Route này không có trong `contract.ts`, và Desk chưa có giao diện quản lý thành viên.
2. Sau khi khôi phục backup cũ, một tổ chức có thể không còn owner đang hoạt động. Hiện chỉ đếm trong audit (`organizations_without_active_owner`). Xử lý vận hành thuộc WO16-01. Đếm trên toàn DB là một lần quét bảng, chấp nhận được cho đường khôi phục; chưa đo trên dữ liệu lớn.
3. Phiên đăng nhập không đổi ở task này (WO11-02f-SESS, Q3).
4. Chưa xóa dữ liệu chính theo chính sách (WO11-02d, HUMAN).
5. Kiểm đua chỉ khẳng định kết quả (đúng một yêu cầu thành công), không liệt kê mọi thứ tự xen kẽ. Khóa là cơ chế; đột biến B chứng minh test bắt được việc bỏ khóa.

## HawkScan

- Không chạy: `HAWK_API_KEY` không đặt và ứng dụng không chạy. Hook sau commit `3f5a3fe` có cùng điều kiện nên không đủ điều kiện quét.

## Rollback

- Migration tiến, không gỡ. Nếu cần quay lại, một migration mới sẽ khôi phục thân hàm của 0014 (`request_account_deletion`, `reapply_account_tombstones`, xem `supabase/migrations/0014_account_deletion.sql`) và xóa `sole_owner_organizations`. Dữ liệu đã thu hồi không tự khôi phục; cần quyết định riêng.

## Việc tiếp theo

- WO11-02f-SESS (Q3-C, phiên 15 phút), WO11-02e-EXP, WO11-02e-CONF, WO11-02e-CASE (Q2-C): AUTO, đã thêm vào backlog, chưa làm.
- Reviewer độc lập cho các module bảo mật WO11-02 (theo mục "Các module chờ reviewer độc lập" trong `docs/plan/05_AUTONOMY_STATUS.md`).
