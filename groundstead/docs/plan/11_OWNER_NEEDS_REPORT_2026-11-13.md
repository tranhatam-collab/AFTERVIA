# Groundstead: báo cáo nhu cầu gửi chủ dự án (13/11/2026)

Lane G, nhánh `ccr-8dbbf147-1ge7hc`. Báo cáo này trả lời "cần gì từ chủ dự án để đi tiếp". Mỗi mục ghi: cần gì, cung cấp theo dạng nào, mở khóa việc nào, và Lane G làm gì ngay sau khi có. Nguồn: `backlog.json`, `03_DECISIONS.md`, `10_OWNER_PLAN_2026-11-10.md`, `05_STATUS.md`. Chỗ nào chưa kiểm được thì ghi "chưa xác minh".

**Quy tắc cung cấp.** Khóa, token, mật khẩu: không dán vào chat, không commit. Đặt qua biến môi trường hoặc secret của nơi chạy (Vercel, GitHub environment) rồi chỉ báo "đã đặt" cùng tên biến. Quyết định: trả lời bằng ID và lựa chọn (ví dụ "D-22: giữ nguyên").

## 0. Hiện trạng (đã kiểm 13/11/2026)

- Bản production `dpl_87b9TGEFUdgrp9q8hLWSBbJD16TU` (commit `cc161b6`) READY trên Vercel, alias `groundstead.vercel.app`. Vercel Authentication (`ssoProtection`, mức `all`) **bật**; chưa có tên miền riêng gắn vào dự án.
- Cổng cục bộ `npm run verify`: exit 0, 274/274 kiểm thử node, 6/6 kiểm thử bản production, quét bí mật và bundle sạch.
- Production đang công bố **0 thẻ hướng dẫn** (mọi nội dung là `AI_DRAFT`); trang nói rõ chưa có hướng dẫn nào được công bố. Mọi trang có `noindex, nofollow`.
- Gói ngoại tuyến của bản này **chưa ký** (log build: "UNSIGNED"), nên không bản lưu offline nào được phục vụ.
- CI từ xa chạy lại được (run `43345425301`); job `groundstead-verify` đỏ vì bước cài trình duyệt trong `ci.yml` (xem E3, đề nghị G-26 cho Lane A).

## A. Để trang chạy trên groundstead.iai.one (GS-082)

Điều kiện chính thức của GS-082 trong backlog: GS-080 (xong), GS-013 (xong), GS-035 (xong), **GS-H02** và **GS-H03**.

| # | Cần gì | Cung cấp thế nào | Mở khóa | Lane G làm ngay sau đó |
|---|---|---|---|---|
| A1 | **DNS và tên miền (GS-H03).** Hai thao tác: (1) thêm `groundstead.iai.one` vào dự án Vercel `groundstead`; (2) tạo bản ghi DNS trong Cloudflare. | Tự làm, hoặc nói "thêm domain" để Lane G thêm vào Vercel (thao tác ghi, cần duyệt trong phiên). Bản ghi: CNAME `groundstead` → `f82d2286f1fffccd.vercel-dns-016.com.` (giá trị Vercel đề xuất ưu tiên 1; dự phòng `cname.vercel-dns.com.`). | GS-082 | Kiểm Vercel báo domain đã xác minh, kiểm tra chứng chỉ TLS và nội dung trang qua tên miền, ghi bằng chứng vào `docs/evidence/`. |
| A2 | **Duyệt nội dung landing EN/VI (GS-H02).** | Trả lời "duyệt" kèm commit (hiện `cc161b6`) hoặc danh sách chỗ cần sửa. | GS-082 | Sửa theo danh sách, ghi bản ghi duyệt (người, ngày, commit) vào `docs/evidence/`. |
| A3 | **Xác nhận bật công khai.** Bật công khai nghĩa là tắt Vercel Authentication của dự án. | Một câu xác nhận rõ ràng của chủ dự án. | Người ngoài xem được trang | Chỉ làm khi được xác nhận và khi có quyền ghi trên dự án Vercel; sau đó kiểm lại các trang công khai, `noindex`, các header. |

**Ghi chú.** Hướng dẫn thông thường của Vercel là đặt CNAME ở chế độ "DNS only" trong Cloudflare; chưa kiểm với tài khoản này. Vercel báo (13/11) nameserver của `iai.one` là Cloudflare (`davina.ns.cloudflare.com`, `justin.ns.cloudflare.com`); chưa kiểm được phía Cloudflare vì phiên này không có kết nối Cloudflare (xem E2). Bản build đặt canonical là `https://groundstead.iai.one/...`; dùng tên miền khác thì phải build lại.

## B. Điều kiện an toàn nội dung (Lane G đề xuất trước khi mở công khai)

Các mục này **không** nằm trong điều kiện chính thức của GS-082. Lane G đề xuất chờ chúng vì liên quan đến việc người đọc tin vào nội dung an toàn.

| # | Cần gì | Cung cấp thế nào | Mở khóa | Lane G làm ngay sau đó |
|---|---|---|---|---|
| B1 | **D-10: người duyệt nội dung an toàn.** Hiện không thẻ nào được duyệt. | Tên hoặc vai trò người duyệt tình nguyện, kèm bản ghi duyệt cho từng thẻ (lũ lụt, nắng nóng; EN và VI). Người duyệt trả phí là khoản chi đầu tiên khi có doanh thu (D-10). | Production công bố thẻ (hiện 0) | Đổi trạng thái thẻ theo đúng bản ghi duyệt thật; không đổi nếu không có. Build production tự hiện thẻ và trở lại chữ cũ ở trang chủ và trang đo độ sẵn sàng, không cần sửa mã. |
| B2 | **GS-H08: duyệt bản DRAFT** điều khoản, quyền riêng tư, miễn trừ, công khai affiliate (GS-035). | "Duyệt" kèm commit, hoặc danh sách sửa. | Đăng ký sớm, các trang pháp lý | Ghi bản ghi duyệt; chưa mở đăng ký sớm cho đến khi có. |
| B3 | **D-30 và G-22: khóa ký gói ngoại tuyến**, hoặc quyết định chấp nhận gói chưa ký. G-20 (job ký trong CI được bảo vệ) và G-22 (build production thất bại khi thiếu khóa) đang **chờ xác nhận** vì đổi cổng phát hành. | Chủ dự án sinh cặp Ed25519. Khóa riêng: theo D-30 là secret của build, không commit; nếu xác nhận G-20 thì chỉ job ký trong CI được bảo vệ giữ khóa, không đặt trong dự án Vercel. Khóa công khai: biến `NEXT_PUBLIC_GROUNDSTEAD_PACK_PUBLIC_KEY`. Báo "đã đặt" cùng tên biến, không dán giá trị. Hoặc trả lời "chấp nhận gói chưa ký". | Gói ngoại tuyến được chấp nhận khi dùng (GT07), `sw.js` có khóa tin cậy | Build lại, kiểm chữ ký thật, ghi bằng chứng. G-20 cần Lane A làm job ký (xem `REQUESTS_TO_LANE_A.md`). |
| B4 | **D-22 và G-05.** D-22 (06/11) quyết trang khẩn cấp liệt kê mọi quốc gia, không chọn theo vị trí. G-05 yêu cầu chỉ hiện số của quốc gia người đọc, mâu thuẫn D-22. | Trả lời "D-22: giữ" hoặc "D-22: đổi theo G-05". | G-05 (đang BLOCKED) | Nếu đổi: làm G-05 theo kiểm thử đỏ trước. Nếu giữ: đóng G-05. |

## C. Phần backlog bị chặn (Cổng 1)

| # | Cần gì | Cung cấp thế nào | Mở khóa | Lane G làm ngay sau đó |
|---|---|---|---|---|
| C1 | **Nguồn chính thức cho thẻ mất điện (GS-031b) và GS-H11.** Các trang NWS và USGS đã đọc không có hướng dẫn mất điện. GS-H11: mở bằng trình duyệt trang điều khoản của ready.gov, fema.gov, cdc.gov, ifrc.org, undrr.org, gdacs.org, moh.gov.vn, nchmf.gov.vn (các trang này chặn truy cập tự động hoặc cần JavaScript). | Dán lại **câu bản quyền / tái sử dụng** và URL trang, hoặc nêu một trang chính thức đọc được và cho phép tóm lược. | GS-031b → GS-032 → **GS-G1** (Cổng 1) → GS-036, GS-037, GS-040, GS-041, GS-054, GS-060, GS-070, GS-083, GS-091 đến GS-094 | Cập nhật sổ nguồn, viết thẻ ở trạng thái `AI_DRAFT`, chạy lại GS-G1. |
| C2 | **GS-053b và D-36: nơi chạy job cảnh báo theo lịch** (Vercel Cron, Supabase Edge Function hoặc GitHub Actions) và khóa VAPID cho thông báo đẩy web (chỉ gói miễn phí). Kèm quyền dùng dữ liệu GDACS. | Chọn một nơi; khóa VAPID đặt qua biến môi trường. | GS-G2 và GS-105 | Cấu hình lịch chạy ở nơi được chọn; chưa gọi nguồn ngoài theo lịch trước khi có. Nội dung GDACS không trích công khai. |

## D. Quyết định kỹ thuật nhỏ đang chờ xác nhận

Mỗi mục đổi một hành vi đã được quyết trước đó, nên Lane G chưa làm. Hiện chưa đổi gì.

- **G-08**: hiển thị công khai bản ghi thiếu `accesslevel` (đổi D-33).
- **G-11**: ánh xạ mức nghiêm trọng khi nhóm sự kiện theo tâm và cửa sổ thời gian.
- **G-14**: RSS rỗng được ghi là `failed` thay vì "không có cảnh báo" (USGS không đổi).
- **G-17**: giới hạn kích thước phản hồi 5 MiB là mặc định kỹ thuật, cần xác nhận.

Cách trả lời: "G-08: làm / không", v.v.

## E. Hạ tầng và tài khoản

| # | Cần gì | Cung cấp thế nào | Mở khóa | Lane G làm ngay sau đó |
|---|---|---|---|---|
| E1 | **`GS_CHANNEL=preview` cho môi trường Preview của Vercel** (ngoài repo). Không đặt cho Production. | Tự đặt trong Settings → Environment Variables, hoặc cho phép Lane G đặt bằng công cụ Vercel (thao tác ghi, cần duyệt). | Bản Preview khớp bộ e2e (hiện Preview build theo production) | Tạo lại một deployment Preview, kiểm banner và nhãn xem trước. |
| E2 | **Kết nối Cloudflare** (chưa có). Danh sách kết nối cho thấy "Cloudflare Developer Platform" chưa cài. Cần nếu muốn Lane G kiểm hoặc tạo DNS. | Cài kết nối ở claude.ai, hoặc tự làm DNS (A1). | Kiểm vùng và ID tên miền phía Cloudflare | Chỉ đọc; không đổi DNS nếu chưa được duyệt. |
| E3 | **GitHub Actions: thanh toán và job `groundstead-verify`.** CI chạy lại được từ 13/11 nhưng lý do hết `startup_failure` chưa xác minh; thanh toán: BILLING_UNVERIFIED. Job `groundstead-verify` đỏ vì bước cài trình duyệt trong `ci.yml`. | (1) Chủ dự án kiểm trang thanh toán và hạn mức chi tiêu của GitHub (không nâng ngân sách 65 USD, không tắt kiểm soát chi tiêu nếu chưa quyết). (2) Lane A sửa `ci.yml` theo **G-26** trong `REQUESTS_TO_LANE_A.md`. | CI xanh cho PR #2 | Theo dõi run CI kế tiếp: log thật (run `43363949190`) xác nhận runner thiếu Chromium revision 1243; Lane G đã thêm `npm run check:browser` vào `verify` để `groundstead/` tự bảo đảm trình duyệt (chưa xác nhận trên CI). G-26 vẫn nên làm. |
| E4 | **GS-H01: repo trống `tranhatam-collab/groundstead`** và quyền cho Claude GitHub App. | Tạo repo, cấp quyền. | GS-001 (tách thư mục `groundstead/` sang repo riêng) | Tách lịch sử bằng `git subtree split`, không viết lại lịch sử repo hiện tại. |

## F. Không chặn việc đưa landing lên (theo backlog)

Mỗi mục sau đang chờ chủ dự án, nhưng không task nào phụ thuộc, hoặc chỉ chặn việc khác:

- **GS-H04, GS-H05** (tài khoản affiliate đứng tên IAI LLC; nâng Vercel lên Pro trước khi bật liên kết affiliate, vì gói Hobby là phi thương mại): chặn **GS-066**.
- **GS-H06** (quyết định tên sau báo cáo tra nhãn hiệu sơ bộ), **GS-H07** (tài khoản Stripe nếu muốn thu phí Member), **GS-H09** (xác minh quyền sở hữu site trên Google Search Console), **GS-H10** (xác nhận định vị SI Bank): không task nào phụ thuộc.

## G. Lane G sẽ không làm nếu không có phê duyệt rõ

Không đổi DNS, vùng Cloudflare, thanh toán hay bí mật; không tắt Vercel Authentication; không tạo hoặc đặt khóa; không đổi `review.status` nào khi chưa có bản ghi duyệt thật; không công bố nội dung `AI_DRAFT`; không trích nội dung GDACS công khai; không merge, không force-push, không viết lại lịch sử; không đụng ngoài `groundstead/` và nhánh `ccr-8dbbf147-1ge7hc`.
