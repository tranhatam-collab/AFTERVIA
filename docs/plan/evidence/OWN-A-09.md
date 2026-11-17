# OWN-A-09: chặn trên số gói xuất còn hiệu lực (D-03)

- Ngày 10/11/2026. Migration mới: `0030_export_live_limit.sql`.
- Test mới: `tests/db/export-live-limit.test.ts` (4 kiểm thử). Dữ liệu tổng hợp.

## Vấn đề

`store_export` (0021) không giới hạn số gói xuất. Mỗi gói giữ nội dung năm tệp trong `export_bodies`
suốt 24 giờ, nên một tài khoản có thể tạo gói liên tục và tích lũy dữ liệu. `purge_expired_export_bodies()`
đã tồn tại và **đã có kiểm thử** (`tests/db/export-bodies.test.ts`), nhưng nó chỉ dọn phần **đã** hết
hạn, nên không chặn được việc tích lũy trong cửa sổ 24 giờ.

## Đã làm

Migration 0030 `create or replace` `store_export`, giữ nguyên văn thân hàm của 0021 và chèn chặn trên
**10 gói còn hiệu lực** cho mỗi người:

```
select count(*) into v_live from public.export_jobs
 where owner_user_id = v_uid and expires_at > now();
if v_live >= v_live_limit then
  raise exception 'too many live exports' using errcode = '55000';
end if;
```

Vị trí quan trọng: đặt **sau** nhánh lặp lại (`request_id` đã dùng trả về gói cũ), nên gọi lại cùng mã
vẫn trả gói cũ dù đã đạt giới hạn. Mã `55000` được API ánh xạ sang **409 `invalid_state`** nhờ OWN-A-08.

## Kiểm thử

| Kiểm thử | Nội dung |
|---|---|
| Đạt giới hạn | Tạo đủ 10 gói; gói thứ 11 bị từ chối 55000 `too many live exports`; số gói còn hiệu lực vẫn là 10 |
| Lặp lại khi đã đầy | Gọi lại với `request_id` đã dùng vẫn trả đúng gói cũ, không tạo thêm |
| Giới hạn theo từng người | Tài khoản khác không bị chặn bởi tài khoản đầu |
| Gói chỉ rời khỏi bộ đếm theo thời gian | `export_jobs` từ chối UPDATE (chỉ thêm, 42501) và ràng buộc `export_jobs_ttl` từ chối `expires_at` ở quá khứ (23514) **kể cả khi đã tắt trigger** |

## Giới hạn

- Kiểm thử **không** chạy được đường "gói đã hết hạn thì không còn tính". Lý do đã đo trong lượt: bảng
  `export_jobs` chỉ thêm nên không UPDATE được, và ràng buộc `export_jobs_ttl` từ chối `expires_at` ở
  quá khứ, mà check constraint thì `session_replication_role = replica` không bỏ qua. Nghĩa là không có
  cách làm một gói hết hạn sớm trong kiểm thử. Kiểm thử thứ tư ghi lại đúng tính chất đó, vì nó cũng là
  điều đáng khóa: không gì có thể rút ngắn tuổi thọ một gói để giải phóng chỗ sớm.
- Con số 10 là chọn theo phán đoán, chưa có căn cứ từ dữ liệu sử dụng. Nằm trong migration dưới dạng
  `v_live_limit constant integer := 10`.
- **Vẫn là việc của người**: chọn nơi chạy `purge_expired_export_bodies()` theo lịch. Repo không có lịch
  nào, nên nội dung hết hạn chỉ được dọn khi có ai gọi hàm. Chặn trên này giới hạn thiệt hại, không thay
  cho việc dọn.
- Chưa giới hạn tổng kích thước, chỉ giới hạn số gói.
