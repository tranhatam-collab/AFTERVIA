# OWN-A-06: khóa cả tập owner, tổ chức không thể còn 0 owner (D-06)

- Ngày 10/11/2026. Migration mới: `0029_owner_set_lock.sql`.
- Test mới: `tests/db/owner-set-race.test.ts` (2 kiểm thử đua). Dữ liệu tổng hợp.

## Vấn đề

`change_member_role` và `revoke_member` (0001) chỉ khóa dòng thành viên đích:

```
select * into v_target from public.organization_members
 where org_id = p_org and user_id = p_target and status = 'ACTIVE' for update;
```

rồi đếm owner còn lại bằng `where ... and user_id <> p_target`, **không khóa** các dòng owner khác.
Hai owner cùng thu quyền của nhau trong hai transaction song song đều đọc thấy người kia còn ACTIVE,
nên cả hai qua được điều kiện và tổ chức còn 0 owner. `request_account_deletion` (0020) đã khóa cả
tập owner theo thứ tự id nên an toàn với hai hàm này, nhưng hai hàm này chưa an toàn với nhau.

## Đã làm

Migration 0029 `create or replace` cả hai hàm, giữ nguyên văn thân hàm của 0001 và chèn ngay sau kiểm
xác thực một khóa trên toàn bộ tập owner đang hoạt động của tổ chức, theo thứ tự id:

```
perform 1
  from public.organization_members o
 where o.org_id = p_org and o.role = 'owner' and o.status = 'ACTIVE'
 order by o.id
   for update;
```

Khóa đặt trước cả bước đọc vai trò người gọi, nên người đến sau đọc trạng thái đã commit của người
đến trước. Cùng thứ tự khóa (theo `id`) với `request_account_deletion` của 0020, nên hai hàm không
khóa chéo nhau.

## Kiểm thử

Hai kiểm thử dùng hai kết nối riêng, mỗi kết nối nằm trong transaction của mình, có
`statement_timeout` 15 giây để không treo:

| Kiểm thử | Nội dung |
|---|---|
| Hai owner thu quyền của nhau | A thu quyền B và giữ transaction mở; lời gọi của B phải chờ khóa. Sau khi A commit, lời gọi của B bị từ chối. Cuối cùng tổ chức còn đúng 1 owner |
| Một owner thu quyền, owner kia tự hạ vai trò | Cùng cách, qua `change_member_role`. Tổ chức còn đúng 1 owner |

Kiểm thử khẳng định **bất biến** (còn đúng 1 owner, và người đến sau bị từ chối), không khẳng định
một mã lỗi duy nhất: người đến sau có thể nhận 42501 nếu đã mất quyền owner khi đọc trạng thái đã
commit, hoặc 23514 nếu là owner cuối cùng. Cả hai đều giữ bất biến.

## Cổng

- Đỏ trước khi áp 0029: 2/2 kiểm thử đỏ, đúng ở `expect(outcome.ok).toBe(false)` — tức cả hai lời gọi
  đồng thời đều thành công, là chính lỗ hổng.
- Xanh sau khi áp: 2/2.
- `npm run verify` và `npm run e2e:web`: xem commit.

## Giới hạn

- Khóa rộng hơn mức tối thiểu: mọi lời gọi hai hàm này đều khóa tập owner của tổ chức, kể cả khi đích
  là một agent. Đổi lấy sự đơn giản và một thứ tự khóa duy nhất. Tổ chức có nhiều owner và nhiều thao
  tác thành viên đồng thời sẽ xếp hàng ở điểm này.
- Không đổi `invite_member`: thêm owner không thể làm tổ chức mất owner.
