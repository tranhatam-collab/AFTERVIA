# Groundstead — Trạng thái vòng lặp

## OWNER_REPORT (Lane G, 11/11/2026)

- Nguồn chỉ thị: `docs/plan/10_OWNER_PLAN_2026-11-10.md`, mục OWN-G-07. Chưa được chủ dự án xác nhận trong phiên này.
- Mục HUMAN giữ nguyên, không làm trong lượt này: D-10, D-30, tên, tài khoản, DNS, GS-082, GS-H01 đến GS-H11, GS-053b. Không đổi `review.status` nào; mọi nội dung vẫn AI_DRAFT.
- Lượt này, OWN-G-07 (G-25), nhánh `ccr-8dbbf147-1ge7hc`:
  - G-25 messages `17cd02e` (xong): runner giữ thông báo lỗi thật của từng kiểm thử, in ngay dưới dòng FAIL và ghi vào `failureMessages` trong báo cáo JSON. Kiểm thử mới `tools/loop/run-node-tests.test.mjs` nằm trong script test. Đỏ trước: "the console output shows the failure message". Đột biến (thông báo thành chuỗi rỗng): đỏ; khôi phục giống hệt (sha256 khớp). Phát hiện khi viết test: node:test đặt `NODE_TEST_CONTEXT`, nên runner con phải chạy với biến này bị xóa.
  - Lỗi chập chờn `24477e3` (xong, không có lỗi): e2e smoke, offline và a11y chạy 10 lượt liên tiếp trên bản Preview. 10/10 lượt thoát 0, mỗi lượt 39 đạt, 0 lỗi, 0 bỏ qua; thời gian 17,0 đến 23,9 giây. Không có kiểm thử nào lỗi nên không có mã nào được sửa. Chi tiết: `docs/evidence/G25-e2e-10x.md`. Lưu ý: 10 lượt trên một máy trong một phiên, nên chưa chứng minh là không có lỗi chập chờn.
  - Cổng: `npm run verify` exit 0 (lần cuối 57 giây): 267/267 kiểm thử node (266 trước đó, thêm 1), 4/4 kiểm thử bản production, quét bí mật và bundle sạch.
  - `--trace off`: runner và bộ e2e không có tùy chọn trace, không có cấu hình Playwright, nên không truyền cờ này.
- Blocker: không có blocker mới trong lượt này. Blocker cũ vẫn còn: bản Preview trên Vercel phải đặt `GS_CHANNEL=preview` (ngoài repo). Nếu không, Preview build theo production và e2e không khớp. G-05 vẫn BLOCKED chờ D-22.
- Việc kế tiếp: OWN-G-08 (Cổng 1, GS-G1), chạy sau OWN-G-02 đến OWN-G-07 theo kế hoạch. Chủ dự án cần quyết D-22 (G-05), xác nhận D-10 khi có người duyệt thật, và đặt `GS_CHANNEL=preview` trên Vercel.
- Cập nhật: 11/11/2026, OWN-G-07 (G-25 xong; lỗi chập chờn: 10/10 lượt đạt, không có lỗi).

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
| 16 | GS-023 Bản in theo ngôn ngữ, lưu trữ bền vững và câu trả lời của trình duyệt | DONE — verify exit 0, 151/151 kiểm thử (gồm 1 build, 1 E2E, 2 a11y cho bản in); 2 đột biến bị bắt; GT08 PASS (PARTIAL); quyết định D-31 | `docs/evidence/GS-023.md` |
| 17 | GS-033 Bộ kiểm tra bất biến bản dịch (số, đơn vị, phủ định, tên riêng) | DONE — verify exit 0, 157/157 kiểm thử (gồm 6 GT05); kiểm trong build; 3 đột biến bị bắt; 1 từ tiếng Việt được sửa ("không rõ" → "líu nhíu"); 1 ngoại lệ có lý do (TV); GT05 PASS (PARTIAL); quyết định D-32 | `docs/evidence/GS-033.md` |
| 18 | GS-050 Lõi cảnh báo: mô hình CAP, lọc công khai, trạng thái nguồn, bộ chuyển USGS và GDACS (bản ghi mẫu) | DONE — verify exit 0, 163/163 kiểm thử (gồm 6 GT13–GT15); 3 đột biến bị bắt; GT13, GT14, GT15 PASS (PARTIAL); chưa nối vào trang nào; tên trường nguồn theo bản ghi mẫu; quyết định D-33 | `docs/evidence/GS-050.md` |
| 19 | GS-051 Gộp trùng đa nguồn và khớp vị trí theo bán kính (5–100 km) | DONE — verify exit 0, 169/169 kiểm thử (gồm 6 GT16–GT17); 4 đột biến bị bắt; GT16, GT17 PASS (PARTIAL); địa bàn chọn thủ công chưa có (GS-103); quyết định D-34 | `docs/evidence/GS-051.md` |
| 20 | GS-081 SEO kỹ thuật: canonical theo trang (sửa lỗi trang con trỏ về trang chủ), hreflang, Open Graph, Organization, HowTo, robots | DONE — verify exit 0, 176/176 kiểm thử (gồm 6 GT31); 3 đột biến trên HTML đã build bị bắt; GT31 PASS (PARTIAL); FAQPage chưa làm (chưa có nội dung); quyết định D-35 | `docs/evidence/GS-081.md` |
| 21 | GS-053a Lõi job làm mới bản chụp cảnh báo: bộ chuyển GDACS theo RSS thật (đã đối chiếu cấu trúc), USGS, trạng thái nguồn, CLI `tools/alerts/refresh.mjs`; không chạy theo lịch | DONE — verify exit 0, 182/182 kiểm thử (gồm 6 job GT13–GT16); 3 đột biến bị bắt (M24–M26); GT13, GT14, GT16 PASS (PARTIAL). Chạy thật: GDACS `ok` (198 cảnh báo công khai còn hiệu lực), USGS `failed` (proxy chặn); sửa 2 lỗi bộ chuyển (giờ GMT, tên trường); đính chính D-33 | `docs/evidence/GS-053.md` |
| — | GS-053b Chọn nơi chạy job định kỳ (D-36) và cấp khóa VAPID | WAITING_HUMAN — chờ chủ dự án | — |
| — | GS-034 Tra nhãn hiệu sơ bộ | BLOCKED — chờ chủ dự án cung cấp hai tên dự phòng (kế hoạch trong repo không có) | — |

## Việc kế tiếp
- Chờ quyết định D-26 từ chủ dự án. Sau khi có: ghi vào `03_DECISIONS.md`, kiểm lại nguồn NWS cho các chủ đề còn thiếu của GS-032, rồi mới `unblock`. GS-031b (thẻ mất điện) dùng nguồn NWS và cần cùng quyết định phạm vi.
- GS-032 BLOCKED: chờ D-26 (phạm vi thẻ có chi tiết NWS) và nguồn đọc được (lý do đầy đủ trong backlog). Đây là điểm nghẽn chính: GS-032 → GS-052 → GS-G1 → gần như toàn bộ việc AUTO còn lại (GS-036…GS-106, GS-G2, GS-G3).
- GS-053a DONE (vòng 21): lõi job; GDACS đọc RSS thật; USGS bị proxy chặn nên chưa kiểm dữ liệu thật. GS-053b HUMAN: chủ dự án chọn nơi chạy job định kỳ (D-36) và cấp khóa VAPID. Đến lúc đó job chỉ chạy tay bằng `tools/alerts/refresh.mjs`.
- Sau đó còn: GS-052 (mở thẻ 72 giờ theo hiểm họa, GT18; chờ GS-032), GS-062 (thu hồi với bản ghi mẫu), GS-100 (gói quốc gia mới, cần nguồn), và các cổng G1/G2/G3.
- Gói chưa ký trên Preview và Production cho đến khi chủ dự án cấp khóa (D-30). Ở trạng thái này gói bị từ chối và nút tải báo "không có chữ ký hợp lệ" (đúng GT07).
- Khóa thật cho gói: xem D-30 và GS-H12 bên dưới.
- GS-034 đang BLOCKED: cần chủ dự án cung cấp hai tên dự phòng để tra cứu cùng với "Groundstead".
- Canonical của trang con kế thừa từ layout (trỏ về trang chủ): đã sửa và ghi trong GS-081 (vòng 20).
- Môi trường: phiên đang dùng `groundstead-sources` (mạng giới hạn 19 tên miền).

## Quyết định đang mở
- **D-36:** nơi chạy job làm mới cảnh báo định kỳ (Vercel Cron, Supabase Edge Function hoặc GitHub Actions); quyền dùng dữ liệu GDACS công khai (GS-H11 chưa xong); danh sách host USGS được phép. Chặn GS-053b và việc hiện cảnh báo công khai. Chủ dự án quyết.
- **D-26:** phạm vi của hai hướng dẫn lũ lụt và nắng nóng. Metadata ghi `GLOBAL`, nhưng nội dung là bản tóm tắt NWS Hoa Kỳ và có chi tiết chỉ áp dụng ở Hoa Kỳ (NOAA Weather Radio, inch, °F). Cần chủ dự án chọn: đổi phạm vi thành Hoa Kỳ, hoặc đổi đơn vị và bỏ chi tiết chỉ dành cho Hoa Kỳ rồi kiểm lại trích dẫn. Chặn: dùng hai hướng dẫn ngoài Hoa Kỳ.
- **D-25:** đăng ký sớm đang đóng. Trước khi mở phải có chính sách riêng tư được duyệt và công bố, và trang phải nêu gói Thành viên trả phí cùng giá (kế hoạch §11: 39 USD/năm, giá kiểm lại sau 90 ngày). Quyết định giá là của chủ dự án.
- **D-23:** mở thêm tên miền để đọc số khẩn cấp (VN: bocongan.gov.vn, dmc.gov.vn, nchmf.gov.vn, moh.gov.vn; Hoa Kỳ: fcc.gov, usa.gov). Không tự thêm.

## Chờ chủ dự án (đang chặn đường chính)
- **Go-live (GS-082, Cổng 1):** chưa mở. Điều kiện: E2E đạt (chuỗi chặn hiện tại: D-26 → GS-032 → GS-052 → GS-G1); chủ dự án ghi duyệt cho đúng commit trong `03_DECISIONS.md` (GS-H02); DNS `groundstead.iai.one` (GS-H03); repo (GS-H01); khóa ký thật cho Production (D-30).
- **D-30 / GS-H12 (chặn gói ngoại tuyến sẵn sàng trên Preview và Production):** sinh cặp khóa Ed25519; đặt khóa riêng làm secret của build (không commit, không ghi ra đĩa); đặt khóa công khai làm `NEXT_PUBLIC_GROUNDSTEAD_PACK_PUBLIC_KEY`. Đến lúc đó gói bị từ chối (đúng GT07). Vòng lặp không tự sinh khóa thật.
- **GS-H11 (không gấp):** 5 website chặn truy cập tự động hoặc không kết nối (IFRC, UNDRR, GDACS, Bộ Y tế, NCHMF) và FEMA/CDC cũng chặn: nhờ anh mở bằng trình duyệt, chép câu bản quyền/tái sử dụng gửi lại để ghi vào sổ nguồn.
- **GS-053b (HUMAN, D-36):** chọn nơi chạy job định kỳ và cấp khóa VAPID cho thông báo đẩy (chỉ gói miễn phí). Không chặn các việc AUTO khác, trừ GS-G2 và GS-105 (phụ thuộc GS-053b).
- **GS-H01:** tạo repo trống `tranhatam-collab/groundstead` (chặn tách repo và CI riêng; không chặn các task khác).
- **GS-H02, GS-H03:** duyệt nội dung landing và DNS `iai.one` (chặn landing công khai, cần trước 20/11).
- **GS-031b:** thẻ mất điện cần một trang chính thức đọc được có hướng dẫn mất điện. NWS, USGS, Red Cross đã đọc không có; FEMA và CDC chặn tự động.
- **APPllama.iai:** phiên này không có connector, MCP hay thư mục máy nào cho APPllama.iai (đã tra registry: không thấy). Cần URL hoặc tên chính xác, hoặc kết nối connector trong claude.ai, hoặc gắn thư mục máy qua Remote Control.
- **PR #2 (AFTERVIA):** check `verify` đỏ ở bước `npm audit --omit=dev --audit-level=high` của repo gốc (5 lỗ hổng mức cao trong Expo SDK 54). Nhánh gốc đỏ từ 04/11. Cần chủ dự án chọn hướng nâng cấp hoặc đổi cổng audit (xem `docs/plan/05_AUTONOMY_STATUS.md` của AFTERVIA). Đã comment trên PR một lần. Commit `02c863a` (run `42266939440`, job `128061191274`) đỏ cùng lỗi; re-run trả 403 từ phiên này (GitHub App không có quyền actions). Nhánh này không đổi file nào ngoài `groundstead/`.

## Preview
- Alias của nhánh: `groundstead-git-ccr-8dbbf147-1ge7hc-tranhatam-6714s-projects.vercel.app` (cần đăng nhập Vercel; không công khai; `noindex`).
- Deploy bằng `create_deployment` với `gitSource` (sha = commit mới nhất của nhánh). Deployment mới nhất: `dpl_FyTffgtqG1tgQKQ1S8Mayx2gYKyj` (commit `02c863a`, GS-053a) READY, alias `groundstead-git-ccr-8dbbf147-1ge7hc-tranhatam-6714s-projects.vercel.app`. Trước đó: `dpl_GnueAcfLsXVHLvnuXq9gnyN4f6jN` (commit `846c81d`, GS-021). Các commit GS-022 đến GS-081 chưa từng có bản preview riêng; `02c863a` đã gồm chúng.

## Ma trận nghiệm thu
PASS 21 · NOT_RUN 15 · MANUAL_PENDING 1 (tổng 37). Độ phủ: FULL 1 · PARTIAL 20 · NONE 16.
Vòng 13–19: GT12 (GS-020), GT06 (GS-021), GT07 (GS-021, GS-022), GT08 (GS-021, GS-023), GT05 (GS-033), GT13–GT15 (GS-050), GT16–GT17 (GS-051) PASS (PARTIAL); phần còn thiếu ghi trong CSV và bằng chứng.
Vòng 20–21: GT31 (GS-081) PASS (PARTIAL); GT13, GT14, GT16 (GS-053a) thêm độ phủ: lọc công khai, trạng thái nguồn, gộp một lần. Chưa phủ: hiển thị trên trang và kênh đẩy (GS-053b).
Sửa CSV ở vòng 9: GT32 và GT33 có giá trị lệch cột (`PARTIAL` nằm ở cột `automation_class`); GT09, GT10, GT11 được ghi PARTIAL theo bằng chứng GS-014. Vòng 10 chỉ thêm ghi chú độ phủ cho GT04, GT09, GT10, GT31, GT32 (landing); không đổi trạng thái.
