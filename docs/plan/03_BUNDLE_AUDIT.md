# Kiểm toán bộ đặc tả AFTERVIA (31/10/2026)

Phạm vi: 70 tệp trong `docs/spec/AFTERVIA_AZ_2026-10-31/`. Đây là kiểm tra nội dung và số liệu, không phải kiểm thử ứng dụng.

## 1. Kiểm tra đã thực hiện

| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| SHA-256 của 69 tệp theo `04_SHA256SUMS.txt` | 69/69 khớp | `tools/checks/bundle-verify.mjs`; cũng kiểm không có tệp ngoài manifest |
| Chạy lại `finance/06_RECOMPUTE_MODEL.py` (`python3 -I`) | Khớp 18/18 số làm tròn | Thận trọng: DT năm 1 27.956; DT năm 2 309.559; KQ vận hành năm 2 −437.308; ARR tháng 24 569.194; merchant 465; vốn 822.179. Mục tiêu: 87.036; 1.012.782; −125.523; 1.904.265; 1.017; 608.980. Tăng tốc: 211.663; 2.508.759; +273.659; 4.756.919; 2.097; 785.335. |
| Số lượng theo bản thuyết minh | 23 tuyến màn hình, 20 user story, 22 bảng, 13 thao tác API, 46 kiểm thử, 32 nguồn, 12 prompt | Khớp với CSV và OpenAPI. Không ghi nhận sai lệch đếm. |
| Ngân sách và định giá (`02_MASTER` mục U, V) | Phép tính 1 tỷ USD / 10, 20, 30 lần đúng; cấu hình 105,592 triệu USD đúng | Đây là độ nhạy toán học, không phải dự báo. |
| Mô hình tài chính `.xlsx` | Chỉ kiểm qua script tính lại 24 số tóm tắt | Công thức từng ô chưa được rà toàn bộ. |
| `02_MASTER_PLAN_A_TO_Z.docx` | Chưa đối chiếu từng đoạn với bản `.md` | Đọc đầy đủ bản `.md`; bản `.docx` được coi là cùng nội dung chỉ khi có đối chiếu. |
| Trạng thái kiểm thử và work order | 46 `NOT_RUN`, 22 WO `NOT_STARTED`, 32 đường dẫn `PLANNED_NOT_GENERATED` | Đúng như mô tả; không có mã ứng dụng nào tồn tại trước vòng lặp. |

## 2. Khoảng trống và mâu thuẫn đã xác minh

Các mục dưới đây đã được kiểm bằng cách đọc hoặc tìm kiếm trong bộ đặc tả.

| ID | Khoảng trống | Bằng chứng | Xử lý trong kế hoạch |
|---|---|---|---|
| G-1 | Thiếu bảng cho thông báo, lời mời, gia đình, và phê duyệt break-glass của hỗ trợ | `02_DATA_DICTIONARY.csv` có 22 bảng, không có `notifications`, `invitations`, `family_*`, `support_access_*`; PRD và bản thuyết minh nhắc tới các chức năng này | Thêm migration khi tới WO09, WO13, WO16 (ghi vào backlog) |
| G-2 | OpenAPI thiếu thao tác cho danh sách/tìm kiếm, lời mời, thông báo, webhook thanh toán, khôi phục tài khoản, quản trị | `03_API_CONTRACT.openapi.yaml` có 13 `operationId`; `03_API_SCOPE_NOTES.md` thừa nhận thiếu | Tạo OpenAPI v0.2 trước WO09-03; không gọi là API hoàn chỉnh |
| G-3 | Manifest đề xuất `apps/mobile` và `apps/web`; repo hiện không có | `10_REPO_FILE_MANIFEST.csv` | DEC-ENG-03: tạo khi tới WO10 |
| G-4 | Số phỏng vấn không khớp giữa các tài liệu | `03_EXPERIMENT_REGISTER` E01 đếm 15 cửa hàng; bản thuyết minh mục R nêu 30 phỏng vấn (15 cửa hàng, 10 khách, 5 đơn vị dịch vụ) | Ghi rõ E01 chỉ đếm cửa hàng; HUM-WO02-02 dùng tổng 30 |
| G-5 | T45 (quyền dữ liệu cho AI) được gắn WO09 trong CSV, nhưng nội dung chủ yếu thuộc WO06 | `01_ACCEPTANCE_TESTS.csv` và `02_BACKLOG_WORK_ORDERS.csv` | Ánh xạ T45 sang WO06-02 (chính) và WO09-02 (grant) |
| G-6 | Tiêu chí tải "profile pilot đã công bố" (T40) không tồn tại | Tìm `concurrent`, `rps`, `req/s`, `profile` trong bộ hồ sơ: không có định nghĩa tải | HUM-WO19-01 phải định nghĩa profile trước khi đo; WO15-02 chỉ đo cục bộ |
| G-7 | Phiên bản trình duyệt mục tiêu (T36) chưa được chốt | `01_ACCEPTANCE_TESTS.csv` T36 chỉ ghi "Chrome/Safari/Firefox target versions" | Chủ dự án chốt trước DEV-02 |
| G-8 | WO01 (G0) là phụ thuộc của WO02–WO04 trong CSV, nhưng là việc của người | `02_BACKLOG_WORK_ORDERS.csv` | DEC-ENG-05: việc synthetic chạy trước; dữ liệu thật vẫn chờ G0 |
| G-9 | Ngôn ngữ "100% kết quả" trong bản tóm tắt chat trước đó không có căn cứ | Bản thuyết minh mục Q và `05_PACKAGE_QA_REPORT.md` nói rõ không có ứng dụng, không có test chạy, không có khách trả tiền | Không dùng cụm từ đó trong báo cáo; mọi tiến độ phải có bằng chứng |

## 3. Điều bộ đặc tả đã nói đúng (và được giữ nguyên)

- Không có ứng dụng, không có doanh thu, không có pháp lý được phê duyệt.
- Tên AFTERVIA chưa clearance; không dùng ký hiệu ®.
- Mục tiêu một tỷ USD là kịch bản định giá có điều kiện.
- Dữ liệu cá nhân không được bán; không có thu tiền hộ; không có quảng cáo bằng chứng giả.
