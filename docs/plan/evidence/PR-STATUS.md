# Trạng thái PR nháp

- Nhánh làm việc: `ccr-4544c9f7-b1t50m`, đã push tới `98ee852`.
- Lần thử tạo PR nháp với base `main`: thất bại, `Validation Failed: PullRequest.base (invalid)`, vì repo chưa có nhánh `main`.
- Ngày 31/10/2026, chủ dự án đồng ý về ý định tạo base. Khi phân tích cách thực hiện, phương án đã đề xuất không dùng được.

## Vì sao không tạo `main` từ `98ee852`

- `98ee852` là head của nhánh làm việc. Nếu base trùng head thì không có commit nào để PR thể hiện.
- Mọi base là tổ tiên của nhánh đều chứa commit gốc `2bfc78f` (khung repo và toàn bộ kế hoạch). Làm vậy là đưa kế hoạch lên `main` mà chưa qua review. Quy tắc giao hàng trong `docs/spec/AFTERVIA_AZ_2026-10-31/engineering/06_DELIVERY_CICD_AND_EXIT.md` yêu cầu `main` được bảo vệ và PR có review độc lập.

## Phương án cần chủ dự án chọn

- **A (khuyến nghị):** tạo `main` là một commit gốc rỗng, không chứa file. Rebase nhánh làm việc lên `main`, rồi push với `--force-with-lease`. Hash các commit sẽ đổi, nội dung giữ nguyên. PR thể hiện đầy đủ thay đổi để review. Cần phép rõ ràng để ghi đè lịch sử của nhánh này.
- **B:** đặt `main` = `2bfc78f`. PR chỉ thể hiện các commit sau `2bfc78f`. Phần kế hoạch đã nằm trên `main` mà không qua review.

## Trạng thái

- BLOCKED cho đến khi chọn A hoặc B.
- Vòng lặp vẫn tiếp tục trên nhánh làm việc. Không thử tạo PR lại trong các vòng lặp cho tới khi có lựa chọn.
- Không push `main` và không ghi đè lịch sử nào khi chưa có phê duyệt.
