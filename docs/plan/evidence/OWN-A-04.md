# OWN-A-04: lời mời từ chối tài khoản đã yêu cầu xóa (D-02)

- Ngày 10/11/2026. Migration mới: `0027_invite_refuses_deleted_accounts.sql`.
- Test mới: `tests/db/invite-deleted-account.test.ts` (4 kiểm thử). Dữ liệu tổng hợp.

## Vấn đề

`invite_member` (0001) và `invite_case_participant` (0010) chỉ kiểm hồ sơ có tồn tại:

```
if not exists (select 1 from public.profiles where id = p_target) then
  raise exception 'target profile not found' using errcode = 'P0002';
end if;
```

Không hàm nào kiểm `account_tombstones`. Hệ quả: một tài khoản đã yêu cầu xóa vẫn được mời lại, và
với `invite_member`, dòng membership cũ được kích hoạt lại thành `ACTIVE` (0001:198-202). Hai lớp
bảo vệ hiện có không chặn việc này: trigger của 0018 chỉ chặn người **gọi** khi đang chờ xóa, còn
0020 thu hồi membership tại thời điểm xóa chứ không chặn lần mời sau đó. Các hàm gia đình (0015) đã
có kiểm tra này, nên hai hàm trên là chỗ sót.

## Đã làm

Migration 0027 `create or replace` hai hàm, lấy nguyên văn thân hàm gốc và chèn đúng một kiểm tra
ngay sau kiểm xác thực, theo mẫu của 0015 (chặn khi người gọi **hoặc** người được mời có tombstone):

```
if exists (select 1 from public.account_tombstones where user_id in (v_uid, p_target)) then
  raise exception 'account deletion requested' using errcode = '42501';
end if;
```

`invite_case_participant` dùng cùng mẫu với `p_actor`. `create or replace` giữ nguyên quyền của hàm,
nên bề mặt client của OWN-A-03 không đổi.

## Kiểm thử

| Kiểm thử | Nội dung |
|---|---|
| D-02 tổ chức | Mời tài khoản đã yêu cầu xóa bị từ chối 42501 `account deletion requested`; không có dòng `organization_members` nào xuất hiện |
| D-02 case | Chủ case mời partner đã yêu cầu xóa bị từ chối 42501; không có dòng `case_participants` nào xuất hiện |
| D-02 không hồi quy | Tài khoản bình thường vẫn được mời vào tổ chức (`status = 'ACTIVE'`) và vào case |
| D-02 không hồi quy | Thành viên đã bị thu hồi nhưng không yêu cầu xóa vẫn được mời lại, và đổi vai trò thành `manager` |

## Cổng

- Đỏ trước khi sửa: giữ lại 0027, chạy riêng tệp test → 2 trong 4 kiểm thử đỏ (đúng hai kiểm thử
  bảo mật; hai kiểm thử không hồi quy vẫn xanh).
- Xanh sau khi áp 0027: 4/4.
- Một lỗi của chính test đã sửa trong lượt: cột `case_participants.actor_user_id` không tồn tại, tên
  đúng là `actor_id`; và một lỗi typecheck strict khi truy cập `[0]`, đã đổi sang mẫu `first()` của repo.
- `npm run verify`: exit 0 (xem commit). `npm run e2e:web`: exit 0.

## Giới hạn

- Chỉ chặn ở thời điểm mời. `change_member_role` không được đổi trong lượt này: một thành viên đang
  ACTIVE mà sau đó yêu cầu xóa sẽ bị 0020 thu hồi membership, nên không còn là thành viên để đổi vai trò.
- Kiểm theo `account_tombstones`. Trạng thái `profiles.deletion_status` không được dùng làm điều kiện,
  để giữ đúng một nguồn sự thật như các hàm gia đình đang làm.
