# Groundstead — Trạng thái vòng lặp

## Cập nhật 27/11/2026 — L0 công khai

- Chủ dự án xác nhận go-live cho mã giao diện `96cb41a` và quyết định D-39: công khai landing L0 EN/VI, giữ bộ pháp lý DRAFT ngoài website. Bản duyệt và phạm vi được ghi ở `03_DECISIONS.md`; `GS-H02` và `GS-H03` có bằng chứng trực tiếp, `GS-H08` vẫn `WAITING_HUMAN`.
- `GS-082` DONE: Vercel project `groundstead` triển khai lượt production cuối `dpl_AmWZPzodd7h9bYvWuPykcwHMszh7` READY, alias `groundstead.iai.one`. Cloudflare CNAME DNS-only đã được Vercel xác minh. Truy cập ẩn danh `/vi/`, `/en/`, `/en/emergency/`, `/en/help/` và ảnh hero trả HTTP 200, TLS hợp lệ; preview vẫn chuyển sang SSO. Vercel Authentication ở mức `Standard Protection`.
- `GT35` PASS cho lượt production cuối vì bản ghi duyệt đã có trên GitHub trước khi triển khai lại; lần mở công khai đầu tiên có lệch trình tự nhập bản ghi vào repo, đã nêu rõ trong `docs/evidence/GS-082-L0-2026-11-27.md`. Chưa có cổng CI tự chặn deploy thiếu bản ghi.
- `GT36` vẫn `MANUAL_PENDING`; không công bố thẻ AI_DRAFT, gói offline chưa ký, đăng ký sớm hay affiliate. Trang hiện giữ `noindex, nofollow`. Vercel báo hóa đơn quá hạn và nguy cơ tài khoản bị tắt; chưa xử lý thanh toán.

## Cập nhật 23/11/2026 — sửa sự thật của kế hoạch (đợt sửa sau audit)

- Audit 15/11 + đối chiếu 23/11: nhánh vẫn ở `54cec78` (13/11), không có commit mới; PR #2 vẫn draft, 0 review. Mọi phát hiện audit còn nguyên.
- Backlog: 76 task (thêm GS-H12, GS-H13, GS-G1-GO, GS-G2-GO). `decide` trả `START GS-034`.
- Đã sửa: GS-032 bỏ "chờ D-26" (D-26 đã chốt 10/11) và thêm phụ thuộc `GS-031b`; GS-034 mở khóa (hai tên dự phòng Wellstead/Landstead có sẵn ở 00_MASTER_PLAN §1); GS-H11 và GS-053b → `WAITING_HUMAN`; GS-031 sửa title còn 2/3 thẻ; GS-082 định nghĩa lại là cổng L0 (landing giới thiệu, D-38) và thêm phụ thuộc GS-H08; GS-G1-GO/GS-G2-GO là bản ghi quyết định qua cổng của chủ dự án — mọi task sau cổng giờ phụ thuộc `-GO`, không còn mở ra chỉ vì báo cáo rà cổng DONE.
- Validator mới: task HUMAN/DEVICE/INFRA chỉ được `WAITING_HUMAN` hoặc `DONE`; `BLOCKED` bắt buộc có `blocked_reason`. Test mới bắt cả hai invariant và case "báo cáo cổng chưa đạt không mở task con".

## OWNER_REPORT (Lane G, deploy 13/11/2026)

- Yêu cầu của chủ dự án: "Build cho xong tất cả những gì còn lại xong deploy luôn, tôi sẽ gắn DNS". Hiểu là: xong phần trang cần để deploy, deploy, chủ dự án tự gắn DNS. Phần backlog còn lại bị chặn bởi Cổng 1 (GS-G1 ← GS-032 ← GS-031b, cần nguồn chính thức đọc được) và các mục HUMAN, nên không làm.
- Sửa lỗi review trang chủ và trang đo độ sẵn sàng, commit `cc161b6` (đã đẩy lên `ccr-8dbbf147-1ge7hc`): bản production không còn nói hướng dẫn lũ lụt và nắng nóng "đã có sẵn" khi chưa công bố thẻ nào (G-07). Hai kiểm thử bản production mới đỏ trước, xanh sau; đột biến trên trang đo độ sẵn sàng cho đúng một kiểm thử đỏ, khôi phục giống hệt (`cmp`).
- Cổng trước khi deploy: `npm run verify` exit 0 (49 giây): 273/273 kiểm thử node, 6/6 kiểm thử bản production, quét bí mật (165 tệp) và quét bundle (112 tệp bản production) sạch, backlog 72 task hợp lệ.
- Deploy trên Vercel, dự án `groundstead` (không nối Git, tạo từ commit `cc161b6` qua `gitSource`):
  - Preview `dpl_Hic2eN1Pqd4BWvSETrZyVPsqZsz8`: READY, dùng để kiểm nội dung trước.
  - Production `dpl_87b9TGEFUdgrp9q8hLWSBbJD16TU`: READY, `target: production`, `aliasError: null`, alias `groundstead.vercel.app`. Build 18 giây.
  - Kiểm nội dung bản chạy qua quyền truy cập của Vercel. Trên bản preview: `/vi/` và `/en/emergency/` nói chưa công bố hướng dẫn nào, `/vi/` không còn câu "ở đây rồi". Trên alias production `groundstead.vercel.app`: `/en/readiness/` mang câu mới trong props của component, không còn câu cũ. Cả ba có `noindex, nofollow`, canonical `https://groundstead.iai.one/...`, CSP và Referrer-Policy đúng như `vercel.json`. Chưa tải lại `/vi/` trên alias production (cùng commit, cùng cấu hình build).
- Vercel Authentication (`ssoProtection`, mức `all`) vẫn BẬT: chưa ai ngoài nhóm xem được. Chưa gắn tên miền nào vào dự án. Không đổi DNS, Cloudflare, thanh toán hay bí mật.
- Chưa được chứng minh: gói offline của bản này KHÔNG có chữ ký (log build: "UNSIGNED (no signing key)", `sw.js trusted key empty`), nên không bản lưu nào được phục vụ. G-22 và D-30 vẫn chờ khóa ký của chủ dự án. Cloudflare: không có kết nối nào trong phiên này, nên không kiểm được ID tên miền hay vùng DNS.
- Việc của chủ dự án trước khi mở công khai (bật công khai = tắt Vercel Authentication, chỉ làm khi chủ dự án xác nhận):
  1. Quyết D-22 (G-05), D-10 (duyệt nội dung; hiện production có 0 thẻ vì mọi nội dung là AI_DRAFT), G-22/D-30 (khóa ký hay chấp nhận gói chưa ký), H02 (duyệt nội dung landing), H08 (duyệt bản nháp pháp lý).
  2. Thêm `groundstead.iai.one` vào dự án Vercel `groundstead`, rồi trỏ DNS theo bản ghi mà Vercel báo (CNAME hoặc A). Đây là thao tác ghi ngoài repo; cần chủ dự án duyệt.
  3. Đặt `GS_CHANNEL=preview` cho môi trường Preview của Vercel (ngoài repo) nếu muốn bản Preview khớp e2e.
- Chưa sửa, đã biết: trang phục vụ từ bản lưu offline chưa có CSP và Referrer-Policy; chỉ mục khẩn cấp hiện số của mọi quốc gia ở cả hai ngôn ngữ (G-05); nhãn liên kết `homeEmergencyLink` vẫn ghi "Hướng dẫn khẩn cấp: việc đầu tiên cần làm" dù production chưa có hướng dẫn nào.
- CI từ xa chạy lại được (13/11/2026): run `43345425301` (commit `cc161b6`) đã chạy job thật thay vì `startup_failure`; lý do hết lỗi khởi động chưa xác minh (thanh toán BILLING_UNVERIFIED). Job `groundstead-verify` đỏ: build, typecheck, quét bí mật và 232 kiểm thử đạt, 41 kiểm thử e2e đỏ vì hook `before` không mở được trình duyệt. Nguyên nhân (đã tái hiện triệu chứng cục bộ, chưa thấy log thật của CI): `.github/workflows/ci.yml` chạy `npx playwright install` ở thư mục gốc, khi gốc chưa `npm ci`, nên tải Chromium của Playwright mới nhất (1.65.0, revision 1254), trong khi `groundstead/` ghim Playwright 1.63.0 cần revision 1243. File này thuộc Lane A (OWN-A-10), không sửa ở đây; cách sửa: chạy `npx playwright install --with-deps chromium` sau `npm ci` với `working-directory: groundstead`. Log CI thật sau khi runner (G-25) in `cause` của hook (run `43363949190`, commit `c598506`) xác nhận: `Executable doesn't exist at /home/runner/.cache/ms-playwright/chromium_headless_shell-1243/...`, tức runner thiếu đúng revision mà `groundstead/` cần. Đã thêm `npm run check:browser` vào `verify` (`tools/checks/ensure-browser.mjs`): hỏi chính Playwright đã ghim có mở được Chromium không, thiếu thì chạy `playwright install chromium`; máy đã có trình duyệt thì không tải gì. Cổng cục bộ exit 0, 276/276 kiểm thử node. Cập nhật sau đó: Lane A đã sửa `ci.yml` theo G-26 (commit `f3f1685` ở nhánh nền `ccr-4544c9f7-b1t50m`). Run `43364646021` (head `7e7bc49`, sau bản sửa): ba job xanh. `groundstead-verify`: 276/276 kiểm thử node (gồm 41 kiểm thử e2e trước đó đỏ), 6/6 kiểm thử bản production, quét bundle sạch. `check:browser` in "browser ready" nên không phải cài gì: bản sửa `ci.yml` là cái có tác dụng, `check:browser` là lớp dự phòng chưa được dùng tới trên CI.
- Còn tồn: vài commit do workflow tạo mang trailer `Co-Authored-By` có tên mô hình; không viết lại lịch sử nên để nguyên.
- Cập nhật: 13/11/2026, deploy production READY, bảo vệ Vercel còn bật, không GO công khai.

## OWNER_REPORT (Lane G, 11/11/2026)

- Nguồn chỉ thị: `docs/plan/10_OWNER_PLAN_2026-11-10.md`, mục OWN-G-07. Chưa được chủ dự án xác nhận trong phiên này.
- Mục HUMAN giữ nguyên, không làm trong lượt này: D-10, D-30, tên, tài khoản, DNS, GS-082, GS-H01 đến GS-H11, GS-053b. Không đổi `review.status` nào; mọi nội dung vẫn AI_DRAFT.
- Lượt này, OWN-G-07 (G-25), nhánh `ccr-8dbbf147-1ge7hc`:
  - G-25 messages `17cd02e` (xong): runner giữ thông báo lỗi thật của từng kiểm thử, in ngay dưới dòng FAIL và ghi vào `failureMessages` trong báo cáo JSON. Kiểm thử mới `tools/loop/run-node-tests.test.mjs` nằm trong script test. Đỏ trước: "the console output shows the failure message". Đột biến (thông báo thành chuỗi rỗng): đỏ; khôi phục giống hệt (sha256 khớp). Phát hiện khi viết test: node:test đặt `NODE_TEST_CONTEXT`, nên runner con phải chạy với biến này bị xóa.
  - Lỗi chập chờn `24477e3` (xong, không có lỗi): e2e smoke, offline và a11y chạy 10 lượt liên tiếp trên bản Preview. 10/10 lượt thoát 0, mỗi lượt 39 đạt, 0 lỗi, 0 bỏ qua; thời gian 17,0 đến 23,9 giây. Không có kiểm thử nào lỗi nên không có mã nào được sửa. Chi tiết: `docs/evidence/G25-e2e-10x.md`. Lưu ý: 10 lượt trên một máy trong một phiên, nên chưa chứng minh là không có lỗi chập chờn.
  - Cổng: `npm run verify` exit 0 (lần cuối 57 giây): 267/267 kiểm thử node (266 trước đó, thêm 1), 4/4 kiểm thử bản production, quét bí mật và bundle sạch.
  - `--trace off`: runner và bộ e2e không có tùy chọn trace, không có cấu hình Playwright, nên không truyền cờ này.
- Sửa lỗi review `public/sw.js`: mạng trả 404/500 không còn bị thay bằng bản lưu offline; bản lưu chỉ dùng khi yêu cầu lỗi hoặc quá 3 giây. SW-01 đỏ trước, đột biến đỏ rồi khôi phục khớp; offline e2e 9/9.
- Sửa lỗi review `lib/alerts/fetch.ts`: chuyển hướng feed sang http bị từ chối có lý do, nguồn ghi failed, không gọi địa chỉ http. Đỏ trước; đột biến đỏ rồi khôi phục khớp.
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
| — | GS-034 Tra nhãn hiệu sơ bộ | TODO — đã mở khóa 23/11: hai tên dự phòng (Wellstead, Landstead) có sẵn trong 00_MASTER_PLAN §1 | — |

## Việc kế tiếp
- Vòng tới theo `decide`: GS-034 (tra nhãn hiệu sơ bộ 3 tên trên cơ sở dữ liệu công khai).
- D-26 đã chốt 10/11 (GLOBAL, đổi đơn vị, bỏ chi tiết chỉ-HSK) — không còn là blocker. GS-032 BLOCKED chỉ còn vì thiếu nguồn đọc được và có quyền tóm lược (chi tiết trong backlog). Đây là điểm nghẽn chính: GS-031b + GS-032 → GS-052 → GS-G1 → GS-G1-GO → gần như toàn bộ việc AUTO còn lại (GS-036…GS-106, GS-G2, GS-G3).
- GS-053a DONE (vòng 21): lõi job; GDACS đọc RSS thật; USGS bị proxy chặn nên chưa kiểm dữ liệu thật. GS-053b HUMAN: chủ dự án chọn nơi chạy job định kỳ (D-36) và cấp khóa VAPID. Đến lúc đó job chỉ chạy tay bằng `tools/alerts/refresh.mjs`.
- Sau đó còn: GS-052 (mở thẻ 72 giờ theo hiểm họa, GT18; chờ GS-032), GS-062 (thu hồi với bản ghi mẫu), GS-100 (gói quốc gia mới, cần nguồn), và các cổng G1/G2/G3.
- Gói chưa ký trên Preview và Production cho đến khi chủ dự án cấp khóa (D-30). Ở trạng thái này gói bị từ chối và nút tải báo "không có chữ ký hợp lệ" (đúng GT07).
- Khóa thật cho gói: xem D-30 và GS-H12 bên dưới.
- Canonical của trang con kế thừa từ layout (trỏ về trang chủ): đã sửa và ghi trong GS-081 (vòng 20).
- Môi trường: phiên đang dùng `groundstead-sources` (mạng giới hạn 19 tên miền).

## Quyết định đang mở
- **D-36:** nơi chạy job làm mới cảnh báo định kỳ (Vercel Cron, Supabase Edge Function hoặc GitHub Actions); quyền dùng dữ liệu GDACS công khai (GS-H11 chưa xong); danh sách host USGS được phép. Chặn GS-053b và việc hiện cảnh báo công khai. Chủ dự án quyết.
- **D-25:** đăng ký sớm đang đóng. Trước khi mở phải có chính sách riêng tư được duyệt và công bố, và trang phải nêu gói Thành viên trả phí cùng giá (kế hoạch §11: 39 USD/năm, giá kiểm lại sau 90 ngày). Quyết định giá là của chủ dự án.
- **D-23:** mở thêm tên miền để đọc số khẩn cấp (VN: bocongan.gov.vn, dmc.gov.vn, nchmf.gov.vn, moh.gov.vn; Hoa Kỳ: fcc.gov, usa.gov). Không tự thêm.

## Chờ chủ dự án (đang chặn đường chính)
- **Go-live:** theo D-38 (23/11) có hai cổng. **L0 (GS-082)** — landing giới thiệu công khai: chủ dự án ghi duyệt đúng commit trong `03_DECISIONS.md` (GS-H02), DNS `groundstead.iai.one` (GS-H03), duyệt bản DRAFT pháp lý theo phạm vi L0 (GS-H08); kiểm GT35 và toàn bộ route/deployment khi tắt Vercel Authentication. **G1 (GS-G1 → GS-G1-GO)** — sản phẩm 72 giờ: chuỗi chặn hiện tại GS-031b + GS-032 → GS-052 → GS-G1; thêm repo (GS-H01→GS-001), khóa ký thật (D-30/GS-H12), người duyệt nội dung (GS-H13/D-10).
- **D-30 / GS-H12 (chặn gói ngoại tuyến sẵn sàng trên Preview và Production):** sinh cặp khóa Ed25519; đặt khóa riêng làm secret của build (không commit, không ghi ra đĩa); đặt khóa công khai làm `NEXT_PUBLIC_GROUNDSTEAD_PACK_PUBLIC_KEY`. Đến lúc đó gói bị từ chối (đúng GT07). Vòng lặp không tự sinh khóa thật.
- **GS-H11 (không gấp):** 5 website chặn truy cập tự động hoặc không kết nối (IFRC, UNDRR, GDACS, Bộ Y tế, NCHMF) và FEMA/CDC cũng chặn: nhờ anh mở bằng trình duyệt, chép câu bản quyền/tái sử dụng gửi lại để ghi vào sổ nguồn.
- **GS-053b (HUMAN, D-36):** chọn nơi chạy job định kỳ và cấp khóa VAPID cho thông báo đẩy (chỉ gói miễn phí). Không chặn các việc AUTO khác, trừ GS-G2 và GS-105 (phụ thuộc GS-053b).
- **GS-H01:** tạo repo trống `tranhatam-collab/groundstead` (chặn tách repo và CI riêng; không chặn các task khác).
- **GS-H02, GS-H03:** duyệt nội dung landing và DNS `iai.one` (chặn landing công khai, cần trước 20/11).
- **GS-031b:** thẻ mất điện cần một trang chính thức đọc được có hướng dẫn mất điện. NWS, USGS, Red Cross đã đọc không có; FEMA và CDC chặn tự động.
- **APPllama.iai:** phiên này không có connector, MCP hay thư mục máy nào cho APPllama.iai (đã tra registry: không thấy). Cần URL hoặc tên chính xác, hoặc kết nối connector trong claude.ai, hoặc gắn thư mục máy qua Remote Control.
- **PR #2 (AFTERVIA):** cập nhật 23/11 — 3/3 checks xanh từ run 43364985421 (13/11) sau bản sửa `ci.yml` của Lane A (G-26) trên nhánh nền; PR vẫn draft, 0 review, head `54cec78`. Chú ý: `ci.yml` trong head của nhánh này vẫn đặt `playwright install` trước `npm ci` của `groundstead/` (nhánh chậm nhánh nền 12 commit) — khi tách repo phải tạo CI riêng với thứ tự cài đúng. Nhánh này không đổi file nào ngoài `groundstead/`.

## Preview
- Alias của nhánh: `groundstead-git-ccr-8dbbf147-1ge7hc-tranhatam-6714s-projects.vercel.app` (cần đăng nhập Vercel; không công khai; `noindex`).
- Deploy bằng `create_deployment` với `gitSource` (sha = commit mới nhất của nhánh). Deployment mới nhất: `dpl_FyTffgtqG1tgQKQ1S8Mayx2gYKyj` (commit `02c863a`, GS-053a) READY, alias `groundstead-git-ccr-8dbbf147-1ge7hc-tranhatam-6714s-projects.vercel.app`. Trước đó: `dpl_GnueAcfLsXVHLvnuXq9gnyN4f6jN` (commit `846c81d`, GS-021). Các commit GS-022 đến GS-081 chưa từng có bản preview riêng; `02c863a` đã gồm chúng.

## Ma trận nghiệm thu
PASS 21 · NOT_RUN 15 · MANUAL_PENDING 1 (tổng 37). Độ phủ: FULL 1 · PARTIAL 20 · NONE 16.
Vòng 13–19: GT12 (GS-020), GT06 (GS-021), GT07 (GS-021, GS-022), GT08 (GS-021, GS-023), GT05 (GS-033), GT13–GT15 (GS-050), GT16–GT17 (GS-051) PASS (PARTIAL); phần còn thiếu ghi trong CSV và bằng chứng.
Vòng 20–21: GT31 (GS-081) PASS (PARTIAL); GT13, GT14, GT16 (GS-053a) thêm độ phủ: lọc công khai, trạng thái nguồn, gộp một lần. Chưa phủ: hiển thị trên trang và kênh đẩy (GS-053b).
Sửa CSV ở vòng 9: GT32 và GT33 có giá trị lệch cột (`PARTIAL` nằm ở cột `automation_class`); GT09, GT10, GT11 được ghi PARTIAL theo bằng chứng GS-014. Vòng 10 chỉ thêm ghi chú độ phủ cho GT04, GT09, GT10, GT31, GT32 (landing); không đổi trạng thái.
