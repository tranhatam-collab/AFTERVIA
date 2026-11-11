# 08 — Kết quả kiểm thử (giai đoạn F)

Mọi kết quả dưới đây đến từ lệnh chạy trong lượt này, trừ khi ghi khác.

## Lệnh đã chạy

| Lệnh | Kết quả | Nhãn |
|---|---|---|
| `git status --porcelain` (trước và sau khi chạy) | 0 thay đổi | [V] |
| `git rev-parse HEAD` | `6d3a7fc83d1d17e529a09b11c9c43c4cefc7f2db` | [V] |
| `node --version` | `v22.23.4`, khớp với `.nvmrc` = 22 ở mức major | [V] |
| `npm run build:landing` | `landing OK: 13 tệp, môi trường preview` | [V] |
| `npm run check:secrets` | `secret scan OK: 582 files, 6 rules` | [V] |
| `npm run verify` | **exit 0** (chi tiết bên dưới) | [V] |
| `get_workflow_run_usage` (6 run) | xem `03_BILLING_EVIDENCE.md` | [V] |
| `actionlint` | không có sẵn, không chạy được | [V] |

## `npm run verify`: chi tiết

Chuỗi lệnh: `check:bundle` → `check:secrets` → `typecheck` → `typecheck:mobile` → `build:landing` → `build:web` → `test` → `test:loop`. Exit 0 nghĩa là mọi bước đều thoát 0.

| Bước | Kết quả quan sát được |
|---|---|
| `check:bundle` | `bundle OK: 69 files match 04_SHA256SUMS.txt` |
| `check:secrets` | `secret scan OK: 582 files, 6 rules` |
| `typecheck` | `tsc -p tsconfig.json`, thoát 0 |
| `typecheck:mobile` | `tsc -p apps/mobile/tsconfig.json`, thoát 0 |
| `build:landing` | `landing OK: 13 tệp, môi trường preview` |
| `build:web` | `vite v8.3.5`, build xong, thoát 0 |
| `test` (vitest) | Test Files: 90 passed, 1 skipped (91). Tests: 696 passed, 1 skipped (697). |
| `test:loop` | 27 pass, 0 fail, 0 skipped |

Sau verify, `git status --porcelain` trả về 0 thay đổi. [V]

Môi trường: Postgres cục bộ được khởi động bằng `service postgresql start`. Biến `TEST_DATABASE_URL` được lấy từ `ci.yml` lúc chạy, không ghi vào tài liệu. [V]

Log đầy đủ được lưu ở thư mục scratchpad của phiên, không đưa vào repo.

## Chưa chạy trong lượt này

| Mục | Lý do | Nhãn |
|---|---|---|
| `npm run e2e:web` | Không nằm trong đường triển khai landing; không cần cho quyết định lộ trình | [R] |
| Bất kỳ run `ci.yml` nào trên GitHub | Platform không khởi động job (xem `02_AUDIT.md`, `03_BILLING_EVIDENCE.md`) | [V] |
| Lint workflow bằng `actionlint` | Công cụ không có sẵn | [V] |
| Kiểm cú pháp YAML cho đề xuất trong `06` | Đề xuất chưa áp dụng | [V] |

## Lưu ý

Số test trong thông điệp commit cũ (ví dụ 681 hoặc 678 pass) không dùng để so sánh với lượt này. Số liệu ở trên lấy từ đầu ra thật của lượt này.
