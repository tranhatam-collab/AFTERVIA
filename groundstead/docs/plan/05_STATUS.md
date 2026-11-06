# Groundstead — Trạng thái vòng lặp

- Cập nhật: 06/11/2026, sau vòng 7 (GS-015).
- Trạng thái: **CONTINUE** — vòng lặp đang chạy bằng chuỗi `send_later` (writer duy nhất).
- Vị trí: repo AFTERVIA, nhánh `ccr-8dbbf147-1ge7hc`, thư mục `groundstead/`. Repo riêng `tranhatam-collab/groundstead` chưa tồn tại (GS-H01).
- Ngân sách: 7/100 vòng.

## Vòng gần nhất
| Vòng | Task | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | GS-000 Khung dự án và công cụ vòng lặp | DONE — verify exit 0, 23/23 kiểm thử; GT01 PASS (PARTIAL), GT02 PASS (FULL) | `docs/evidence/GS-000.md` |
| 2 | GS-010 Next.js EN/VI, hreflang, sitemap, quét bundle | DONE — verify exit 0, 35/35 kiểm thử; GT31 PASS (PARTIAL); 0 lỗ hổng npm | `docs/evidence/GS-010.md` |
| 3 | GS-080 Preview riêng tư trên Vercel | DONE — deployment READY, Vercel Authentication mức `all`, nội dung /vi/ kiểm qua quyền truy cập | `docs/evidence/GS-080.md` |
| 4 | GS-011 Lược đồ nội dung, sổ nguồn/quyền, nhãn duyệt | DONE — verify exit 0, 54/54 kiểm thử; GT03, GT04 PASS (PARTIAL); 7 đột biến đều bị bắt | `docs/evidence/GS-011.md` |
| 5 | GS-030 Sổ nguồn và quyền, 10 content spec | DONE một phần có chủ đích — verify exit 0, 61/61 kiểm thử; 4/16 nguồn (Mỹ) tái sử dụng được, 12 nguồn link-only vì **mạng chặn**; GS-038 BLOCKED | `docs/evidence/GS-030.md` |
| 6 | GS-038 Đọc điều khoản nguồn trên trang chính thức | DONE — verify exit 0, 62/62 kiểm thử; 5 nguồn tái sử dụng được (NWS, USGS, EU CC BY 4.0, FEMA, CDC), 6 nguồn đã đọc nhưng không cho dùng thương mại, 5 chưa đọc được; thêm lệnh `promote` | `docs/evidence/GS-038.md` |
| 7 | GS-015 Gói quốc gia VN/US, trang Ai giúp tôi | DONE — verify exit 0, 77/77 kiểm thử (6 danh bạ, 8 trình duyệt); GT34 PASS (PARTIAL); số khẩn cấp **chưa xác minh** ở cả hai nước | `docs/evidence/GS-015.md` |

## Việc kế tiếp
- GS-031 (thẻ an toàn: lũ lụt và nắng nóng từ trang NWS đã đọc; mất điện chưa có nguồn đọc được), rồi GS-014 (màn hình khẩn cấp).
- Môi trường: phiên đang dùng `groundstead-sources` (mạng giới hạn 19 tên miền).

## Chờ chủ dự án (đang chặn đường chính)
- **GS-H11 (mới, không gấp):** 5 website chặn truy cập tự động hoặc không kết nối (IFRC, UNDRR, GDACS, Bộ Y tế, NCHMF) và FEMA/CDC cũng chặn: nhờ anh mở bằng trình duyệt, chép câu bản quyền/tái sử dụng gửi lại để ghi vào sổ nguồn.
- GS-H01: tạo repo trống `tranhatam-collab/groundstead` (chặn tách repo và CI riêng; không chặn các task khác).
- GS-H02, GS-H03: duyệt nội dung landing và DNS `iai.one` (chặn landing công khai, cần trước 20/11).

## Preview
- https://groundstead.vercel.app/vi/ và /en/ — cần đăng nhập Vercel (tài khoản `tranhatam-6714`); không công khai, `noindex`.
- Commit đang deploy: `289d402` (GS-010). Cập nhật preview bằng `create_deployment` với `gitSource` (project chưa nối Git).

## Ma trận nghiệm thu
PASS 5 · NOT_RUN 31 · MANUAL_PENDING 1 (tổng 37).

