# Báo cáo nhu cầu: những gì dự án cần từ chủ dự án (13/11/2026)

Lập theo chỉ đạo 13/11: hai lane chuyển sang dev local, làm hết việc tự làm được, và báo cáo
chi tiết những gì cần cung cấp. Mỗi mục ghi: **cần gì → cung cấp bằng cách nào → mở khóa việc
gì → lane sẽ làm gì ngay sau khi có**. Khóa và mật khẩu LUÔN đặt qua cài đặt môi trường hoặc
secret store, KHÔNG dán vào chat.

Phạm vi: AFTERVIA (lane A). Groundstead (lane G) có báo cáo riêng do lane G lập trong
`groundstead/` trên nhánh `ccr-8dbbf147-1ge7hc` — đã gửi yêu cầu phối hợp 13/11, chờ phản hồi.

## Nhóm 1 — Nhanh nhất, mở khóa nhiều nhất (làm trước)

| # | Cần gì | Cung cấp bằng cách nào | Mở khóa | Lane A làm ngay sau khi có |
|---|---|---|---|---|
| 1.1 | **THU HẸP 13/11: CI đã tự chạy lại** (run 132 xanh trên `4a8449b`). Còn lại: mở Billing & plans xem (a) số phút Actions tháng 11 + spending limit, (b) có sự kiện nào khớp mốc dừng 10/11 ~16:50 UTC và mốc chạy lại trước 13/11 01:38 UTC không | Đọc 1 trang, nhắn lại kết quả (không cần khóa) | Xác minh "0 USD" (API vẫn trả 0 phút cho run thật — không kết luận được); biết sự cố có tái diễn không | Ghi vào `docs/operations/zero-cost-cicd/03`; nếu anh duyệt thêm D22 + đề xuất 06 thì áp dụng tối ưu CI từng bước, nay kiểm chứng được vì CI sống |
| 1.2 | **HAWK_API_KEY + HAWK_APP_ID** (StackHawk: tạo tài khoản + application, lấy applicationId) | Đặt 2 biến trong cài đặt môi trường của phiên (trang cài đặt sẽ hiện dưới dạng thẻ trong ứng dụng) | WO17-01b (DAST) — một trong hai việc đang chặn WO20-01 | `npm run api:local` + `hawk scan` theo `stackhawk.yml` đã soạn sẵn; sửa phát hiện; lưu bằng chứng |
| 1.3 | **Quyết DEC03: nhà cung cấp danh tính** (đề xuất sẵn: Supabase project thuộc chủ dự án) | Nhắn "DUYỆT DEC03 = Supabase" (hoặc lựa chọn khác) + tạo project + đặt URL/khóa qua biến môi trường | Đăng nhập thật; đăng nhập di động (hiện CHƯA CÓ); xác thực lại trước khi xóa; làm mới phiên; D16 phương án A | Tích hợp đăng nhập thật thay giả lập HS256; nối di động; cập nhật luồng xóa tài khoản |
| 1.4 | **Gửi gói danh mục xóa cho luật sư** (HUM-LEGAL-DEL-01) — tài liệu đã sinh sẵn từ lược đồ thật: `docs/legal/DRAFT_danh-muc-xoa-va-giu-lai.md` (28/32 bảng chưa quyết, 6 rủi ro cao, có ô ký) | Chuyển tài liệu cho luật sư; nhận lại bản có quyết định từng bảng | Việc thứ hai đang chặn WO20-01; D18 | Mã hóa quyết định vào `tools/legal/deletion-catalogue.mjs` (kiểm thử trôi dạt tự đỏ nếu lệch), cập nhật màn Quyền riêng tư |

## Nhóm 2 — Quyết định một dòng (nhắn trong chat là đủ)

| # | Quyết định | Lựa chọn (đề xuất in đậm) | Mở khóa |
|---|---|---|---|
| 2.1 | D16 kho byte tài liệu | **(A) kho object của nhà cung cấp danh tính** (đi cùng DEC03) / (B) Postgres tạm / (C) tự vận hành | WO10-03d: tải lên/tải xuống tài liệu thật |
| 2.2 | D17 link tải gói xuất 24h | **(1) route tải có phiên** / (2) mã một lần / (3) email / (4) trả ngay | HUM-WO10-03a; cần duyệt thêm route vào hợp đồng OpenAPI |
| 2.3 | D20 đưa `check:mobile-bundle` vào verify | **(a) đưa vào** (~1 phút CI) / (b) giữ riêng | Cổng bắt lỗi bundle di động tự động |
| 2.4 | D21 nơi chạy purge gói xuất | (a) cron máy dự án / (b) job hosting / **(c) chờ staging** | Đóng hẳn D-03 ở tầng hạ tầng |
| 2.5 | D22 thêm `workflow_dispatch` vào ci.yml | **Có** / Không | Chạy lại CI không cần commit mới (đã hỏi 10/11) |
| 2.6 | D19 scanner tệp tải lên | (a) **giữ nguyên tới khi có scanner** / (b) chặn SCANNER_UNAVAILABLE / (c) dịch vụ riêng | Đóng D-04 của kiểm toán |
| 2.7 | D1/D2/D6/D7 vận hành vòng lặp + trạng thái PR #1 | giữ như đề xuất trong `06_DECISION_QUEUE.md` | Quản trị |

## Nhóm 3 — Cần tài khoản hoặc tiền (theo lộ trình go-live)

| # | Cần gì | Cung cấp | Mở khóa |
|---|---|---|---|
| 3.1 | Tài khoản Cloudflare + token phạm vi Pages | Token qua biến môi trường; quyết D14/WEB-02 (hosting + DNS `aftervia.iai.one`) | Landing lên preview rồi production (quy trình soạn sẵn: `docs/operations/zero-cost-cicd/10`) |
| 3.2 | Duyệt nội dung công khai landing (HUM-WEB-03, cần luật sư) | Văn bản duyệt | `AFTERVIA_SITE_ENV=production` (bỏ noindex) |
| 3.3 | Reviewer bảo mật độc lập (DEC05, HUM-WO17-02) | Chọn người + đặt lịch; gói bằng chứng WO17-01a đã dựng sẵn | Điều kiện bắt buộc của G4 |
| 3.4 | Thiết bị iPhone + Android thật (DEV-01), trình duyệt Safari/Firefox (DEV-02) | Cầm máy chạy theo `docs/dev/DEVICE_TEST_CHECKLIST.md` (soạn sẵn 13/11) | Hai dòng HUMAN_REQUIRED của bảng sẵn sàng |
| 3.5 | Staging + nơi lưu sao lưu ngoài DB (INF-01; liên quan D16, D21) | Hạ tầng theo quyết định của anh | Đo RPO/RTO thật; kiểm kill switch; kịch bản rollback production |
| 3.6 | Tài khoản App Store + Google Play, và DEC09 (billing live) | Tài khoản + quyết định | WO18-01 (đang BLOCKED), phát hành di động, thu tiền thật |
| 3.7 | DEC01–DEC12 còn lại (HUM-DEC-01): tên pháp nhân, vendor AI/region (DEC06-AI đã quyết), quốc gia pilot (DEC07 đề xuất VN)… | Nhắn từng mã | Pháp lý, pilot (HUM-WO19-02), tăng trưởng |

## Những gì lane A ĐÃ tự làm xong, không cần chờ (13/11)

- **D5 — vai trò kết nối API không superuser**: migration `0033_api_connect_role.sql` +
  10 kiểm thử (`tests/db/api-connect-role.test.ts`), đột biến M1/M2/M3 đều bị bắt.
- **Cổng cục bộ thay CI**: `npm run gate:local` + `docs/dev/LOCAL_GATE.md`.
- **Chuẩn bị DAST**: `stackhawk.yml` (chờ 2 biến ở mục 1.2).
- **Checklist thiết bị**: `docs/dev/DEVICE_TEST_CHECKLIST.md` (chờ máy ở mục 3.4).
- **Điều phối lane G**: đã gửi yêu cầu lập báo cáo nhu cầu riêng cho Groundstead.
- **Bản nháp monitoring + support** (hai ô trống của G4): `docs/ops/DRAFT_monitoring-support-runbook.md`
  — cần anh điền các ô 【...】 và duyệt.

## Bản đồ phụ thuộc ngắn

```
1.1 CI chạy lại ──────────────► release receipt ─┐
1.2 HAWK_* ───► DAST (WO17-01b) ─┐               ├─► WO20-01 (checklist G4) ─► HUM-WO20-02 (duyệt phát hành)
1.4 luật sư ───► D18 danh mục xóa ┘               │
1.3 DEC03 ───► đăng nhập thật + di động ──────────┤
3.3 reviewer ─────────────────────────────────────┤
3.4 thiết bị + 3.5 staging + monitoring/support ──┘
3.1 + 3.2 ───► landing production (độc lập với nhánh trên)
```
