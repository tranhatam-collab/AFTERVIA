# 13 — Nghiệm thu (giai đoạn I)

| # | Tiêu chí | Cách kiểm | Kết quả | Nhãn |
|---|---|---|---|---|
| AC-01 | Có đủ 14 tệp trong `docs/operations/zero-cost-cicd/` | Liệt kê thư mục sau khi tạo | ĐẠT | [V] |
| AC-02 | Chi phí Actions = 0 USD có bằng chứng từ trang billing | Trang Billing & plans | CHƯA ĐẠT | [U] [P] |
| AC-03 | `ci.yml` có ít nhất một run hoàn tất trên PR | `list_workflow_runs` | ĐẠT (13/11): run 132 success trên `4a8449b`, 3 job chạy thật, 2 m 03 s | [V] |
| AC-04 | Landing build được | `npm run build:landing` | ĐẠT: 13 tệp, exit 0 | [V] |
| AC-05 | Quét bí mật sạch | `npm run check:secrets` | ĐẠT: 582 tệp, 6 quy tắc | [V] |
| AC-06 | Toàn bộ verify pass | `npm run verify` | ĐẠT: exit 0 | [V] |
| AC-07 | Landing được triển khai lên Cloudflare Pages | Dashboard Pages | CHƯA ĐẠT: không có tài khoản, chưa được duyệt | [B] |
| AC-08 | Không đổi DNS, không đổi production | Không có hành động nào như vậy trong lệnh | ĐẠT | [V] |
| AC-09 | Không merge `main`, không force push, không xóa nhánh | Lịch sử git và PR #1 còn nguyên | ĐẠT | [V] |
| AC-10 | Không đưa bí mật vào repo hoặc chat | `check:secrets` và rà soát tài liệu | ĐẠT | [V] |
| AC-11 | Đường lui được ghi lại | `11_ROLLBACK.md` | ĐẠT: đã ghi, chưa kiểm thử | [R] |
| AC-12 | Đề xuất tối ưu CI được kiểm chứng trên CI | Run `ci.yml` với thay đổi | CHƯA ĐẠT: đề xuất chưa áp dụng, CI không chạy | [B] |

## Tóm tắt

- Đạt: AC-01, AC-04, AC-05, AC-06, AC-08, AC-09, AC-10, AC-11, và AC-03 từ 13/11.
- Chưa đạt: AC-02, AC-07, AC-12.
- Không đánh dấu PASS cho mục nào thiếu bằng chứng.
