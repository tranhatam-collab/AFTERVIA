# 06 — Đề xuất tối ưu CI (giai đoạn E)

**Trạng thái: NOT_APPLIED.** Không đề xuất nào trong tài liệu này được áp dụng vào `ci.yml`.

## Lý do chưa áp dụng

- CI hiện không khởi động job nên không thể chạy thử thay đổi. [V]
- Thay đổi workflow mà chưa có run xanh là rủi ro: lỗi cú pháp có thể làm workflow không parse được. [R]
- `actionlint` không có trong môi trường, nên chưa lint được cục bộ. [V]
- Một số đề xuất đổi hành vi (chạy tuần tự, bỏ qua theo đường dẫn) cần chủ dự án quyết. [R]
- `ci.yml` là file dùng chung: Lane G có cùng nội dung trên PR #2, nên thay đổi ở đây ảnh hưởng cả hai lane. [V]

## Danh sách đề xuất

| # | Thay đổi | Tác dụng kỳ vọng | Rủi ro | Cách kiểm khi áp dụng | Trạng thái |
|---|---|---|---|---|---|
| 1 | `concurrency` ở cấp workflow, hủy run cũ của PR | Giảm phút khi push nhiều lần lên một PR | Hủy nhầm run cần thiết | Push hai commit liên tiếp: run cũ phải thành `cancelled`, run mới chạy đủ | NOT_APPLIED |
| 2 | `timeout-minutes` cho từng job | Chặn job treo tiêu phút | Cắt job chậm hợp lệ | Đặt ngưỡng cao hơn nhiều so với thời lượng đo được (2–6 phút, xem 03) | NOT_APPLIED |
| 3 | `e2e-web` chạy sau `verify` (`needs: verify`) | PR đỏ ở verify không tốn phút e2e | Tổng thời gian tăng khi PR xanh | So sánh số phút trước và sau trên một PR thử | PENDING quyết định |
| 4 | Bỏ `groundstead-verify` khỏi nhánh không có `groundstead/` | Giảm một job mỗi PR | Thay đổi file dùng chung giữa hai lane | Đếm job trước và sau | PENDING (chủ dự án, Lane G) |
| 5 | `actions/cache` cho trình duyệt Playwright, khóa theo phiên bản trong lockfile | Giảm thời gian tải Chromium | Cache miss; `--with-deps` vẫn phải chạy | So sánh thời lượng bước install trước và sau | NOT_APPLIED |
| 6 | `paths-ignore` cho tài liệu (`docs/**`, `**/*.md`) với `pull_request` | Bỏ qua CI cho PR chỉ có tài liệu | Nếu branch protection yêu cầu check, PR sẽ chờ mãi | Kiểm ruleset trước (H2 trong 03); thử trên PR chỉ có tài liệu | PENDING (chờ H2) |

## Bản nháp cho đề xuất 1 và 2 (không áp dụng)

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  verify:
    timeout-minutes: 30
  e2e-web:
    timeout-minutes: 30
  groundstead-verify:
    timeout-minutes: 15
```

Bản nháp chưa được kiểm cú pháp bằng công cụ nào. Khi áp dụng, cần parse YAML cục bộ và theo dõi run đầu tiên trên GitHub.

## Ước tính tiết kiệm

Chưa định lượng được. Không có số phút tính phí đáng tin (xem `03_BILLING_EVIDENCE.md`). Chỉ đo được sau khi CI chạy lại và trang Billing có số liệu.

## Không đề xuất

- Không chuyển `npm ci` sang artifact cache: artifact tốn dung lượng và thời gian tải, không tiết kiệm đáng kể. [R]
- Không thêm `workflow_dispatch`, vì quyết định D22 chưa được duyệt. [R]
- Không đổi phiên bản Node. `.nvmrc` = 22 đã khớp với cấu hình landing. [V]
