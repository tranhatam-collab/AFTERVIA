# Groundstead — Sổ quyết định

Quyết định nào cũng ghi: câu hỏi, lựa chọn, quyết định, ngày, người quyết. Vòng lặp không tự quyết những việc thuộc phạm vi chủ dự án.

## Đã quyết

| ID | Câu hỏi | Quyết định | Ngày | Người quyết |
|---|---|---|---|---|
| D-01 | Code của nền tảng mới đặt ở đâu? | Repo riêng `tranhatam-collab/groundstead`. Trong lúc chờ repo, dự án nằm tạm trong `groundstead/` trên nhánh làm việc của AFTERVIA và sẽ được tách nguyên lịch sử. | 06/11/2026 | Chủ dự án |
| D-02 | 45 ngày đầu build gì? | Song song như bản Groundstead: 8 module lộ trình + Chế độ 72 giờ, EN/VI. | 06/11/2026 | Chủ dự án |
| D-03 | Ngân sách và mô hình vận hành? | "Giao AI làm hết 100%, không có đầu tư gì ngoài web app, không làm kho bãi chứa hàng hóa, mà chỉ liên kết với tất cả những kho hãng nhà cung cấp có sẵn trên toàn cầu, rồi sau đó tổng hợp thiết kế thành từng gói riêng cho dự án này." (trích nguyên văn) | 06/11/2026 | Chủ dự án |
| D-04 | Vòng lặp được làm gì với dịch vụ ngoài? | Preview riêng tư trên Vercel và project Supabase dev (dữ liệu giả); landing EN/VI công khai tại `groundstead.iai.one` sau khi chủ dự án duyệt nội dung và có quyền DNS. Không mua tên miền, không thanh toán, không dữ liệu thật. | 06/11/2026 | Chủ dự án |
| D-05 | Số hiệu văn bản pháp luật VN dùng trong kế hoạch | Luật TMĐT 122/2025/QH15 + NĐ 248/2026/NĐ-CP; Luật BVDLCN 91/2025/QH15 + NĐ 356/2025/NĐ-CP. Loại "NĐ 218/2026" (là nghị định vận tải đường bộ). Tra cứu ngày 06/11/2026, nguồn ở §20 của kế hoạch; chưa đối chiếu văn bản gốc trên Công báo. | 06/11/2026 | Claude (kỹ thuật, theo bằng chứng) |
| D-06 | Stack kỹ thuật | Next.js + Vercel + Supabase như bản A, cộng yêu cầu ngoại tuyến và ký số của bản B. Là mặc định theo stack sẵn có của chủ dự án. | 06/11/2026 | Claude (kỹ thuật) |
| D-07 | Hệ quả của D-03 lên hai bản kế hoạch | Bỏ: đội thuê, chuyên gia duyệt trả phí, thực nghiệm thiết bị tại Đà Lạt, tồn kho, kit thương hiệu riêng, SMS/WhatsApp miễn phí cho Member, Circle có người điều phối. Thay bằng: nhãn trung thực `AI_DRAFT` và "Chưa được Groundstead thử thực tế", hồ sơ chứng nhận + tra thu hồi, kênh cảnh báo miễn phí, Circle chỉ mở khi có Lead ăn chia doanh thu. | 06/11/2026 | Claude (suy ra từ D-03; chủ dự án có thể sửa) |
| D-13 | Trình chạy kiểm thử | Dùng `node:test` cho cả `.ts` (type stripping của Node 22.23), không dùng Vitest: cài `vitest@4.1.12` làm npm lỗi `Cannot read properties of null (reading 'edgesOut')` khi giải peer; không bật `legacy-peer-deps`. Kiểm thử giao diện chạy trên HTML build thật (parse5) và Playwright. | 06/11/2026 | Claude (kỹ thuật) |
| D-14 | Phiên bản dependency | Ghim chính xác; chọn bản phát hành ít nhất 2 tuần: next 16.4.2 (15/10/2026), react và react-dom 19.3.1 (14/10/2026), typescript 5.9.3. `npm audit`: 0 lỗ hổng. | 06/11/2026 | Claude (kỹ thuật) |
| D-15 | Luật quyền của sổ nguồn | Thẻ và bài chỉ được trích nguồn cho phép `summarize`, `offline` và `commercial` (site có affiliate là thương mại); nguồn khác ngôn ngữ phải cho `translate`; nguồn `link-only`/`restricted` chỉ để dẫn liên kết. Dựa trên §8.3 của kế hoạch; **không phải ý kiến pháp lý** — cờ quyền của từng nguồn do vòng lặp điền từ điều khoản công khai và chủ dự án/luật sư nên rà lại trước khi công khai (GS-030). | 06/11/2026 | Claude (kỹ thuật) |
| D-16 | Thư viện nội dung | `ajv` 8.20.0, `ajv-formats` 3.0.1, `yaml` 2.9.1 (ghim chính xác, ≥ 2 tuần tuổi, `npm audit` 0). | 06/11/2026 | Claude (kỹ thuật) |
| D-17 | Căn cứ tái sử dụng cho nguồn | 5 nguồn được phép tái sử dụng: NWS và USGS (đọc nguyên văn trên trang chính thức ngày 06/11/2026), Ủy ban châu Âu (CC BY 4.0, phải ghi nguồn và nêu thay đổi; đọc trên trang pháp lý), FEMA/Ready.gov và CDC (căn cứ 17 U.S.C. § 105 vì hai website chặn truy cập tự động, HTTP 403). WHO (CC BY-NC-SA 3.0 IGO), American Red Cross, ReliefWeb, WMO (chỉ trích đoạn ngắn), Chính phủ VN và Hội Chữ thập đỏ VN: đã đọc, **không** cho phép cách dùng thương mại của Groundstead. IFRC, UNDRR, GDACS, Bộ Y tế, NCHMF: chưa đọc được (GS-H11). Không phải ý kiến pháp lý; chủ dự án hoặc luật sư nên rà lại trước khi công khai. | 06/11/2026 | Claude (kỹ thuật, theo bằng chứng) |
| D-18 | Mở mạng cho các trang nguồn chính thức | Chủ dự án đã duyệt môi trường riêng `groundstead-sources` (không sửa `Default`) với 19 tên miền chính xác; không biến môi trường, không script cài đặt; phiên này đã chuyển sang môi trường đó chỉ về mạng. Hết hạn duyệt kéo dài khoảng 4 giờ nên lịch vòng lặp bị chậm một lần; lần sau nên đề xuất đúng lúc chủ dự án đang theo dõi. | 06/11/2026 | Chủ dự án (duyệt qua thẻ môi trường) |

## Đang mở

| ID | Câu hỏi | Đề xuất | Chặn | Người quyết |
|---|---|---|---|---|
| D-08 | Pháp nhân thu tiền tại Việt Nam | Chưa cần trong 45 ngày; affiliate không cầm tiền hàng. Member thu qua Stripe của IAI LLC. | Thu tiền VN bằng VietQR/VNPay | Chủ dự án |
| D-09 | Tên cuối cùng | Chờ báo cáo tra nhãn hiệu sơ bộ (GS-034). | GS-H06 | Chủ dự án |
| D-10 | Người duyệt nội dung an toàn | Mời người kiểm tra tình nguyện; người duyệt trả phí là khoản chi đầu tiên khi có doanh thu. | Nhãn `EXPERT_REVIEWED` | Chủ dự án |
| D-11 | Định vị SI Bank | Không đặt thương hiệu người dùng dưới `sibank.com`. | Không chặn | Chủ dự án |
| D-12 | Brand OS IAI.ONE (design tokens) | Vòng lặp dùng token trung tính cho đến khi có tệp token. | Không chặn | Chủ dự án |
| D-19 | Thêm `www.nchmf.gov.vn` (đích chuyển hướng của nchmf.gov.vn) và các tên miền chặn bot vào danh sách mạng? | Không cần ngay. Hai việc nhỏ: (a) thêm `www.nchmf.gov.vn` khi cần đọc điều khoản của cơ quan khí tượng VN; (b) với trang chặn bot (HTTP 403) thì nhờ người đọc giúp (GS-H11), không né chặn. | GS-H11 | Chủ dự án |

## Bản ghi duyệt công khai

Mỗi lần chủ dự án duyệt nội dung để công khai, ghi một dòng: ngày, commit SHA được duyệt, phạm vi (landing EN, landing VI…), lời duyệt nguyên văn. Landing chỉ deploy công khai đúng commit đã duyệt (quy tắc 10 của `01_DEV_LOOP_PLAN.md`).

| Ngày | Commit | Phạm vi | Lời duyệt |
|---|---|---|---|
| — | — | — | Chưa có |
