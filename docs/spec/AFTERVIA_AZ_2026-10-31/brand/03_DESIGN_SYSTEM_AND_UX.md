# Design system và trải nghiệm
## Bố cục
Mobile: 4 mục Món đồ / Hồ sơ / Nhắc việc / Tài khoản. Nút thêm mở camera hoặc file picker có giải thích quyền.
Web khách: cùng chức năng, nhiều không gian đọc tài liệu.
Web Desk: thanh bên Hộp thư / Hồ sơ / Khách được chia sẻ / Nhóm / Báo cáo / Cài đặt. Mobile Desk chỉ xử lý tác vụ đơn, không cố nhét bảng lớn.

## Nguyên tắc thao tác
Một màn hình ưu tiên một hành động. Bước đầu không hỏi quá nhiều; thêm hóa đơn → duyệt 4 trường tối thiểu → lưu. Khi AI lỗi vẫn có nhập tay. Không bắt đồng bộ toàn bộ email.
Màu không phải tín hiệu duy nhất. Trạng thái gồm chữ và icon có label. Nút thực hiện hành động nguy hiểm mô tả hậu quả; xóa/chia sẻ/gửi thông tin cần xác nhận phù hợp.

## Tokens
Typography sans-serif hỗ trợ tiếng Việt, body16px mobile; spacing4/8/12/16/24/32; radius8/12; focus ring rõ; target tương tác đề xuất44×44 CSSpx trở lên.
Dark/light dùng semantic tokens (background, surface, text, muted, border, primary, danger), không hardcode màu vào component. Reduced motion, keyboard và screen-reader labels được nghiệm thu.
Ngôn ngữ lấy từ tệp localization; không VI/EN toggle trần, dùng “Tiếng Việt”, “English” cùng bộ chọn thị trường nếu cần.

## Trạng thái bắt buộc
Mọi route có loading, empty, success, error, permission denied, stale data và offline phù hợp. Offline không giả vờ gửi thành công; queue hiển thị pending và cho hủy. Nhắc việc bị tắt phải báo chính xác.
AI field có “chưa duyệt” và vị trí nguồn; bấm để đối chiếu ảnh gốc. Độ tin cậy do model tự nói không được biến thành xác suất kiểm chứng.

## SEO và public pages
Landing, pricing, privacy, terms, help có title/meta/canonical/H1/OG/alt và sitemap; noindex mọi hồ sơ riêng tư, trang app/dashboard không có dữ liệu nhúng công khai.
Các route chưa xây không tạo link rỗng hoặc '#'. Không public nhãn nội bộ, test data, dashboard giả số liệu.
