# Groundstead — Trạng thái vòng lặp

- Cập nhật: 06/11/2026, sau vòng 4 (GS-011).
- Trạng thái: **CONTINUE** — vòng lặp đang chạy bằng chuỗi `send_later` (writer duy nhất).
- Vị trí: repo AFTERVIA, nhánh `ccr-8dbbf147-1ge7hc`, thư mục `groundstead/`. Repo riêng `tranhatam-collab/groundstead` chưa tồn tại (GS-H01).
- Ngân sách: 4/100 vòng.

## Vòng gần nhất
| Vòng | Task | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | GS-000 Khung dự án và công cụ vòng lặp | DONE — verify exit 0, 23/23 kiểm thử; GT01 PASS (PARTIAL), GT02 PASS (FULL) | `docs/evidence/GS-000.md` |
| 2 | GS-010 Next.js EN/VI, hreflang, sitemap, quét bundle | DONE — verify exit 0, 35/35 kiểm thử; GT31 PASS (PARTIAL); 0 lỗ hổng npm | `docs/evidence/GS-010.md` |
| 3 | GS-080 Preview riêng tư trên Vercel | DONE — deployment READY, Vercel Authentication mức `all`, nội dung /vi/ kiểm qua quyền truy cập | `docs/evidence/GS-080.md` |
| 4 | GS-011 Lược đồ nội dung, sổ nguồn/quyền, nhãn duyệt | DONE — verify exit 0, 54/54 kiểm thử; GT03, GT04 PASS (PARTIAL); 7 đột biến đều bị bắt | `docs/evidence/GS-011.md` |

## Việc kế tiếp
- GS-030: sổ nguồn và quyền (15–25 nguồn chính thức), content spec 9 module.
- Sau đó GS-015 (gói quốc gia VN/US), GS-031 (3 thẻ đầu).

## Chờ chủ dự án (đang chặn đường chính)
- GS-H01: tạo repo trống `tranhatam-collab/groundstead` (chặn tách repo và CI riêng; không chặn các task khác).
- GS-H02, GS-H03: duyệt nội dung landing và DNS `iai.one` (chặn landing công khai, cần trước 20/11).

## Preview
- https://groundstead.vercel.app/vi/ và /en/ — cần đăng nhập Vercel (tài khoản `tranhatam-6714`); không công khai, `noindex`.
- Commit đang deploy: `289d402` (GS-010). Cập nhật preview bằng `create_deployment` với `gitSource` (project chưa nối Git).

## Ma trận nghiệm thu
PASS 5 · NOT_RUN 31 · MANUAL_PENDING 1 (tổng 37).
