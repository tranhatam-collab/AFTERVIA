# Groundstead — Trạng thái vòng lặp

- Cập nhật: 06/11/2026, sau vòng 15 (GS-022; GS-021 là vòng 14; GS-020 là vòng 13; GS-035 là vòng 12; GS-016 là vòng 11; GS-013 là vòng 10; GS-014 là vòng 9; GS-031 là vòng 8).
- Trạng thái: **CONTINUE** — vòng lặp tiếp tục theo `decide`. Có lịch kiểm tra an toàn cho PR #2 (`send_later`, khoảng 17:48Z).
- Vị trí: repo AFTERVIA, nhánh `ccr-8dbbf147-1ge7hc`, thư mục `groundstead/`. Repo riêng `tranhatam-collab/groundstead` chưa tồn tại (GS-H01).
- Ngân sách: 15/100 vòng.

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
| 10 | GS-013 Landing EN/VI | DONE — verify exit 0, 114/114 kiểm thử (gồm 13 landing, 1 i18n, 2 E2E); review độc lập `wf_46ed5969-973`: 30 FIX, 28 áp dụng, 2 từ chối có lý do (D-25); 3 đột biến bị bắt; GT31, GT32, GT10, GT09, GT04 PASS (PARTIAL) | `docs/evidence/GS-013.md` |
| 11 | GS-016 Đo độ sẵn sàng (bước 0) | DONE — verify exit 0, 129/129 kiểm thử (gồm 12 readiness, 1 E2E GT21, 2 axe); 12 câu, 10 chấm điểm cho 7 trụ cột, nhãn quan tâm đổi được, chạy trên máy; 2 đột biến bị bắt; GT21 PASS (PARTIAL) | `docs/evidence/GS-016.md` |
| 12 | GS-035 Bản DRAFT điều khoản, quyền riêng tư, miễn trừ, affiliate | DONE (AUTO_PREP) — bản DRAFT EN/VI trong `docs/legal/`, không được ứng dụng tham chiếu; GT36 vẫn MANUAL_PENDING cho đến khi chủ dự án duyệt | `docs/evidence/GS-035.md` |
| 13 | GS-020 Tách kho hướng dẫn khẩn cấp khỏi thương mại | DONE — verify exit 0, 132/132 kiểm thử (gồm 2 ranh giới và 1 E2E GT12); 2 đột biến (import thương mại bị bắt; fetch ra ngoài bị bắt sau khi thêm E2E trang chỉ mục); GT12 PASS (PARTIAL) | `docs/evidence/GS-020.md` |
| 14 | GS-021 Service worker và gói ngoại tuyến có kiểm SHA-256 | DONE — verify exit 0, 144/144 kiểm thử (gồm 8 đơn vị/build và 4 E2E Chromium); 4 đột biến bị bắt; GT06, GT07, GT08 PASS (PARTIAL); quyết định D-28 về cách phục vụ gói | `docs/evidence/GS-021.md` |
| 15 | GS-022 Ký bản kê Ed25519; trình duyệt kiểm chữ ký bằng khóa đã nhúng | DONE — verify exit 0, 147/147 kiểm thử (gồm 2 đơn vị/build và 1 E2E cho chữ ký); 3 đột biến và 2 chốt postbuild bị bắt; chưa có khóa thật nên Preview chưa ký (D-30); GT07 PASS (PARTIAL) | `docs/evidence/GS-022.md` |
| — | GS-034 Tra nhãn hiệu sơ bộ | BLOCKED — chờ chủ dự án cung cấp hai tên dự phòng (kế hoạch trong repo không có) | — |

## Việc kế tiếp
- GS-023 Bản in theo ngôn ngữ và yêu cầu lưu trữ bền vững (GT08) là việc kế tiếp theo `decide`. Nút kiểm tra gói đã có từ GS-021.
- Gói chưa ký trên Preview và Production cho đến khi chủ dự án cấp khóa (D-30). Ở trạng thái này gói bị từ chối và nút tải báo "không có chữ ký hợp lệ" (đúng GT07).
- Khóa thật cho gói: xem D-30 và GS-H12 bên dưới.
- GS-034 đang BLOCKED: cần chủ dự án cung cấp hai tên dự phòng để tra cứu cùng với "Groundstead".
- Phát hiện cần ghi vào GS-081: canonical của trang con kế thừa từ layout (trỏ về trang chủ).
- Môi trường: phiên đang dùng `groundstead-sources` (mạng giới hạn 19 tên miền).

## Quyết định đang mở
- **D-26:** phạm vi của hai hướng dẫn lũ lụt và nắng nóng. Metadata ghi `GLOBAL`, nhưng nội dung là bản tóm tắt NWS Hoa Kỳ và có chi tiết chỉ áp dụng ở Hoa Kỳ (NOAA Weather Radio, inch, °F). Cần chủ dự án chọn: đổi phạm vi thành Hoa Kỳ, hoặc đổi đơn vị và bỏ chi tiết chỉ dành cho Hoa Kỳ rồi kiểm lại trích dẫn. Chặn: dùng hai hướng dẫn ngoài Hoa Kỳ.
- **D-25:** đăng ký sớm đang đóng. Trước khi mở phải có chính sách riêng tư được duyệt và công bố, và trang phải nêu gói Thành viên trả phí cùng giá (kế hoạch §11: 39 USD/năm, giá kiểm lại sau 90 ngày). Quyết định giá là của chủ dự án.
- **D-23:** mở thêm tên miền để đọc số khẩn cấp (VN: bocongan.gov.vn, dmc.gov.vn, nchmf.gov.vn, moh.gov.vn; Hoa Kỳ: fcc.gov, usa.gov). Không tự thêm.

## Chờ chủ dự án (đang chặn đường chính)
- **D-30 / GS-H12 (chặn gói ngoại tuyến sẵn sàng trên Preview và Production):** sinh cặp khóa Ed25519; đặt khóa riêng làm secret của build (không commit, không ghi ra đĩa); đặt khóa công khai làm `NEXT_PUBLIC_GROUNDSTEAD_PACK_PUBLIC_KEY`. Đến lúc đó gói bị từ chối (đúng GT07). Vòng lặp không tự sinh khóa thật.
- **GS-H11 (không gấp):** 5 website chặn truy cập tự động hoặc không kết nối (IFRC, UNDRR, GDACS, Bộ Y tế, NCHMF) và FEMA/CDC cũng chặn: nhờ anh mở bằng trình duyệt, chép câu bản quyền/tái sử dụng gửi lại để ghi vào sổ nguồn.
- **GS-H01:** tạo repo trống `tranhatam-collab/groundstead` (chặn tách repo và CI riêng; không chặn các task khác).
- **GS-H02, GS-H03:** duyệt nội dung landing và DNS `iai.one` (chặn landing công khai, cần trước 20/11).
- **GS-031b:** thẻ mất điện cần một trang chính thức đọc được có hướng dẫn mất điện. NWS, USGS, Red Cross đã đọc không có; FEMA và CDC chặn tự động.
- **APPllama.iai:** phiên này không có connector, MCP hay thư mục máy nào cho APPllama.iai (đã tra registry: không thấy). Cần URL hoặc tên chính xác, hoặc kết nối connector trong claude.ai, hoặc gắn thư mục máy qua Remote Control.
- **PR #2 (AFTERVIA):** check `verify` đỏ ở bước `npm audit --omit=dev --audit-level=high` của repo gốc (5 lỗ hổng mức cao trong Expo SDK 54). Nhánh gốc đỏ từ 04/11. Cần chủ dự án chọn hướng nâng cấp hoặc đổi cổng audit (xem `docs/plan/05_AUTONOMY_STATUS.md` của AFTERVIA). Đã comment trên PR; không re-run được từ phiên này (403).

## Preview
- Alias của nhánh: `groundstead-git-ccr-8dbbf147-1ge7hc-tranhatam-6714s-projects.vercel.app` (cần đăng nhập Vercel; không công khai; `noindex`).
- Deploy bằng `create_deployment` với `gitSource` (sha = commit mới nhất của nhánh). Deployment mới nhất: `dpl_FiiXedJTQe1xUxwExjexA3XS7o5n` (commit `37b8751`, GS-016) READY, alias trên.

## Ma trận nghiệm thu
PASS 15 · NOT_RUN 21 · MANUAL_PENDING 1 (tổng 37). Độ phủ: FULL 1 · PARTIAL 14 · NONE 22.
Vòng 13–14: GT12 (GS-020), GT06, GT07, GT08 (GS-021) PASS (PARTIAL); phần còn thiếu ghi trong CSV và bằng chứng.
Sửa CSV ở vòng 9: GT32 và GT33 có giá trị lệch cột (`PARTIAL` nằm ở cột `automation_class`); GT09, GT10, GT11 được ghi PARTIAL theo bằng chứng GS-014. Vòng 10 chỉ thêm ghi chú độ phủ cho GT04, GT09, GT10, GT31, GT32 (landing); không đổi trạng thái.
