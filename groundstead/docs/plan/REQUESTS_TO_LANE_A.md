# Yêu cầu gửi Lane A (phần gốc AFTERVIA)

Lane G ghi các yêu cầu cần thay đổi ngoài `groundstead/` vào file này. Lane G không sửa `.github/workflows/`, `supabase/` hay các file gốc của repo.

## G-20: job ký gói trong CI được bảo vệ; khóa không nằm trong build Vercel

- Trạng thái: **CHỜ XÁC NHẬN của chủ dự án**. Yêu cầu này đổi cổng phát hành. Lane G chưa làm gì trong repo này; chỉ ghi yêu cầu.
- Vì sao: `groundstead/tools/build/postbuild.mjs` đọc `GROUNDSTEAD_PACK_PRIVATE_KEY` từ biến môi trường lúc build. Mục tiêu là khóa ký không có mặt trong build Vercel, cả Preview lẫn Production.
- Yêu cầu cho Lane A:
  1. Thêm một job CI được bảo vệ (ví dụ một GitHub environment có người duyệt, chỉ chạy trên nhánh được phép) để ký gói ngoại tuyến: nhận bản dựng, ký manifest, xuất gói đã ký.
  2. Chỉ job đó được cấp `GROUNDSTEAD_PACK_PRIVATE_KEY`. Không đặt biến này trong dự án Vercel.
  3. Build Vercel chạy không có khóa ký. Phần đầu ra không ký ở build Vercel được xử lý theo G-22, còn chờ xác nhận riêng.
- Không thuộc yêu cầu này: tạo khóa thật (D-30, HUMAN), đặt tên khóa công khai, và sửa nội dung trang.
- Lưới an toàn đã có trong repo: `groundstead/tools/checks/bundle-secret-scan.mjs` chặn tên biến này và khóa private trong bundle client (G-21, `52a41a0`). Lưới này không thay thế việc tách khóa khỏi build.
- Người ghi: Lane G, lượt OWN-G-04.

## G-26: job `groundstead-verify` cài sai bản Chromium, 41 kiểm thử e2e đỏ

- Trạng thái: **ĐÃ XONG (Lane A, `f3f1685`); xác nhận trên CI 13/11/2026**: run `43364646021`, job `groundstead-verify` xanh (276/276 kiểm thử node, 6/6 bản production). Lane G không sửa `.github/workflows/`; chỉ ghi yêu cầu.
- Bằng chứng: run `43345425301` (13/11/2026, commit `cc161b6`, PR #2). Đây là lần đầu job chạy thật. Build, typecheck, quét bí mật và 232 kiểm thử đạt; 41 kiểm thử e2e đỏ, mỗi cái chỉ có dòng "failed running before hook" (hook `before` không mở được trình duyệt).
- Nguyên nhân (suy ra; chưa thấy lỗi thật trong log CI vì runner lúc đó không in `cause`): bước `npx playwright install --with-deps chromium` chạy ở thư mục gốc khi gốc chưa `npm ci`, nên `npx` lấy Playwright mới nhất (1.65.0, Chromium revision 1254). `groundstead/package.json` ghim Playwright 1.63.0, cần revision 1243. Tái hiện triệu chứng cục bộ: `PLAYWRIGHT_BROWSERS_PATH` trỏ vào thư mục rỗng cho ra đúng dòng đó, kèm `Executable doesn't exist at .../chromium_headless_shell-1243/...`.
- Yêu cầu cho Lane A (job `groundstead-verify` trong `.github/workflows/ci.yml`): đặt bước "Install the browser the groundstead e2e tests use" **sau** bước `npm ci` của `groundstead/` và thêm `working-directory: groundstead`, để `npx playwright install --with-deps chromium` dùng đúng bản Playwright đã ghim.
- Lane G đã làm phần trong lane (`84f4e1e`): runner kiểm thử in cả `cause` của hook. Lần chạy CI sau sẽ ghi rõ lỗi thật; nếu lỗi khác revision 1243 thì giả thuyết trên sai và cần xem lại.
- Cập nhật cùng ngày (log CI thật, run `43363949190`, commit `c598506`): xác nhận `caused by: browserType.launch: Executable doesn't exist at /home/runner/.cache/ms-playwright/chromium_headless_shell-1243/...`. Runner CI thiếu đúng revision mà `groundstead/` cần; việc bước cài trình duyệt đã cài bản nào khác thì chưa đọc được trong log.
- Lane G thêm `npm run check:browser` vào `verify` (`groundstead/tools/checks/ensure-browser.mjs`): hỏi chính Playwright đã ghim có mở được Chromium không; thiếu thì chạy `playwright install chromium`; máy đã có trình duyệt thì không tải gì. Nhờ đó CI của `groundstead/` không còn phụ thuộc vào bước cài trình duyệt trong `ci.yml`. Trên CI, `check:browser` in "browser ready" nên không phải cài gì; bản sửa `ci.yml` của Lane A là cái có tác dụng, `check:browser` là lớp dự phòng.
- Người ghi: Lane G, 13/11/2026.
