# Kinh doanh, giá và giới hạn
Tất cả giá dưới đây là đề xuất USD/tháng, trước thuế, không phải giá đã bán.

| Gói | Giá | Phạm vi dự kiến |
|---|---:|---|
| Personal Basic | 0 | 50 món đồ, 250 MB tài liệu; nhận và theo dõi hồ sơ hậu mãi; xuất/xóa dữ liệu |
| Family | 4,99 | 500 món đồ, 2 GB, 5 thành viên; nhắc nâng cao và phân quyền gia đình |
| Desk Starter | 49 | 1 địa điểm, 2 nhân viên, 50 hồ sơ mới/tháng, 100 lần trích xuất/tháng |
| Desk Growth | 149 | 3 địa điểm, 10 nhân viên, 200 hồ sơ mới/tháng, 600 lần trích xuất/tháng |
| Desk Scale | 399 | 10 địa điểm, 30 nhân viên, 800 hồ sơ mới/tháng, 2.000 lần trích xuất/tháng |

Giới hạn lưu trữ Desk cần chốt sau đo beta; tạm đề xuất 5/20/80 GB. Không giới hạn quyền xem/xuất hồ sơ đã có chỉ vì hết quota. Khi hết quota, nhận hồ sơ bằng thao tác tay hoặc chờ kỳ mới; không tính phí vượt tự động. Không sử dụng số lượng hồ sơ lớn của gói Scale như bằng chứng giá này có lãi; phải đo chi phí thực theo p95.

## Giá trị và đơn vị tính
B2B trả tiền cho phần mềm và chỗ làm việc, không mua quyền bảo hành của người tiêu dùng. Family trả tiền cho tổ chức gia đình và tiện ích nâng cao, không mua quyền yêu cầu xử lý cơ bản.
ARPA mục tiêu 149 USD = 50%×49 + 30%×149 + 20%×399. ARPA các kịch bản khác là giả định thay đổi cơ cấu/giá, không cố định công thức này cho tất cả.

## Thu tiền và ghi nhận
Một subscription có một nguồn thanh toán chủ quản. Webhook lặp không được mở hai gói. Thuế gián thu không ghi thành doanh thu sản phẩm. Giao dịch chargeback/refund phải liên kết original transaction. Chỉ dùng số tiền xác nhận từ nguồn thanh toán để ghi thực thu.
Không trộn số tiền “khách được hoàn” với doanh thu AFTERVIA. Không thu success fee hoặc tiền hộ trong MVP.

## Khả năng sinh lời
Mục tiêu quản trị: biên đóng góp sau phí và COGS ≥60% trước tăng quảng cáo; thời gian hoàn vốn CAC B2B <6 tháng; giảm dần thời gian hỗ trợ sau onboarding. Đây là ngưỡng nội bộ, không cam kết.
ARPA149, hoàn1%, phí3,5%, chi phí trực tiếp35 tạo đóng góp đơn giản xấp xỉ107,35 USD/cửa hàng/tháng, chưa phân bổ cloud cố định và hỗ trợ ngoài COGS. CAC300 chia đóng góp này khoảng2,8 tháng, chỉ đúng nếu giả định giữ được và không phát sinh chi phí khác.
Giá Việt Nam cần thử riêng; không áp giá quốc tế chỉ vì mô hình mong muốn.
