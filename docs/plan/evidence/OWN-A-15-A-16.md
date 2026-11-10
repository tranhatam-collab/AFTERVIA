# OWN-A-15 và OWN-A-16: header bảo mật cho Desk, sink mở rộng, và sửa hồ sơ

- Ngày 10/11/2026. Không có migration.

## OWN-A-15 (A-11): header bảo mật cho Web Desk

Landing có `_headers` nghiêm và có kiểm thử; Desk thì chưa có gì, nên một Desk được host sẽ trả lời
mà không có CSP, không chặn frame, không có referrer policy.

Đã đo bản build trước khi viết CSP: `apps/web/dist/index.html` chỉ có **một** thẻ script tải từ tệp
ngoài và một stylesheet ngoài, **không có script inline**. Nên `script-src 'self'` là đủ, không cần
`unsafe-inline`. Desk gọi API cùng gốc nên cần `connect-src 'self'`. Favicon là `data:,` nên
`img-src` có thêm `data:`.

`apps/web/public/_headers` (Vite copy sang `dist` khi build):

```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self';
connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'
```

kèm `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`,
`Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `Strict-Transport-Security` (không
`includeSubDomains`, để không ảnh hưởng subdomain khác của `iai.one`).

`tests/web/desk-headers.test.ts` (3 kiểm thử): CSP có đủ directive và không có `unsafe-` hay `*`;
các header còn lại có mặt; bản build mang tệp đi theo và mọi thẻ script trong trang đều có `src`
(nếu một thẻ inline xuất hiện thì `script-src 'self'` sẽ làm app chết, nên kiểm thử chặn trước).

## OWN-A-15 (A-12): regex chặn sink và kiểm thử cho escapeHtml

`tests/web/desk.test.ts` chỉ chặn sink HTML thô (`innerHTML`, `eval`, …). Nay thêm các sink dựng URL
và thuộc tính: `setAttribute(`, `.href =`, `.src =`, `javascript:`, `window.open(`,
`location.href/assign/replace`. Chạy sau khi mở rộng: **không có vi phạm nào** trong `apps/web/src`,
nên kết luận "hiện không có sink nào" của bản audit được xác nhận bằng luật nghiêm hơn.

`escapeHtml` của landing trước đây chỉ được phủ gián tiếp qua trang đã dựng.
`tests/web/escape-html.test.ts` (5 kiểm thử) kiểm trực tiếp: năm ký tự `& < > " '`; dấu `&` được thoát
trước nên không tạo entity sai; thẻ script và hai kiểu thoát khỏi thuộc tính; chữ không cần thoát
(gồm tiếng Việt) giữ nguyên; và giá trị không phải chuỗi.

## OWN-A-16: sửa hồ sơ

### Ma trận nghiệm thu (A-07, A-10 của bản audit)

- Thêm cột **`evidence`**. Giá trị sinh bằng cách nối `mapped_tasks` với tệp `docs/plan/evidence/<id>.md`
  thực có. 46 dòng: 37 dòng có ít nhất một tệp bằng chứng, **9 dòng không có tệp nào** — chỗ trống đó
  tự nó là thông tin.
- Sửa `mapped_tasks` trỏ sai: `WO11-02` và `WO16-01` **không phải mã task** (chúng đã được tách).
  4 chỗ được thay bằng mã thật: `WO11-02` → `WO11-02a;WO11-02b;WO11-02c;WO11-02e-EXP;WO11-02e-CONF;
  WO11-02e-CASE;WO11-02f-SESS;WO11-02g-MEM`; `WO16-01` → `WO16-01a`.
- **T21** đổi `PASS` → `MANUAL_PARTIAL`. T21 thuộc lớp DEVICE và DEV-01 vẫn chờ người, nên PASS là nói
  quá. Ghi chú đã ghi rõ lý do.
- `tools/loop/matrix.mjs summary` và `npm run test:loop` vẫn chạy sau khi thêm cột: 46 dòng, 18/18.

### Trạng thái vòng lặp (A-13, A-15)

`docs/plan/05_AUTONOMY_STATUS.md` ghi ngân sách được nâng ngày **03/11**. Lịch sử git không có thay đổi
nào ngày đó: `iteration_budget` 60 → 65 nằm trong commit `2b4bc01` ngày **06/11**. Đã sửa ngày, ghi rõ
việc nâng được sửa tay ngoài công cụ (A-15), và thống nhất con số: `meta.iterations_used` là **66**,
nên mọi chỗ ghi "65/65" đổi thành "66/65".

### Nội dung landing (A-08, A-12 của bản audit)

- Ba mục đang bị xếp vào nhóm "Dự kiến — chưa bắt đầu" trong khi backlog ghi DONE, đã chuyển sang nhóm
  "Đang được xây dựng và kiểm thử; chưa mở cho khách hàng": ứng dụng web và vỏ di động, quy trình xử lý
  hồ sơ cho cửa hàng, xuất và xóa dữ liệu theo yêu cầu. Chuyển ở **cả VI và EN**: build landing kiểm
  hai ngôn ngữ phải cùng cấu trúc, nên sửa một bên làm build đỏ (đã gặp và đã sửa trong lượt).
- Câu "Trang này không thu thập dữ liệu" là tuyệt đối. Đổi thành "không thu thập dữ liệu **của bạn**",
  và thêm một câu: máy chủ lưu trữ vẫn có thể ghi nhật ký truy cập như mọi trang web. Sửa ở cả hai
  ngôn ngữ. Landing vẫn chưa công bố (WEB-02 chặn, HUM-WEB-03 chờ người).

## Giới hạn

- Header của Desk là tệp `_headers` theo định dạng Cloudflare Pages, giống landing. Nếu Desk được host
  ở nơi khác thì phải dịch sang cấu hình của nơi đó. Chưa host ở đâu.
- Cột `evidence` chỉ nối theo tên tệp, không kiểm nội dung tệp có nói về đúng test id đó.
- 9 dòng ma trận chưa có tệp bằng chứng; chưa xử lý trong lượt này.
