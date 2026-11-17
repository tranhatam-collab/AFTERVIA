# Zero-cost CI/CD — bộ tài liệu vận hành

Mã lệnh: DEVOPS-ZERO-COST-CF-20261111
Ngày lập: 2026-11-11
Repository: tranhatam-collab/AFTERVIA (private)
Nhánh làm việc: `ccr-4544c9f7-b1t50m`
Baseline SHA: `6d3a7fc83d1d17e529a09b11c9c43c4cefc7f2db`
Pull request: #1 (draft, mở), base `main`

**Trạng thái: HOLD** (không GO). Không có thay đổi nào lên production, DNS, workflow hay secret.

## Kết luận ngắn

1. **CI trên GitHub không chạy được.** Run `ci.yml` gần nhất tạo lúc 2026-11-10 17:58:37 UTC. Các run từ 16:50 đến 17:58 UTC cùng ngày đều thất bại trong 4–7 giây. Commit `6d3a7fc` có trên remote nhưng không có run `ci.yml` nào gắn với SHA này. Nguyên nhân chưa xác định và nằm ngoài nội dung workflow. [V]
2. **Chi phí "0 USD" chưa được chứng minh.** Repo là private, nên phút Actions tính theo hạn mức gói. API đo thời lượng cho năm run thành công (2–6 phút) đều trả về 0 phút tính phí. Con số này không khớp, nên không dùng để kết luận. Cần chủ dự án đối chiếu trang Billing. [V] + [U]
3. **Lộ trình:** A (Cloudflare Pages) cho landing là lựa chọn, nhưng BLOCKED. B (API trên Workers) bị loại. C (runner tự host) không được ủy quyền. D (giữ GitHub-hosted, giảm phút) là hướng cho CI, chưa áp dụng. [V] + [R]
4. **Landing build được cục bộ** (13 tệp, môi trường preview). Chưa có tài khoản Cloudflare trong phiên. Chưa có phê duyệt nội dung (HUM-WEB-03). Chưa có quyết định hosting và DNS (D14, WEB-02). [V] + [U] + [R]
5. **Việc cần chủ dự án làm:** xem `12_OWNER_APPROVALS.md`.

## Danh mục

| Tệp | Nội dung | Giai đoạn |
|---|---|---|
| `01_README.md` | Chỉ mục, kết luận, quy ước nhãn | — |
| `02_AUDIT.md` | Kiểm toán baseline, lịch sử run | A |
| `03_BILLING_EVIDENCE.md` | Số đo phút, hạn mức, giả thuyết | B |
| `04_ROUTE_DECISION.md` | Lựa chọn lộ trình A/B/C/D | C |
| `05_CI_INVENTORY.md` | Kiểm kê `ci.yml` | A, E |
| `06_CI_OPTIMIZATION_PLAN.md` | Đề xuất tối ưu, chưa áp dụng | E |
| `07_SAFE_TEST_AREA.md` | Vùng thử an toàn | D |
| `08_TEST_RESULTS.md` | Lệnh đã chạy và kết quả | F |
| `09_CONTROLLED_SWITCH.md` | Công tắc có kiểm soát (chưa thực hiện) | G |
| `10_DEPLOY_PROCESS.md` | Quy trình triển khai landing | H |
| `11_ROLLBACK.md` | Đường lui | H |
| `12_OWNER_APPROVALS.md` | Việc chờ chủ dự án | — |
| `13_ACCEPTANCE.md` | Tiêu chí nghiệm thu | I |
| `14_FINAL_REPORT.md` | Báo cáo cuối | I |

## Quy ước nhãn

- **[V]** VERIFIED: có lệnh hoặc API trả kết quả trong lượt này.
- **[R]** REPORTED: lấy từ lượt trước, từ tài liệu trong repo, hoặc từ kết quả tra cứu web. Chưa đo lại.
- **[U]** UNVERIFIED: không có quyền hoặc công cụ để kiểm.
- **[P]** PENDING: chờ chủ dự án quyết định hoặc cung cấp.
- **[B]** BLOCKED: không tiến tiếp được vì phụ thuộc bên ngoài.

## Ranh giới của lượt này

- Chỉ thêm tệp trong `docs/operations/zero-cost-cicd/`. Không sửa `.github/workflows/`, `groundstead/`, migration hay mã nguồn.
- Không merge vào `main`. Không force push. Không rebase. Không xóa nhánh.
- Không đổi DNS. Không triển khai production. Không tạo tài khoản hay project trên Cloudflare.
- Không đưa khóa, token hay mật khẩu vào tài liệu, commit hay chat. Biến Cloudflare không có trong phiên. Biến token GitHub có sẵn trong môi trường, nhưng giá trị không được in và không dùng ngoài công cụ MCP.
- Thay đổi nằm trên nhánh đã được chỉ định. Không tạo nhánh mới.
- Lane G (`groundstead/`, PR #2) không bị tác động.
