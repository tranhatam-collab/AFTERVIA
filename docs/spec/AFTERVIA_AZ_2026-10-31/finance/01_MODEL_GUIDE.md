# Cách đọc mô hình tài chính24 tháng
Trạng thái: MODELED_ASSUMPTIONS_NOT_ACTUALS. Ngày mô hình31/10/2026. USD, trước thuế thu nhập, lãi vay, capex, khấu hao và tài trợ. Không có doanh thu, lợi nhuận hoặc tiền vào thực tế đã xác nhận.

## Cấu trúc workbook
Summary: chỉ tiêu năm 1/năm 2/tháng 24 và biểu đồ doanh thu.
Inputs: giả định3 kịch bản, phí, churn, COGS, giá và Opex.
Base_acquisition: kế hoạch merchant mới/tháng, không phải pipeline ký.
Conservative / Target / Acceleration:24 tháng công thức.
Valuation: độ nhạy định giá và cấu hình dài hạn, không phải comparable transactions.
Sources:32 nguồn nghiên cứu; không dùng nguồn thị trường như chứng cứ các input tài chính dự án đã đúng.

## Màu và đơn vị
Blue: số đầu vào; nền vàng: cần kiểm chứng; green: công thức liên kết sheet; black: tính cùng sheet. Số âm trong ngoặc đỏ, zero hiển thị gạch. Các khách lẻ có phần thập phân là kỳ vọng mô hình, không phải có một phần người mua thật.
Input có comment nguồn: giả định tác giả, không bịa benchmark.
Sửa các ô input thay vì sửa công thức; settlement lag phải là số nguyên0–24 tháng.

## Logic từng tháng
Merchant cuối = merchant đầu ×(1−churn)+merchant mới.
Bình quân merchant=(đầu+cuối)/2.
Family mới=bình quân merchant×40 đơn đủ điều kiện×25%đăng ký×tỷ lệ chuyển Family.
Family cuối=Family đầu×(1−churn Family)+Family mới; doanh thu tính trên bình quân đầu/cuối.
Gross B2B=bình quân merchant×ARPA; gross Family=bình quân Family×4,99.
Doanh thu thuần mô hình=gross−refund. Phí xử lý được tính sau refund theo giả định đơn giản; phí refund không được hoàn thực tế phải bổ sung sau chọn provider.
Gross profit=net revenue−payment fees−direct COGS−fixed infra.
Operating result=gross profit−Opex−acquisition.
Cash-in=net revenue của tháng trước mặc định; cash-out gồm phí/COGS/Opex/acquisition hiện tại.
Vốn thiếu=max(0,−min(cumulative cash flow)); dự phòng20% cộng riêng. Không coi số dư khởi tạo0 là số dư ngân hàng người dùng.

## Giả định trọng yếu
Target: merchant churn1,5%/tháng; ARPA149; CAC300; merchant direct cost35/tháng; Family churn4%; conversion3%; Opex10k→55k/tháng.
Phí B2B3,5% là giả định. Phí Family23,25%=75%giao dịch ở mức phí30% +25%ở mức3%; đây là cấu hình giả định, không khẳng định chính sách Apple/Google hiện hành. Phải thay theo hợp đồng/storefront thật.
COGS merchant bao gồm hỗ trợ/AI trực tiếp theo mức bình quân dự kiến; Opex là vận hành không phải bán hàng; acquisition gồm chi phí tuyển khách trực tiếp. Không đưa cùng lương sales hoặc support vào hai dòng.
Chưa có VAT/GST/sales tax trong revenue; nghĩa vụ kế toán thực cần chuyên gia.

## Các giới hạn quan trọng
Không annual prepay/deferred revenue; không FX; không seasonality/cohort expansion; không doanh thu marketplace/OEM trong24 tháng; không capex/financing costs; refund rate chỉ mô hình; không tối ưu chi phí tự động.
Nếu payment fees bị net từ khoản settlement, sổ cash-in/out thực phải đổi để không trừ phí hai lần.
Kịch bản thận trọng vẫn chạy24 tháng để cho thấy rủi ro; thực tế phải dừng sớm theo gate, không khuyến nghị đốt hết vốn.

## Kết quả
Target net revenue năm 2≈1.012.782 USD, operating result≈−125.523 USD, M24 net ARR≈1.904.265 USD, vốn thiếu cực đại≈507.484 USD, cộng20%≈608.980 USD.
Ba đại lượng revenue, ARR, profit không thay nhau. Model không cho phép tuyên bố giá trị nền tảng1 tỷUSD.
