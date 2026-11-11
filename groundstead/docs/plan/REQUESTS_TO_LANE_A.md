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
