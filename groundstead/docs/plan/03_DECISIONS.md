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
| D-20 | Thẻ mất điện khi nguồn đã đọc không có hướng dẫn | Chưa viết thẻ. Hai thẻ có nguồn đã đọc (lũ lụt, nắng nóng) làm trước; thẻ mất điện là GS-031b, BLOCKED cho đến khi có trang chính thức đọc được có hướng dẫn mất điện. Không lấy nguồn khác để lấp chỗ trống. | 06/11/2026 | Claude (kỹ thuật, theo bằng chứng) |
| D-21 | Số khẩn cấp trong thẻ dùng chung | Thẻ dùng chung ghi "số khẩn cấp ở địa phương bạn", không nêu số cụ thể. Số 911 chỉ nằm trong gói Hoa Kỳ, theo trang NWS đã đọc ("Call 911"); ghi chú của nguồn yêu cầu không nêu 911 như số toàn cầu. | 06/11/2026 | Claude (kỹ thuật, theo nguồn) |
| D-22 | Màn hình khẩn cấp có chọn quốc gia hoặc dùng vị trí không? | Không có bộ chọn địa phương và không dùng vị trí. Màn hình liệt kê mọi tình huống và mọi khối quốc gia; người dùng tự chọn khối phù hợp. Chủ dự án có thể đổi. | 06/11/2026 | Claude (kỹ thuật); chủ dự án có thể sửa |
| D-24 | Câu định vị và phần mô tả hiện có trên landing | Câu định vị nói về việc đang xây dựng, không mô tả dịch vụ đã có. Trang nêu rõ hiện có hai hướng dẫn khẩn cấp và danh bạ của hai quốc gia, và hai hướng dẫn là bản tóm tắt từ NWS Hoa Kỳ. Bỏ 'có kiểm chứng' và 'cộng đồng có mặt đúng lúc' theo kế hoạch §1 và §2 mục 9. | 06/11/2026 | Claude (kỹ thuật, theo kế hoạch); chủ dự án có thể sửa |
| D-25 | Đăng ký sớm và giá gói trả phí | Đăng ký sớm tắt; trang không có biểu mẫu. Trước khi mở, phải có chính sách riêng tư đã được duyệt và công bố. Gói Thành viên trả phí (kế hoạch §11: 39 USD/năm, giá kiểm lại sau 90 ngày) chưa đưa vào landing, vì giá là quyết định kinh doanh và phụ thuộc tài khoản Stripe (GS-H07). Khi mở đăng ký, trang phải nêu gói trả phí và giá. | 06/11/2026 | Claude (kỹ thuật); chủ dự án quyết giá |
| D-27 | Mô hình bước 0: 12 câu, cách chấm điểm và nhãn quan tâm | 10 câu chấm điểm cho 7 trụ cột, mỗi câu có 4 lựa chọn (0 đến 3); điểm trụ cột là trung bình quy về 0–100. Hai câu gia đình và lý do không chấm điểm. Trụ cột được coi là thấp khi dưới 40. Nhãn quan tâm: 'Chưa quan tâm' khi người dùng chọn không lo điều gì cụ thể; 'Đặc biệt quan tâm' khi có từ ba trụ cột trở lên thấp; còn lại 'Quan tâm'. Không hiện điểm tổng. Chạy trên thiết bị; chỉ lưu khi người dùng bấm lưu. Đây là mặc định kỹ thuật theo spec-readiness và kế hoạch §7.1, §11; chủ dự án có thể sửa ngưỡng và cách ánh xạ câu hỏi. | 06/11/2026 | Claude (kỹ thuật, theo spec); chủ dự án có thể sửa |

## Đang mở

| ID | Câu hỏi | Đề xuất | Chặn | Người quyết |
|---|---|---|---|---|
| D-08 | Pháp nhân thu tiền tại Việt Nam | Chưa cần trong 45 ngày; affiliate không cầm tiền hàng. Member thu qua Stripe của IAI LLC. | Thu tiền VN bằng VietQR/VNPay | Chủ dự án |
| D-09 | Tên cuối cùng | Chờ báo cáo tra nhãn hiệu sơ bộ (GS-034). | GS-H06 | Chủ dự án |
| D-10 | Người duyệt nội dung an toàn | Mời người kiểm tra tình nguyện; người duyệt trả phí là khoản chi đầu tiên khi có doanh thu. | Nhãn `EXPERT_REVIEWED` | Chủ dự án |
| D-11 | Định vị SI Bank | Không đặt thương hiệu người dùng dưới `sibank.com`. | Không chặn | Chủ dự án |
| D-12 | Brand OS IAI.ONE (design tokens) | Vòng lặp dùng token trung tính cho đến khi có tệp token. | Không chặn | Chủ dự án |
| D-19 | Thêm `www.nchmf.gov.vn` (đích chuyển hướng của nchmf.gov.vn) và các tên miền chặn bot vào danh sách mạng? | Không cần ngay. Hai việc nhỏ: (a) thêm `www.nchmf.gov.vn` khi cần đọc điều khoản của cơ quan khí tượng VN; (b) với trang chặn bot (HTTP 403) thì nhờ người đọc giúp (GS-H11), không né chặn. | GS-H11 | Chủ dự án |
| D-23 | Mở thêm tên miền để đọc số khẩn cấp? | Đề xuất: thêm bocongan.gov.vn, dmc.gov.vn, nchmf.gov.vn, moh.gov.vn cho Việt Nam; fcc.gov, usa.gov cho Hoa Kỳ (các số ngoài 911). Đây là quyền của chủ dự án qua duyệt môi trường; vòng lặp không tự thêm. | Số khẩn cấp Việt Nam và các số Hoa Kỳ khác chưa xác minh | Chủ dự án |
| D-26 | Phạm vi của hai hướng dẫn lũ lụt và nắng nóng | Metadata ghi phạm vi GLOBAL, nhưng nội dung là bản tóm tắt NWS Hoa Kỳ và có chi tiết chỉ áp dụng ở Hoa Kỳ: đài NOAA Weather Radio, đơn vị inch, nhiệt độ °F. Landing đã nêu nguồn Hoa Kỳ. Chủ dự án chọn: (a) đổi phạm vi thành Hoa Kỳ và ghi rõ trên trang thẻ; hoặc (b) đổi đơn vị, bỏ chi tiết chỉ dành cho Hoa Kỳ, rồi kiểm lại trích dẫn. | Dùng hai hướng dẫn này ngoài Hoa Kỳ | Chủ dự án |

## Bản ghi duyệt công khai

Mỗi lần chủ dự án duyệt nội dung để công khai, ghi một dòng: ngày, commit SHA được duyệt, phạm vi (landing EN, landing VI…), lời duyệt nguyên văn. Landing chỉ deploy công khai đúng commit đã duyệt (quy tắc 10 của `01_DEV_LOOP_PLAN.md`).

| Ngày | Commit | Phạm vi | Lời duyệt |
|---|---|---|---|
| — | — | — | Chưa có |
