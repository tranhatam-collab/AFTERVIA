# 02 — Kiểm toán baseline (giai đoạn A)

Nhãn [V], [R], [U], [P], [B]: xem `01_README.md`.

## Trạng thái repository

| Mục | Kết quả | Nhãn |
|---|---|---|
| Nhánh hiện tại | `ccr-4544c9f7-b1t50m` | [V] |
| HEAD trước lượt này | `6d3a7fc83d1d17e529a09b11c9c43c4cefc7f2db` | [V] |
| Cây làm việc | sạch: 0 đường dẫn thay đổi, kể cả sau khi chạy verify và build | [V] |
| Remote `origin` | `https://github.com/tranhatam-collab/AFTERVIA`, không có thông tin xác thực trong URL | [V] |
| Visibility | private, `can_push: true` | [V] (list_repos) |
| Pull request cho nhánh | #1: draft, mở, head `6d3a7fc`, base `main` = `b809781` | [V] (list_pull_requests) |
| Thư mục `.github/workflows/` | chỉ có `ci.yml` | [V] |
| Thư mục `docs/operations/` | chưa tồn tại trước lượt này | [V] |
| Tệp môi trường được git theo dõi | chỉ `.env.example` | [V] (`git ls-files`) |
| Tệp khóa, chứng chỉ được theo dõi | không có | [V] |
| Cấu hình Cloudflare trong repo (wrangler) | không có | [R] lượt trước |
| Phiên bản Node yêu cầu | `.nvmrc` = 22 | [V] |

## Môi trường trong phiên

| Mục | Kết quả | Nhãn |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | không đặt | [V] (chỉ kiểm sự có mặt) |
| `CLOUDFLARE_ACCOUNT_ID` | không đặt | [V] |
| `wrangler` | không cài | [V] |
| `actionlint` | không cài, nên chưa lint được workflow cục bộ | [V] |
| Biến token GitHub | có đặt; giá trị không in ra; không dùng ngoài công cụ MCP | [V] |
| Công cụ truy cập billing | không có trong phiên | [U] |
| Công cụ truy cập Cloudflare | không có connector Cloudflare trong phiên | [U] |

## Cấu hình `ci.yml` (đã đọc toàn bộ 100 dòng)

- Trigger: `pull_request` (mọi nhánh) và `push` chỉ nhánh `main`. Push lên nhánh làm việc chỉ chạy qua `pull_request`. [V]
- Quyền mặc định: `contents: read`. [V]
- Ba job, đều chạy trên `ubuntu-latest`: `verify`, `e2e-web`, `groundstead-verify`. [V]
- Không có `timeout-minutes`, `concurrency`, `needs`, tham chiếu `secrets.`, upload/download artifact, hay `actions/cache`. [V]
- Action được ghim theo SHA (`actions/checkout`, `actions/setup-node`). [V]

Chi tiết: `05_CI_INVENTORY.md`.

## Lịch sử run `ci.yml` (API, lượt này)

Tổng số run của workflow: 130. Mười hai run gần nhất:

| Run | Tạo lúc (UTC) | Kết quả | Thời lượng | Ghi chú |
|---|---|---|---|---|
| 42870398639 | 10/11 17:58:37 | failure | 5 s | PR #1 |
| 42869686754 | 17:54:19 | failure | 4 s | PR #1 |
| 42869079792 | 17:50:42 | failure | 4 s | PR #2 (lane G) |
| 42869040802 | 17:50:29 | failure | 7 s | PR #2 (lane G) |
| 42868601856 | 17:47:53 | failure | 5 s | PR #2 (lane G) |
| 42861241240 | 17:05:09 | failure | 4 s | PR #1 |
| 42858669998 | 16:50:31 | failure | 4 s | PR #2 (lane G) |
| 42813577068 | 12:11:03 | success | 3 m 58 s | PR #1 |
| 42813434092 | 12:10:03 | success | 5 m 42 s | PR #1 |
| 42812957967 | 12:06:37 | success | 2 m 07 s | PR #1 |
| 42812018835 | 12:00:01 | success | 2 m 42 s | PR #1 |
| 42811155973 | 11:53:34 | success | 1 m 56 s | PR #1 |

[V] (`list_workflow_runs`).

Ghi chú:

- Run 42870398639 được đo qua `get_workflow_run_usage`: 3 job, thời lượng mỗi job 0 ms. [V]
- Từ 16:50 UTC 10/11, mọi run đều thất bại trong 4–7 giây. Đó là dấu hiệu job không khởi động được, không phải lỗi kiểm thử. [V] số liệu thời lượng; [R] cách diễn giải.
- Commit `6d3a7fc` có trên remote (head của PR #1), nhưng không có run `ci.yml` nào gắn với SHA này. Run mới nhất gắn với `cfd371c`. [V]
- Một run không thuộc repo này (workflow id 414146482, đường dẫn `BuildFailed`) báo `startup_failure` trên các PR, lần gần nhất khoảng 07:04 UTC 11/11. [R] Nguồn của workflow này chưa xác định.

## Kết luận giai đoạn A

- Repo sạch, nhánh đúng, PR #1 đang mở và là PR của nhánh này. Không cần tạo PR mới. [V]
- Không có secret nào được git theo dõi, chỉ có `.env.example`. [V]
- Workflow `ci.yml` có cấu trúc hợp lý, nhưng không tạo được run hoàn tất từ 17:58 UTC 10/11. Theo bằng chứng hiện có, nguyên nhân nằm ngoài nội dung workflow. [V] + [R]
