# Groundstead — Trạng thái vòng lặp

- Cập nhật: 06/11/2026, sau vòng 9 (GS-014; GS-031 là vòng 8).
- Trạng thái: **CONTINUE** — chưa có lịch tự động đang chờ; vòng lặp tiếp tục trong lượt làm việc, hoặc đặt lại `send_later` khi cần chạy tiếp sau.
- Vị trí: repo AFTERVIA, nhánh `ccr-8dbbf147-1ge7hc`, thư mục `groundstead/`. Repo riêng `tranhatam-collab/groundstead` chưa tồn tại (GS-H01).
- Ngân sách: 9/100 vòng.

## Vòng gần nhất
| Vòng | Task | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | GS-000 Khung dự án và công cụ vòng lặp | DONE — verify exit 0, 23/23 kiểm thử; GT01 PASS (PARTIAL), GT02 PASS (FULL) | `docs/evidence/GS-000.md` |
| 2 | GS-010 Next.js EN/VI, hreflang, sitemap, quét bundle | DONE — verify exit 0, 35/35 kiểm thử; GT31 PASS (PARTIAL); 0 lỗ hổng npm | `docs/evidence/GS-010.md` |
| 3 | GS-080 Preview riêng tư trên Vercel | DONE — deployment READY, Vercel Authentication mức `all`, nội dung /vi/ kiểm qua quyền truy cập | `docs/evidence/GS-080.md` |
| 4 | GS-011 Lược đồ nội dung, sổ nguồn/quyền, nhãn duyệt | DONE — verify exit 0, 54/54 kiểm thử; GT03, GT04 PASS (PARTIAL); 7 đột biến đều bị bắt | `docs/evidence/GS-011.md` |
| 5 | GS-030 Sổ nguồn và quyền, 10 content spec | DONE một phần có chủ đích — verify exit 0, 61/61 kiểm thử; 12 nguồn link-only vì mạng chặn; GS-038 BLOCKED | `docs/evidence/GS-030.md` |
| 6 | GS-038 Đọc điều khoản nguồn trên trang chính thức | DONE — verify exit 0, 62/62 kiểm thử; 5 nguồn tái sử dụng được; 6 nguồn đã đọc nhưng không cho dùng thương mại; 5 chưa đọc được; thêm lệnh `promote` | `docs/evidence/GS-038.md` |
| 7 | GS-015 Gói quốc gia VN/US, trang Ai giúp tôi | DONE — verify exit 0, 77/77 kiểm thử; GT34 PASS (PARTIAL); số khẩn cấp chưa xác minh ở cả hai nước (sau đó US có 911 từ trang NWS, xem vòng 9) | `docs/evidence/GS-015.md` |
| 8 | GS-031 Thẻ an toàn: lũ lụt và nắng nóng (EN/VI) | DONE một phần có chủ đích — 2/3 thẻ; GS-031b BLOCKED (thẻ mất điện, chưa có trang chính thức đọc được có hướng dẫn); GT03, GT04 PASS (PARTIAL) | `docs/evidence/GS-031.md` |
| 9 | GS-014 Màn hình khẩn cấp | DONE — verify exit 0, 98/98 kiểm thử; GT09, GT10, GT11, GT32 PASS (PARTIAL); 5 đột biến bị bắt, 1 kiểm thử tự kiểm axe | `docs/evidence/GS-014.md` |

## Việc kế tiếp
- GS-013 Landing EN/VI (đang làm): định vị, 7 trụ cột, cửa vào Chế độ 72 giờ, nhãn trung thực về trạng thái sản phẩm; không có đăng ký sớm khi chính sách riêng tư chưa được duyệt. Sau đó theo `decide`.
- Môi trường: phiên đang dùng `groundstead-sources` (mạng giới hạn 19 tên miền).

## Chờ chủ dự án (đang chặn đường chính)
- **GS-H11 (không gấp):** 5 website chặn truy cập tự động hoặc không kết nối (IFRC, UNDRR, GDACS, Bộ Y tế, NCHMF) và FEMA/CDC cũng chặn: nhờ anh mở bằng trình duyệt, chép câu bản quyền/tái sử dụng gửi lại để ghi vào sổ nguồn.
- **GS-H01:** tạo repo trống `tranhatam-collab/groundstead` (chặn tách repo và CI riêng; không chặn các task khác).
- **GS-H02, GS-H03:** duyệt nội dung landing và DNS `iai.one` (chặn landing công khai, cần trước 20/11).
- **D-23:** mở thêm tên miền để đọc số khẩn cấp (VN: bocongan.gov.vn, dmc.gov.vn, nchmf.gov.vn, moh.gov.vn; Hoa Kỳ: fcc.gov, usa.gov). Không tự thêm.
- **GS-031b:** thẻ mất điện cần một trang chính thức đọc được có hướng dẫn mất điện. NWS, USGS, Red Cross đã đọc không có; FEMA và CDC chặn tự động.
- **APPllama.iai:** phiên này không có connector, MCP hay thư mục máy nào cho APPllama.iai. Cần URL hoặc tên chính xác, hoặc kết nối connector trong claude.ai, hoặc gắn thư mục máy qua Remote Control.

## Preview
- Alias của nhánh: `groundstead-git-ccr-8dbbf147-1ge7hc-tranhatam-6714s-projects.vercel.app` (cần đăng nhập Vercel; không công khai; `noindex`).
- Deploy bằng `create_deployment` với `gitSource` (sha = commit mới nhất của nhánh). Commit đang deploy được ghi ở commit kế tiếp.

## Ma trận nghiệm thu
PASS 10 · NOT_RUN 26 · MANUAL_PENDING 1 (tổng 37). Độ phủ: FULL 1 · PARTIAL 9 · NONE 27.
Sửa CSV ở vòng 9: GT32 và GT33 có giá trị lệch cột (`PARTIAL` nằm ở cột `automation_class`); GT09, GT10, GT11 được ghi PARTIAL theo bằng chứng GS-014.
