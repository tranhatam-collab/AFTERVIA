# Mức sẵn sàng phát hành (kỹ thuật)

Tách khỏi số task DONE trong backlog. Mỗi dòng phải có bằng chứng đúng SHA, hoặc ghi trạng thái trung thực.
Trạng thái dùng: VERIFIED, PARTIAL, NOT_RUN, BLOCKED, HUMAN_REQUIRED.

| Yêu cầu | Bằng chứng hiện có (SHA) | Trạng thái | Còn thiếu |
|---|---|---|---|
| Hai tài khoản A/B, dữ liệu lưu thật trong Postgres, không đọc chéo, không nâng quyền, còn sau khởi động lại | DB và HTTP tests tại `de64fbb` | PARTIAL | Đăng nhập thật; giao diện; mobile |
| Tổ chức, thành viên, phân quyền (RLS, hàm kiểm quyền, đối chiếu TS/SQL) | `0001_initial.sql`, `policy-parity`, `tenant-isolation` | PARTIAL | Đường HTTP tới mọi thao tác; ghi nhật ký từ chối ở tầng API có vai trò riêng |
| Món đồ nhập tay, khóa phiên bản, cách ly | `0002_items.sql`, `items.test.ts`, `items-http.test.ts` | PARTIAL | Giao diện web/mobile (WO10); xóa; phân trang |
| Đăng nhập (JWT) | `jwt.test.ts`, `dev/sign-in` chỉ ở local/test | PARTIAL | Đăng nhập thật (D3); thu hồi và làm mới token |
| Chứng từ và lưu trữ riêng tư | Chưa có | NOT_RUN | WO05-01 |
| Trích xuất AI có dẫn nguồn | Chưa có | NOT_RUN | WO06 (cổng AI, quyền dữ liệu, đánh giá) |
| Hồ sơ hậu mãi, trạng thái, cập nhật | Chưa có | NOT_RUN | WO08 |
| Chia sẻ tài liệu, thu hồi | Chưa có | NOT_RUN | WO09 |
| Web và mobile responsive, VI/EN, sáng/tối, accessibility | Chưa có | NOT_RUN | WO10, WO15 |
| Xuất dữ liệu, xóa tài khoản | Chưa có | NOT_RUN | WO11 |
| Thuê bao sandbox, webhook chống replay | Chưa có | NOT_RUN | WO12 |
| DAST | Không chạy được | BLOCKED | Docker, `HAWK_API_KEY`, máy chủ HTTP độc lập (D4) |
| Build và kiểm trên thiết bị iOS/Android thật | Chưa có | HUMAN_REQUIRED | Thiết bị và tài khoản store |
| Sao lưu và khôi phục có diễn tập | Chưa có | NOT_RUN | WO16-01, staging (INF-01) |
| Đánh giá bảo mật độc lập | Chưa có | HUMAN_REQUIRED | Reviewer ngoài (DEC05) |
| Pháp lý, IP, store, pilot với khách | Chưa có | HUMAN_REQUIRED | Luật sư, nhãn hiệu, khách thật |

**ENGINEERING_ACCEPTED: CHƯA ĐẠT.** Còn nhiều dòng NOT_RUN và PARTIAL. Không tuyên bố production-ready, pháp lý hay kinh doanh.
