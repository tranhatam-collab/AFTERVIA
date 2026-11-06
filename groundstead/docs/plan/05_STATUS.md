# Groundstead — Trạng thái vòng lặp

- Cập nhật: 06/11/2026, sau vòng 5 (GS-030).
- Trạng thái: **CONTINUE** — vòng lặp đang chạy bằng chuỗi `send_later` (writer duy nhất).
- Vị trí: repo AFTERVIA, nhánh `ccr-8dbbf147-1ge7hc`, thư mục `groundstead/`. Repo riêng `tranhatam-collab/groundstead` chưa tồn tại (GS-H01).
- Ngân sách: 5/100 vòng.

## Vòng gần nhất
| Vòng | Task | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | GS-000 Khung dự án và công cụ vòng lặp | DONE — verify exit 0, 23/23 kiểm thử; GT01 PASS (PARTIAL), GT02 PASS (FULL) | `docs/evidence/GS-000.md` |
| 2 | GS-010 Next.js EN/VI, hreflang, sitemap, quét bundle | DONE — verify exit 0, 35/35 kiểm thử; GT31 PASS (PARTIAL); 0 lỗ hổng npm | `docs/evidence/GS-010.md` |
| 3 | GS-080 Preview riêng tư trên Vercel | DONE — deployment READY, Vercel Authentication mức `all`, nội dung /vi/ kiểm qua quyền truy cập | `docs/evidence/GS-080.md` |
| 4 | GS-011 Lược đồ nội dung, sổ nguồn/quyền, nhãn duyệt | DONE — verify exit 0, 54/54 kiểm thử; GT03, GT04 PASS (PARTIAL); 7 đột biến đều bị bắt | `docs/evidence/GS-011.md` |
| 5 | GS-030 Sổ nguồn và quyền, 10 content spec | DONE một phần có chủ đích — verify exit 0, 61/61 kiểm thử; 4/16 nguồn (Mỹ) tái sử dụng được, 12 nguồn link-only vì **mạng chặn**; GS-038 BLOCKED | `docs/evidence/GS-030.md` |

## Việc kế tiếp
- GS-015 (gói quốc gia VN/US), rồi GS-031 (3 thẻ an toàn đầu, chỉ trích 4 nguồn Mỹ đã được phép).

## Chờ chủ dự án (đang chặn đường chính)
- **Mạng tới các trang nguồn (GS-038, mới):** môi trường `Default` chặn mọi tên miền nguồn chính thức (proxy trả 403). Không đọc được điều khoản của WHO, IFRC, các cơ quan Việt Nam… nên chưa có nguồn nào ngoài Mỹ dùng được. Cần chủ dự án duyệt một môi trường riêng có các tên miền này (vòng lặp đã gửi đề xuất; xem D-17 ở `03_DECISIONS.md`).
- GS-H01: tạo repo trống `tranhatam-collab/groundstead` (chặn tách repo và CI riêng; không chặn các task khác).
- GS-H02, GS-H03: duyệt nội dung landing và DNS `iai.one` (chặn landing công khai, cần trước 20/11).

## Preview
- https://groundstead.vercel.app/vi/ và /en/ — cần đăng nhập Vercel (tài khoản `tranhatam-6714`); không công khai, `noindex`.
- Commit đang deploy: `289d402` (GS-010). Cập nhật preview bằng `create_deployment` với `gitSource` (project chưa nối Git).

## Ma trận nghiệm thu
PASS 5 · NOT_RUN 31 · MANUAL_PENDING 1 (tổng 37).

Background: GS-038 BLOCKED (mạng). Mọi task còn lại không phụ thuộc nó.
