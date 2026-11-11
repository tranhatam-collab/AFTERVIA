# 11 — Đường lui (giai đoạn H)

Lượt này không thay đổi gì ngoài commit tài liệu. Tài liệu này ghi đường lui cho các bước sau.

## Tài liệu (commit trong lượt này)

- Hoàn tác bằng commit mới: `git revert <sha-commit-tài-liệu>`. Không force push, không rebase. [V] Đây là ràng buộc của lệnh.

## Workflow `ci.yml` (nếu thay đổi sau này)

1. Revert commit thay đổi workflow. [R]
2. Nếu CI gây tốn phút ngoài ý muốn, tắt workflow ngay: Actions → chọn `ci` → menu "..." → Disable workflow. Thao tác này không xóa file và có thể bật lại. [R] theo giao diện GitHub, chưa kiểm trên tài khoản này.
3. Không dùng cách này để che lỗi. Ghi lý do vào nhật ký.

## Landing trên Cloudflare Pages (nếu triển khai sau này)

1. Khôi phục deployment trước đó trong dashboard Pages. [U] Cần kiểm trên tài khoản thật trước khi dựa vào.
2. Nếu chưa có deployment trước đó (lần đầu): gỡ tên miền khỏi project, hoặc đặt `AFTERVIA_SITE_ENV=preview` và build lại. [U]
3. Không xóa project khi chưa có phê duyệt. [P]

## Dữ liệu và migration

Lộ trình này không có migration và không thay đổi dữ liệu. Không có gì cần khôi phục ở tầng dữ liệu. [V] (không có tệp migration nào thay đổi trong lượt này)
