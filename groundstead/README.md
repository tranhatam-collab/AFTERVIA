# Groundstead · Đất Lành

Nền tảng chuẩn bị khẩn cấp và lộ trình sống tự chủ, bền vững "Từ phố về đất lành": Chế độ 72 giờ đô thị dùng được khi mất mạng, 8 module lộ trình, cảnh báo đa nguồn và các Gói Groundstead tuyển chọn từ nhà cung cấp có sẵn (không kho).

> **Trạng thái:** kế hoạch đã chốt, vòng lặp phát triển bắt đầu ngày 06/11/2026. Chưa có sản phẩm chạy, chưa có người dùng, chưa có doanh thu. "Groundstead" là tên làm việc, chưa tra nhãn hiệu xong.
>
> **Vị trí tạm:** thư mục này nằm trong repo AFTERVIA cho đến khi repo `tranhatam-collab/groundstead` được tạo; khi đó toàn bộ lịch sử được tách sang repo mới (`docs/plan/01_DEV_LOOP_PLAN.md` §2). Thư mục tự đóng gói, không phụ thuộc mã AFTERVIA.

## Tài liệu

| Tệp | Nội dung |
|---|---|
| `docs/plan/00_MASTER_PLAN.md` | Kế hoạch hợp nhất (sản phẩm, nội dung, cảnh báo, thương mại, pháp lý, lộ trình, chi phí, rủi ro) |
| `docs/plan/01_DEV_LOOP_PLAN.md` | Kế hoạch build và giao thức vòng lặp |
| `docs/plan/02_ACCEPTANCE.csv` | 37 tiêu chí nghiệm thu GT01–GT37 |
| `docs/plan/03_DECISIONS.md` | Sổ quyết định |
| `docs/plan/05_STATUS.md` | Trạng thái vòng lặp |
| `docs/plan/backlog.json` | Backlog máy đọc được (68 task) |
| `docs/evidence/` | Bằng chứng từng task |

## Lệnh

Chạy trong thư mục `groundstead/`, Node.js 22.

| Lệnh | Tác dụng |
|---|---|
| `npm run verify` | Toàn bộ kiểm tra; điều kiện để đánh dấu task DONE |
| `npm run loop -- decide` | Việc tiếp theo của vòng lặp |
| `npm run loop -- status` | Thống kê backlog |
| `npm run matrix -- summary` | Trạng thái nghiệm thu |
