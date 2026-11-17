# Checklist kiểm trên thiết bị thật (DEV-01) và trình duyệt mục tiêu (DEV-02)

Ngày lập: 2026-11-13. Đây là bản chuẩn bị để chủ dự án (hoặc người được giao) cầm thiết bị
chạy được ngay, ghi bằng chứng về `docs/plan/evidence/`. Hai task DEV-01 và DEV-02 vẫn
WAITING_HUMAN trong backlog — tài liệu này không thay được buổi kiểm thật.

Quy tắc chung:
- Dùng dữ liệu bịa (tên, ảnh chụp giấy tờ mẫu), KHÔNG dùng dữ liệu thật của ai.
- Mỗi mục ghi: Đạt / Không đạt / Không kiểm được + ảnh chụp màn hình + ghi chú lỗi.
- Phát hiện lỗi: mở mục trong backlog, không sửa tại chỗ trên thiết bị.

## DEV-01 — iPhone và Android thật (ứng dụng Expo)

Chuẩn bị (một lần):
1. Máy phát triển cài theo `docs/dev/LOCAL_MACOS.md`; `npm ci` xanh.
2. `npx expo start` trong `apps/mobile` (Expo Go) — đủ cho vòng kiểm đầu.
   Development build chỉ cần khi Expo Go thiếu native module (hiện mã không có module ngoài Expo SDK).
3. Điện thoại và máy tính cùng mạng Wi‑Fi.

Giới hạn đã biết (đừng ghi thành lỗi mới):
- **Chưa có đăng nhập trên di động** (DEC03 chưa quyết; `SESSION_TOKEN` trong `apps/mobile/src/config.ts`
  là null): các luồng gọi API sẽ dừng ở trạng thái "chưa đăng nhập". Kiểm được giao diện,
  điều hướng, biểu mẫu, kiểm tra hợp lệ phía máy; KHÔNG kiểm được gửi thật lên máy chủ.

| # | Mục kiểm | Nơi trong ứng dụng | Đạt? |
|---|---|---|---|
| 1 | Mở ứng dụng, điều hướng tab không văng | các tab chính | |
| 2 | Tiếng Việt và English: đổi ngôn ngữ, không chuỗi sót, không tràn khung | Cài đặt | |
| 3 | Chế độ sáng và tối: tương phản đọc được ở cả hai | toàn ứng dụng | |
| 4 | Màn Quyền riêng tư: hiển thị đủ 6 bước còn chờ (LEGAL_PENDING), nút gửi yêu cầu xóa bị chặn đúng khi chưa đăng nhập, thông điệp rõ | Cài đặt → Quyền riêng tư | |
| 5 | Hướng dẫn hủy gói (T46): thấy cả hai vế — hủy gói không xóa tài khoản; xóa tài khoản không tự hủy gói ở App Store/Play | màn Quyền riêng tư | |
| 6 | Outbox ngoại tuyến: tạo thao tác khi tắt mạng, bật mạng lại thấy trạng thái đúng | luồng có ghi | |
| 7 | Bàn phím: không che ô nhập; cuộn được tới nút gửi | các biểu mẫu | |
| 8 | VoiceOver (iOS) / TalkBack (Android): đọc được nhãn các nút chính | tab + biểu mẫu | |
| 9 | Xoay màn hình / cỡ chữ hệ thống lớn: bố cục không vỡ | toàn ứng dụng | |
| 10 | Ghi model máy + phiên bản OS vào bằng chứng | — | |

## DEV-02 — Trình duyệt mục tiêu: Chrome, Safari, Firefox

Chuẩn bị: `npm run gate:local` đã xanh trên máy (Chromium tự động đã phủ phần e2e);
chạy Desk web cục bộ theo `docs/dev/LOCAL_MACOS.md`. Safari và Firefox KHÔNG kiểm tự động
được từ container (chỉ có Chromium) — đây là phần buộc phải làm tay.

Trên MỖI trình duyệt (phiên bản mới nhất; ghi số phiên bản):

| # | Mục kiểm | Gốc tự động đã có | Đạt C/S/F? |
|---|---|---|---|
| 1 | Đăng nhập dev, tạo case, đi hết luồng Desk chính | e2e Chromium (T17–T20) | |
| 2 | Tải tài liệu lên, xem, chia sẻ, thu hồi | T07/T08 | |
| 3 | Biểu mẫu Quyền riêng tư: yêu cầu xóa với xác thực lại; luồng 401 → đăng nhập lại | T25, T46 | |
| 4 | VI/EN và sáng/tối trên các màn chính | T32/T33 | |
| 5 | Responsive: 360px, 768px, 1280px — không tràn ngang, menu dùng được | T32 | |
| 6 | In/paste IME tiếng Việt trong ô nhập (dấu đầy đủ) | — | |
| 7 | Phím tắt điều hướng bằng bàn phím + focus nhìn thấy được | — | |
| 8 | Console không lỗi đỏ trong các luồng trên | điều kiện thoát của e2e | |

Ghi chú Safari: kiểm cả bản macOS và iOS (WebKit trên iPhone là engine duy nhất của iOS).
