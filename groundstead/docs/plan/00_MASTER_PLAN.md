# GROUNDSTEAD · Đất Lành — Kế hoạch hợp nhất v1.0

Ngày 06/11/2026 · Chủ dự án: Trần Hà Tâm · Pháp nhân dự kiến: IAI LLC (Delaware) · Trạng thái: **kế hoạch; chưa có sản phẩm chạy, chưa có người dùng, chưa có doanh thu.**

Tài liệu này thay thế hai bản trước. Kế hoạch build và vòng lặp phát triển nằm ở `01_DEV_LOOP_PLAN.md`; backlog máy đọc được ở `backlog.json`; tiêu chí nghiệm thu ở `02_ACCEPTANCE.csv`; quyết định ở `03_DECISIONS.md`.

---

## 0. Nguồn hợp nhất và quyết định đã chốt

| Mã | Nguồn | Nội dung chính |
|---|---|---|
| **Bản A** | "Kế hoạch khẩn cấp: Nền tảng Sống Bền Vững – Từ Đô Thị Về Nông Thôn Tự Cung Tự Cấp" (06/11/2026) | Thương hiệu GROUNDSTEAD / Đất Lành; lộ trình 8 bước "từ phố về đất lành" và Chế độ 72 giờ đô thị; 7 trụ cột; affiliate → dropship → kit riêng; gói Open/Member/Circle; cảnh báo đa nguồn; 6 ngôn ngữ viết bản ngữ; tái dùng hệ sinh thái IAI.ONE; 3 cổng 20/11, 21/12, 04/02. |
| **Bản B** | "Nền tảng chuẩn bị và ứng phó khẩn cấp" (06/11/2026) | 6 mô-đun phiên bản đầu; màn hình khẩn cấp tối giản; 3 bộ lập kế hoạch 72 giờ; hồ sơ nội dung và vai trò AI; nguyên tắc cảnh báo ("không có dữ liệu" không phải "an toàn"); hồ sơ hàng hóa và 4 sai lầm phải chặn; mở thương mại theo từng thị trường; pháp lý VN/EU/US; 24 tình huống nghiệm thu. Tệp đầy đủ của bản B (38 nguồn, 20 đầu việc) không có trong phiên làm việc này; hợp nhất dựa trên phần tóm lược. |

**Bốn quyết định của chủ dự án ngày 06/11/2026** (ghi ở `03_DECISIONS.md`, mã D-01 đến D-04):

1. **Repo riêng.** Groundstead có repo GitHub riêng (`tranhatam-collab/groundstead`), không nằm trong AFTERVIA. Trong lúc repo chưa được tạo, toàn bộ dự án nằm trong thư mục tự đóng gói `groundstead/` trên nhánh làm việc của AFTERVIA và sẽ được tách nguyên lịch sử sang repo mới.
2. **Phạm vi song song như bản A.** 45 ngày đầu làm cả 8 module lộ trình và Chế độ 72 giờ, song ngữ EN/VI. Các quy tắc an toàn của bản B áp lên toàn bộ.
3. **AI làm 100%, không đầu tư ngoài web app, không kho.** Không thuê đội, không tồn kho, không kho bãi. Thương mại chỉ bằng cách liên kết với kho của các hãng và nhà cung cấp có sẵn trên toàn cầu, rồi tuyển chọn và thiết kế thành các **Gói Groundstead** riêng của dự án.
4. **Preview riêng tư + landing công khai.** Vòng lặp được tạo project Vercel và Supabase cho môi trường dev (chỉ dữ liệu giả), deploy preview có bảo vệ; landing EN/VI được đưa lên `groundstead.iai.one` **sau khi chủ dự án duyệt nội dung** và khi có quyền DNS. Không mua tên miền, không thanh toán, không dùng dữ liệu thật trong vòng lặp.

**Thứ tự ưu tiên khi hai bản lệch nhau:** (1) quyết định của chủ dự án ngày 06/11; (2) an toàn người dùng và tính trung thực (theo bản B); (3) định vị, thương hiệu, tăng trưởng (theo bản A).

---

## 1. Tóm tắt điều hành

**Groundstead / Đất Lành là nền tảng giúp cư dân đô thị chuẩn bị cho khủng hoảng hôm nay và, nếu họ muốn, đi trọn lộ trình về sống tự chủ, bền vững ở nông thôn.** Cửa vào là **Chế độ 72 giờ đô thị**: hướng dẫn khẩn cấp dùng được khi mất mạng, kế hoạch gia đình, tủ vật dụng, cảnh báo đa nguồn và các gói thiết bị tuyển chọn. Lớp sâu là **lộ trình 8 bước "Từ phố về đất lành"**: vốn, chọn đất, nước, điện, vườn, nhà, sức khỏe, cộng đồng.

Giá trị cốt lõi là giúp người dùng trả lời ba câu hỏi:

1. Ở nơi mình đang sống (và mảnh đất mình định về), cần chuẩn bị và theo dõi điều gì?
2. Khi sự cố xảy ra, hành động nào làm trước?
3. Mình đã có gì, còn thiếu gì, và mua phần thiếu ở đâu?

| Hạng mục | Chốt |
|---|---|
| Tên | **GROUNDSTEAD** (tên quốc tế, tiếng Anh gốc) · **Đất Lành** (tên Việt). Tên làm việc cho đến khi tra nhãn hiệu xong. Dự phòng: Wellstead, Landstead. |
| Nhà web giai đoạn 0–90 ngày | `groundstead.iai.one`. Không đặt dưới `sibank.com`. Tên miền riêng (`groundstead.org/.app/.io`) là tùy chọn, ngoài ngân sách 0. |
| Định vị | "Từ phố về đất lành" — lộ trình sống tự chủ có bằng chứng: hướng dẫn, thiết bị có hồ sơ, cộng đồng, cảnh báo. Không phải "prepper tận thế". |
| Người dùng mở đầu | Cư dân đô thị 25–50 tuổi tại TP.HCM, Hà Nội và các đô thị nói tiếng Anh; hộ gia đình ở lại thành phố (Chế độ 72 giờ); tổ chức nhỏ (cơ sở lưu trú, trường, doanh nghiệp nhỏ). |
| Sản phẩm 45 ngày | 9 module EN/VI (8 bước lộ trình + Chế độ 72 giờ), công cụ Đo độ sẵn sàng (bước 0), gói ngoại tuyến, cảnh báo GDACS/USGS, Gói Groundstead affiliate cho VN và US. |
| Thương mại | Không kho, không tồn hàng. Gói Groundstead là danh sách tuyển chọn ghép từ sản phẩm của nhiều hãng và sàn; người dùng mua từng món tại nhà cung cấp qua liên kết có công khai hoa hồng. Dropship chỉ mở khi có pháp nhân nhận tiền và chính sách đổi trả đã duyệt. |
| Ai làm | AI làm toàn bộ kỹ thuật, nội dung nháp, tuyển chọn sản phẩm, vận hành dữ liệu. Chủ dự án chỉ làm các việc pháp lý bắt buộc phải là người (§19). |
| Chi phí | Mức 0 cho đến khi bật thương mại. Khi có liên kết affiliate chạy thật: khoảng 45 USD/tháng hạ tầng (§16). |
| Mốc | 72 giờ: bản mẫu chạy được. **20/11/2026** Cổng 1. **21/12/2026** Cổng 2. **04/02/2027** Cổng 3. |

**Bốn điều không làm (hợp nhất từ hai bản):**

1. Không hứa an toàn tuyệt đối, không nói "nông thôn luôn an toàn hơn", không quảng cáo AI dự đoán động đất.
2. Không khóa thông tin cứu sinh sau tường phí hoặc sau màn hình mua hàng.
3. Không xuất bản nội dung y tế vượt sơ cứu chuẩn, không nội dung vũ khí, không hướng dẫn lách luật.
4. Không gắn nhãn "đã duyệt", "đã kiểm chứng" hoặc "đủ 72 giờ" khi chưa có bằng chứng tương ứng.

---

## 2. Chỗ hai bản lệch nhau và cách xử lý

| # | Chủ đề | Bản A | Bản B | Hợp nhất |
|---|---|---|---|---|
| 1 | Trọng tâm | Lộ trình về đất + 72 giờ | Chuẩn bị và ứng phó khẩn cấp | Làm song song (D-02). 72 giờ là cửa vào; 6 mô-đun của bản B trở thành phần lõi của Chế độ 72 giờ. |
| 2 | Ngân sách 90 ngày | 12–22 nghìn USD | 78–144 nghìn USD | Mức 0 ngoài web app (D-03). Mục nào cần tiền được chuyển thành tùy chọn hoặc hoãn đến khi doanh thu trả được (§16). |
| 3 | Bán hàng | Affiliate → dropship → kit thương hiệu | Bán trực tiếp tại VN, 20–30 mã có hồ sơ | Không kho (D-03): affiliate + Gói Groundstead tuyển chọn. Hồ sơ tối thiểu của bản B áp cho mọi món được đưa vào gói. Kit thương hiệu riêng bị loại khỏi kế hoạch 12 tháng. |
| 4 | Kiểm chứng thiết bị | Thực nghiệm tại Đà Lạt/Nam Ban trước khi bán | Hồ sơ, chứng nhận, mẫu thử | Không có thực nghiệm vật lý trong giai đoạn 0 đồng. Dùng bằng chứng hồ sơ (chứng nhận, tra thu hồi, thông số) và hiển thị trung thực nhãn **"Chưa được Groundstead thử thực tế"**. Đây là thay đổi so với nguyên tắc của bản A. |
| 5 | Duyệt nội dung | Chuyên gia duyệt theo giờ | Chuyên gia duyệt + người thứ hai kiểm bản dịch | Không có chuyên gia trả phí. Nội dung an toàn chỉ được tóm lược trung thành từ nguồn chính thức có quyền sử dụng, ghi nguồn, và mang nhãn **"Chưa có chuyên gia duyệt"** cho đến khi có người duyệt (tình nguyện hoặc trả bằng doanh thu sau này). §8. |
| 6 | Ngôn ngữ | Viết bản ngữ, không dịch; 6 ngôn ngữ trong 90 ngày | Dịch có kiểm soát; VI–EN trước, mở dần đến 8 ngôn ngữ | Hai lớp nội dung (§8): thẻ an toàn dùng dịch có kiểm soát kèm kiểm tra bất biến tự động; nội dung lộ trình và SEO viết bản ngữ từ spec. 6 ngôn ngữ trong 90 ngày là mục tiêu, không phải cam kết. |
| 7 | Mốc 14 ngày | Tên, domain, landing EN/VI | Bản thử Việt–Anh dùng ngoại tuyến | Cổng 1 gồm cả hai: landing EN/VI + Chế độ 72 giờ ngoại tuyến bản thử. |
| 8 | Thí điểm | 100 đơn, 100 Member trong 90 ngày | 200 hộ + 10 cơ sở tại VN | Thí điểm trực tuyến qua landing (có đồng ý). Thí điểm thực địa 200 hộ là tùy chọn của chủ dự án, không nằm trong vòng lặp. |
| 9 | Gói Circle/VIP | Lead riêng, 1:1, điều phối viên người, khóa thực địa | — | Không bán Circle cho đến khi có Lead cộng đồng được trả bằng chia sẻ doanh thu. Không hứa dịch vụ con người khi chưa có người. |
| 10 | SMS, WhatsApp, Zalo | Có cho Member | — | Tắt cho đến khi phí thành viên trả được chi phí từng tin. Kênh miễn phí: thông báo đẩy web, email, trong app. |
| 11 | Số hiệu văn bản pháp luật VN | "PDPL 91/2025 và NĐ 218/2026" | "Luật TMĐT 122/2025 và NĐ 248/2026" | Đã tra ngày 06/11/2026: **NĐ 218/2026/NĐ-CP là nghị định về vận tải đường bộ**, không liên quan. Dùng: Luật BVDLCN 91/2025/QH15 + **NĐ 356/2025/NĐ-CP**; Luật TMĐT 122/2025/QH15 + **NĐ 248/2026/NĐ-CP** (§14). |
| 12 | Stripe tại VN | Stripe toàn cầu + VietQR/VNPay | Stripe chưa hỗ trợ pháp nhân VN | Stripe chỉ qua IAI LLC (Delaware). Thu tiền tại VN cần pháp nhân VN và cổng thanh toán nội địa; quyết định của chủ dự án, chưa cần trong 45 ngày đầu. |
| 13 | Công nghệ | Next.js + Vercel + Supabase + Capacitor | Web app ngoại tuyến trước, app sau; gói nội dung ký số | Giữ stack của bản A; thêm yêu cầu của bản B: kho hướng dẫn tách khỏi cửa hàng, gói nội dung có mã kiểm tra và bản kê ký số. |
| 14 | Bản đồ, trú ẩn, nút trợ giúp | Danh bạ "Ai giúp tôi" | Không ngụ ý trú ẩn đang mở, tuyến đường an toàn, hay cứu hộ đã nhận yêu cầu | Giữ danh bạ của bản A, áp toàn bộ giới hạn hiển thị của bản B. |

---

## 3. Bối cảnh rủi ro: có cơ sở để hành động ngay

Số liệu do hai bản trích dẫn, mốc nghiên cứu 06/11/2026. Lần hợp nhất này chưa kiểm lại từng nguồn, trừ các văn bản pháp luật ở §14. Cần phân biệt số liệu tổng kết, dự báo theo mùa và cảnh báo đang hiệu lực tại một địa phương.

| Nhóm | Bằng chứng (nguồn) | Ý nghĩa với sản phẩm |
|---|---|---|
| Địa-kinh tế và xung đột | WEF Global Risks Report 2026: đối đầu địa-kinh tế #1 (18% chuyên gia), xung đột vũ trang giữa các nước #2 (14%), thời tiết cực đoan #3 (8%); 50% dự báo 2 năm tới "bão tố" (A). UNHCR: khoảng 117,8 triệu người buộc rời nơi ở cuối 2025 (B). | Giá thực phẩm, nhiên liệu, điện ở đô thị chịu tác động trước. Cần nội dung về liên lạc, giấy tờ, di dời. |
| Khí hậu và thiên tai | WMO: 2015–2025 là 11 năm nóng nhất; 2025 cao hơn mức 1850–1900 khoảng 1,43°C; bản tin 26/10/2026 dự báo El Niño mạnh (B). Munich Re nửa đầu 2026: thiệt hại 112 tỷ USD, 44 tỷ được bảo hiểm; Aon 9 tháng 2026: 204 tỷ USD, ít nhất 53.000 người chết (A). | Ưu tiên nắng nóng, bão, ngập, lũ quét, sạt lở, cháy và khói. Kế hoạch chuẩn bị theo mùa. |
| Lương thực | WFP 2026: 318 triệu người ở mức khủng hoảng trở lên; SOFI 2026: 2,1 tỷ người mất an ninh lương thực vừa hoặc nặng (A). | Dự trữ tại nhà và lộ trình tự trồng có lý do thực tế. |
| Y tế | WHO 2026: 36 tình huống khẩn cấp, 14 ở mức Grade 3 (B). | Sơ cứu và kế hoạch tiếp cận y tế là trụ cột, nhưng giới hạn ở sơ cứu chuẩn. |
| Gián đoạn dịch vụ | Báo cáo SDG 2026: hơn 1,5 triệu lần gián đoạn dịch vụ cơ bản mỗi năm trong kỳ 2015–2024 (B). ITU 03/11/2026: khoảng 2 tỷ người chưa dùng Internet (B). | Sản phẩm phải chạy khi mất mạng, mất điện, máy yếu; cần bản in. |

**Cảnh báo trung thực phải đưa vào sản phẩm:**

- Không suy ra mọi nơi đều nguy hiểm như nhau, và không dùng quy mô thiệt hại thảm họa làm quy mô thị trường (B).
- Mất an ninh lương thực nặng hơn ở nông thôn, và y tế nông thôn hạn chế là lý do nhiều người quay lại thành phố (SOFI 2026, Marketplace 7/2026, theo A). Nông thôn chỉ an toàn hơn khi người về có kỹ năng, thiết bị, cộng đồng và kế hoạch y tế. Bước 0–1 của lộ trình phải nói thẳng điều này.

---

## 4. Người dùng, định vị và 7 trụ cột

| Phân khúc | Chân dung | Việc cần làm xong | Module chính | Giai đoạn |
|---|---|---|---|---|
| A. Người đô thị đang do dự | 25–45 tuổi, thuê nhà, việc văn phòng hoặc tự do | Biết mình sẵn sàng đến đâu, cần bao nhiêu tiền, bắt đầu từ bước nào | Bước 0–2 | 45 ngày |
| B. Người đã quyết định về đất | 30–50 tuổi, có tiết kiệm hoặc thu nhập từ xa | Làm nước, điện, vườn, nhà, y tế đúng thứ tự; mua đúng thiết bị | Bước 3–8, Gói Groundstead | 45 ngày |
| C. Người ở lại thành phố | Mọi tuổi, không thể rời đi | Chuẩn bị 72 giờ và 2 tuần; biết làm gì khi ngập, mất điện, nắng nóng, bão | Chế độ 72 giờ | 14 ngày (cửa vào lớn nhất) |
| D. Người yếu thế | Thu nhập thấp, người già, vùng thiên tai | Hướng dẫn miễn phí, ngoại tuyến, dễ hiểu, bản in | Chế độ 72 giờ (miễn phí), bản in | 14 ngày; phân phối qua Angel Edu Tam Foundation khi có đối tác |
| E. Tổ chức nhỏ (từ bản B) | Cơ sở lưu trú, đơn vị du lịch, trường học, doanh nghiệp nhỏ | Kiểm kê, nhắc hạn, phân công, diễn tập, nhiều cơ sở | Bộ lập kế hoạch duy trì cơ sở | Sau Cổng 2 |

**Câu định vị** — EN: *From city to good land: a verified path to self-reliant, sustainable living — guides, gear, and a community that shows up when it matters.* · VI: *Từ phố về đất lành: lộ trình có kiểm chứng để sống tự chủ, bền vững — hướng dẫn, thiết bị và cộng đồng có mặt đúng lúc.*

Chữ "có kiểm chứng" chỉ được dùng trên trang công khai khi mỗi bài và mỗi món hàng hiển thị đúng mức kiểm chứng thật của nó (nguồn, người duyệt hoặc nhãn chưa duyệt).

### 7 trụ cột (khung đo người dùng tự theo dõi trong app)

| Trụ cột | Chỉ số |
|---|---|
| Nước | Số ngày có nước sạch khi mất nguồn cấp (mục tiêu 30 ngày; tối thiểu 3 ngày cho Chế độ 72 giờ) |
| Năng lượng | Số giờ dự phòng khi mất lưới; % nhu cầu điện tự sản xuất |
| Lương thực | Số ngày dự trữ (mục tiêu 14 ngày tại nhà); % calo tự trồng |
| Nhà ở và vệ sinh | Nhà chịu được bão, ngập, nóng đến mức nào; xử lý chất thải |
| Sức khỏe | Đã học sơ cứu; khoảng cách tới cơ sở y tế; kế hoạch thuốc đang dùng |
| Tài chính | Số tháng chi tiêu dự phòng; số nguồn thu |
| Cộng đồng | Số người trong vòng hỗ trợ; đã biết đầu mối cứu hộ địa phương |

Chỉ số chính của dự án (theo bản B): **số hộ và tổ chức đã hoàn thành kế hoạch chuẩn bị và biết dùng nó.** Lượt tải, số bài, thời gian xem là chỉ số phụ.

---

## 5. Thương hiệu, tên và domain

Giữ toàn bộ phân tích tên của bản A (mục 5, 6B). Tóm tắt:

- **GROUNDSTEAD**: "ground" (nền đất vững) + "stead" (chỗ ở, chỗ đứng; homestead, steadfast). Khớp "đất lành chim đậu". Ngày 06/11/2026, `groundstead.org/.app/.io` còn trống theo tra cứu registry của bản A; `.com` đã có chủ.
- Tên Việt: **Đất Lành**. Tagline: EN *Good land. Steady life.* · VI *Đất Lành. Sống Lành.* · ES *Tierra buena, vida firme.* · PT *Terra boa, vida firme.* · ID *Tanah baik, hidup mandiri.* · FR *Bonne terre, vie stable.* (chờ người bản ngữ duyệt).
- Tên module: Nước Lành, Điện Lành, Vườn Lành, Nhà Lành, Thân Lành, Vốn Lành, Làng Lành, Chế độ 72 giờ đô thị.
- **Nhà web**: `groundstead.iai.one` cho giai đoạn 0–90 ngày (0 đồng, cùng pháp nhân và brand OS IAI.ONE). URL dùng thư mục ngôn ngữ (`/en`, `/vi`, …) để sau này chuyển 301 sang domain riêng không vỡ đường dẫn.
- **Không dùng `sibank.com`** cho thương hiệu người dùng cuối: chữ "bank" lệch ngành, tìm kiếm "sibank" trả về các ngân hàng, và nhiều nước hạn chế dùng chữ "bank" cho tổ chức không phải ngân hàng. Nếu SI Bank là thương hiệu tài chính của hệ, chỉ cân nhắc cho lớp tài chính sau này (quỹ dự phòng, Access Pass) — cần chủ dự án xác nhận định vị SI Bank (D-11).
- **Tên vẫn là tên làm việc.** Vòng lặp làm bản tra cứu sơ bộ trên cơ sở dữ liệu công khai (USPTO, EUIPO, WIPO Global Brand Database, Cục SHTT) và ghi kết quả; quyết định dùng tên và nộp đơn là của chủ dự án. Toàn bộ code đọc tên từ một tệp cấu hình, nên đổi tên không tốn công.

---

## 6. Tái dùng hệ sinh thái

**Build mới ở lớp thương hiệu, sản phẩm và repo; tái dùng ở lớp pháp nhân, quy trình và công cụ.** Mỗi tính năng mới phải trả lời "đã có ở dự án nào?" trước khi viết code.

| Nguồn | Groundstead tái dùng | Ghi chú giai đoạn 0 đồng |
|---|---|---|
| IAI LLC + IAI.ONE brand OS | Pháp nhân, hợp đồng affiliate, Stripe (khi bật), design tokens, subdomain `iai.one` | Brand OS chưa có trong phiên này; vòng lặp dùng token trung tính và chờ tệp token (việc của chủ dự án, không chặn). |
| **AFTERVIA (repo này)** | Bộ công cụ vòng lặp (`backlog.mjs`, ma trận nghiệm thu), quét bí mật, mẫu kiểm thử RLS trên Postgres `_test`, gói quốc gia, i18n, kỷ luật bằng chứng | Chép mã, không phụ thuộc runtime. Hai sản phẩm không chia sẻ dữ liệu. |
| Muôn Nơi | Mẫu kiểm soát tuân thủ PDPL và TMĐT; luồng tìm đất, tìm nhà về quê (VN) | P0 chỉ đặt liên kết sang `nhao.muonnoi.org`; tích hợp sâu cần quyền truy cập hệ thống đó. |
| Nhà Chung, Nam Ban | Campus thực địa, nơi thử thiết bị, câu chuyện thật | Ngoài giai đoạn 0 đồng; mở lại khi doanh thu cho phép. |
| Vé Tương Lai | Chứng chỉ module, Access Pass | Sau Cổng 3, khi có API. |
| VCS-EL | Receipt truy xuất nguồn gốc | Không áp dụng khi không có kit riêng. |
| Máy Kiếm Tiền Tự Động (10 AI agent) | Agent cập nhật link, giá, tình trạng hàng affiliate | Trong giai đoạn đầu, việc này do job của chính Groundstead làm (§10); nối agent khi có quyền. |
| Angel Edu Tam Foundation | Phát hành nội dung miễn phí cho người yếu thế | Bản in và gói ngoại tuyến miễn phí sẵn sàng từ Cổng 1. |
| Toolchain sách song ngữ | Groundstead Handbook (PDF) | Xuất PDF từ chính kho nội dung, sau Cổng 2. |

---

## 7. Sản phẩm: 9 module, Chế độ 72 giờ và màn hình khẩn cấp

### 7.1 Lộ trình "Từ phố về đất lành"

| Bước | Module (EN / VI) | Nội dung lõi | Công cụ tính toán (code, có kiểm thử) | Kết quả người dùng có |
|---|---|---|---|---|
| 0 | Readiness Check / Đo độ sẵn sàng | 12 câu: tài chính, sức khỏe, gia đình, kỹ năng, lý do | Chấm điểm 7 trụ cột, gán phân khúc quan tâm (người dùng thấy và sửa được nhãn) | Điểm 7 trụ cột, bước nên làm tiếp |
| 1 | Decide & Fund / Vốn Lành | Quỹ 12 tháng, chi phí thật năm đầu, lý do thất bại (y tế, cô lập, thiếu tiền) | Kế hoạch tài chính 24 tháng | Biết cần bao nhiêu tiền |
| 2 | Choose Land / Chọn vùng và đất | Khí hậu, nước, đất, ngập/lở, khoảng cách y tế, câu hỏi pháp lý đất (VN: Luật Đất đai 2024) | Bảng chấm điểm lô đất | Danh sách câu hỏi và điểm lô đất; liên kết `nhao.muonnoi.org` |
| 3 | Water / Nước Lành | Thu nước mưa, giếng, lọc, trữ, nước thải | Lượng nước cần trữ theo số người và số ngày; dung tích bể theo mái và lượng mưa | Hệ nước theo quy mô hộ |
| 4 | Power / Điện Lành | Tính tải, solar + pin, dự phòng, an toàn điện | Tính tải, cỡ pin và tấm pin theo giờ nắng | Hệ điện đúng công suất |
| 5 | Food / Vườn Lành | Vườn theo vùng khí hậu, chăn nuôi nhỏ, bảo quản, lịch mùa vụ | Kế hoạch calo 12 tháng; ngày dự trữ | Kế hoạch lương thực |
| 6 | Shelter / Nhà Lành | Nhà chịu bão, ngập, nóng; vệ sinh, chất thải | Danh mục kiểm tra theo hiểm họa | Phương án nhà theo ngân sách |
| 7 | Health & Safety / Thân Lành | Sơ cứu chuẩn (chỉ từ nguồn được công nhận), kế hoạch y tế, phòng thiên tai | Kế hoạch y tế gia đình (không liều thuốc) | Kế hoạch y tế gia đình |
| 8 | Community / Làng Lành | Hàng xóm, trao đổi kỹ năng, đầu mối cứu hộ địa phương | Vòng hỗ trợ | Vòng hỗ trợ 10 hộ |
| ★ | 72-Hour City Mode / Chế độ 72 giờ đô thị | Xem 7.2 | Ba bộ lập kế hoạch | Túi 72 giờ + kế hoạch gia đình |

Mỗi module có cùng khung: hướng dẫn → checklist tích được → công cụ tính → Gói Groundstead liên quan → bài thực hành.

### 7.2 Chế độ 72 giờ đô thị = 6 chức năng của bản B

| Chức năng | Người dùng làm được gì | Yêu cầu bắt buộc |
|---|---|---|
| Hướng dẫn khẩn cấp | Chọn tình huống, đọc ngay các bước | Không cần đăng nhập; không có quảng cáo hay màn hình mua hàng chen vào |
| Kế hoạch gia đình | Lập kế hoạch theo địa bàn, số người, nhu cầu đặc biệt | Phân biệt người lớn, trẻ nhỏ, người cao tuổi, người khuyết tật, vật nuôi; lưu trên máy, không bắt buộc tài khoản |
| Gói ngoại tuyến | Tải trước nội dung, hình, danh bạ | Kiểm tra tải đủ; hiện phiên bản và ngày cập nhật; nút kiểm tra gói; bản in |
| Thông tin và cảnh báo địa phương | Xem nguồn chính thức, phạm vi, thời gian hiệu lực | Phân biệt quan trắc, dự báo, cảnh báo và lệnh hành động (§9) |
| Tủ vật dụng | Ghi số lượng, nơi cất, hạn dùng, ngày kiểm tra | Dùng được không cần tài khoản; đánh dấu đồ đã có; xuất danh sách để mua ở bất kỳ đâu |
| Gói thiết bị | Mua phần còn thiếu theo Gói Groundstead | Hiện nhà cung cấp, giá tại thời điểm cập nhật, nơi giao, công khai hoa hồng (§10) |

**Ba bộ lập kế hoạch** (theo bản B; dựa trên tài liệu ngày 30/10/2026 của Ủy ban châu Âu về tự bảo đảm ít nhất 72 giờ — hướng dẫn không ràng buộc — và cách American Red Cross phân biệt túi 3 ngày với dự trữ tại nhà 2 tuần):

1. **Túi mang đi** — theo sức mang, phương tiện, hoàn cảnh sơ tán.
2. **Dự trữ tại nhà** — nước, thực phẩm, điện, vệ sinh, nhu cầu đặc thù, 2 tuần.
3. **Duy trì hoạt động cơ sở** (phân khúc E, sau Cổng 2) — số người, ca trực, phân công, vật dụng, liên lạc.

### 7.3 Màn hình khẩn cấp

Người đang căng thẳng phải thấy ngay: tình huống đang gặp; hành động đầu tiên; điều cần tránh; nút trợ giúp đúng địa phương; trạng thái mạng và thời điểm cập nhật. Chi tiết mở sau khi người dùng cần.

- Mục tiêu thiết kế: tìm đúng hướng dẫn trong **không quá ba thao tác** ở các tình huống thử.
- Nút trợ giúp ghi rõ việc nó làm: "Mở trình gọi số 114 trên điện thoại của bạn. Groundstead không gửi yêu cầu cứu hộ." Nút mở trình gọi không đồng nghĩa cứu hộ đã nhận yêu cầu.
- Bản đồ chỉ hiện địa chỉ trú ẩn kèm nguồn và ngày; không ngụ ý nơi đó đang mở hoặc còn chỗ. Không khẳng định tuyến đường nào an toàn.

### 7.4 Nội dung khởi động

20 thẻ EN/VI trước Cổng 1, mở rộng lên 40 thẻ trước Cổng 2: kế hoạch liên lạc và điểm hẹn; túi mang đi và dự trữ tại nhà; mất điện, chiếu sáng và khí CO; bão, ngập, lũ quét, sạt lở; nắng nóng, lạnh, khói; nước, vệ sinh, thực phẩm; tìm chăm sóc y tế; động đất, sóng thần theo địa bàn. Hóa chất, phóng xạ, xung đột: không phát hành cho đến khi có nguồn và người duyệt phù hợp.

---

## 8. Nội dung, quyền sử dụng và vai trò của AI

### 8.1 Hai lớp nội dung

| Lớp | Gồm | Cách làm | Ngôn ngữ |
|---|---|---|---|
| **S — Thẻ an toàn** | Thẻ 72 giờ, sơ cứu, hành động khi có cảnh báo | Tóm lược trung thành từ nguồn chính thức có quyền sử dụng; một bản gốc EN có phiên bản; bản ngôn ngữ khác dịch có kiểm soát và qua bộ kiểm tra bất biến tự động (số, đơn vị, phủ định, địa danh, số điện thoại phải khớp) | Bản gốc EN; VI ngay; ngôn ngữ khác chỉ hiện khi qua kiểm tra bất biến |
| **J — Lộ trình và SEO** | 8 module lộ trình, bài blog, hướng dẫn mua | AI viết bản ngữ mới từ content spec tiếng Anh, với luật, đơn vị, tiền tệ, mùa vụ, cơ quan, ví dụ của đúng nước đó; không dịch câu | Mỗi ngôn ngữ là một ấn bản riêng |

### 8.2 Hồ sơ của mỗi thẻ (receipt)

Mỗi thẻ hoặc bài lưu: nguồn (URL, tổ chức, ngày truy cập), quyền sử dụng của nguồn, địa bàn áp dụng, đối tượng, giới hạn, phiên bản, ngày cập nhật, **trạng thái duyệt**, người duyệt (nếu có), ngôn ngữ, vùng khí hậu. Build thất bại nếu thiếu trường bắt buộc.

**Trạng thái duyệt hiển thị cho người đọc:**

| Trạng thái | Nhãn công khai | Điều kiện |
|---|---|---|
| `AI_DRAFT` | "Bản nháp do AI soạn từ [nguồn]. Chưa có chuyên gia duyệt." | Mặc định khi không có người duyệt (giai đoạn 0 đồng) |
| `COMMUNITY_CHECKED` | "Đã được [tên] kiểm tra ngôn ngữ/nội dung." | Có người kiểm tra tình nguyện, được ghi tên |
| `EXPERT_REVIEWED` | "Duyệt bởi [tên, chuyên môn], ngày …" | Có chuyên gia có hồ sơ |
| `STALE` | "Nguồn gốc đã thay đổi; bản này đang chờ kiểm tra lại." | Bản gốc đổi nội dung liên quan an toàn sau lần duyệt |

Khi bản gốc thay đổi, các bản dịch liên quan tự chuyển `STALE`. Không giữ nhãn đã duyệt cho bản không còn khớp nguồn.

### 8.3 Quyền sử dụng nguồn

Nguồn chính thức không đồng nghĩa được sao chép, dịch và đóng gói lại trong sản phẩm thương mại (B). Sổ quyền ghi cho từng nguồn: được trích, dịch, sửa, lưu ngoại tuyến, dùng thương mại đến đâu.

- Ưu tiên nguồn có quyền sử dụng rộng (ví dụ tài liệu của cơ quan liên bang Mỹ thường thuộc phạm vi công cộng; phải kiểm từng trang vì có trang chứa tài liệu của bên thứ ba).
- WHO, ICRC, IFRC, Hội Chữ thập đỏ quốc gia: có điều kiện về nội dung, logo và ngụ ý bảo chứng; biểu tượng chữ thập đỏ/trăng lưỡi liềm đỏ được bảo hộ. Mặc định chỉ dẫn liên kết, không chép.
- Văn bản của cơ quan nhà nước Việt Nam: kiểm điều kiện sử dụng trước khi tóm lược.

### 8.4 Vai trò của AI

| AI làm | AI không làm |
|---|---|
| Soạn nháp thẻ và bài từ nguồn; viết ấn bản bản ngữ từ spec; tìm thẻ đúng; giải thích thuật ngữ; lập danh sách còn thiếu; kiểm bài với spec; kiểm bất biến bản dịch; tuyển chọn sản phẩm và soạn hồ sơ hàng từ dữ liệu nhà cung cấp | Quyết định liều thuốc; hướng dẫn xử lý hóa chất; ra lệnh sơ tán; khẳng định tuyến đường an toàn; dự đoán động đất (USGS: dự đoán cụ thể thời gian, vị trí, độ lớn chưa khả thi); tự gắn nhãn "đã duyệt" |

Luồng khẩn cấp hiển thị trực tiếp nội dung trong kho, không sinh câu trả lời mới tại thời điểm khẩn cấp. Trợ lý hỏi đáp (sau Cổng 2) chỉ trả lời từ kho nội dung và luôn trích thẻ nguồn.

### 8.5 Chuẩn bài viết

Trình độ đọc tương đương lớp 8; câu ngắn; checklist tích được; chân bài bắt buộc: *Soạn bởi · Trạng thái duyệt · Nguồn · Cập nhật ngày*. Nội dung đất đai và xây dựng có hộp "Hỏi luật sư hoặc cơ quan địa phương".

---

## 9. Cảnh báo đa nguồn

### 9.1 Nguồn

| Nhóm | Nguồn | Phạm vi | Chi phí | Đợt |
|---|---|---|---|---|
| Tổng hợp toàn cầu | GDACS (EC JRC + UN OCHA) | Toàn cầu | Miễn phí | Cổng 1 |
| Động đất | USGS Earthquake feeds (GeoJSON) | Toàn cầu | Miễn phí | Cổng 1 |
| Thời tiết quốc gia | NWS API (US), Meteoalarm (EU, CAP), BMKG (ID), JMA (JP) | Theo nước | Miễn phí | Cổng 2–3 |
| Tình hình nhân đạo | ReliefWeb API, IFRC GO | Toàn cầu | Miễn phí | Cổng 2 |
| Cháy, sự kiện tự nhiên | NASA EONET, NASA FIRMS | Toàn cầu | Miễn phí (FIRMS cần khóa miễn phí) | Cổng 3 |
| Không khí | OpenAQ | Toàn cầu | Miễn phí (có thể cần khóa) | Cổng 3 |
| Thời tiết nền | OpenWeatherMap | Toàn cầu | Miễn phí có hạn mức | Khi có khóa |
| Việt Nam | NCHMF, Cục Quản lý đê điều và PCTT | VN | Chưa có API công khai chuẩn → cần thỏa thuận; tạm dùng GDACS và nguồn khu vực | Khi có thỏa thuận |
| Siêu địa phương trả phí | Tomorrow.io, AccuWeather, Ambee, PredictHQ | Toàn cầu | Trả phí | Chỉ khi doanh thu trả được |

Điều khoản của từng nguồn phải được kiểm khi tích hợp và ghi vào sổ quyền.

### 9.2 Quy tắc toàn vẹn cảnh báo (bắt buộc, có kiểm thử)

1. Chỉ hiển thị cảnh báo có nguồn chính thức; luôn ghi tên cơ quan, giờ phát, giờ nhận và thời gian hiệu lực.
2. Chuẩn hóa về CAP; giữ nguyên `status`, `msgType`, `scope`. Cảnh báo `Test`, `Exercise`, `Draft`, cảnh báo `Private`/`Restricted` và bản `Cancel` **không** được phát như cảnh báo công chúng.
3. Phân biệt quan trắc, dự báo, cảnh báo và lệnh hành động; không nâng mức.
4. **"Không nhận được dữ liệu" không bao giờ thành "không có nguy hiểm".** Khi nguồn lỗi hoặc dữ liệu cũ, app hiện "Không cập nhật được từ [nguồn] từ [giờ]" và hướng dẫn tự kiểm nguồn chính thức.
5. Khi chưa có bản dịch đã kiểm, hiển thị bản gốc và nguồn ngay; chỉ thêm mẫu hành động đa ngôn ngữ đã có trong kho.
6. GDACS không thay thế cảnh báo hoặc lệnh sơ tán của cơ quan địa phương; câu này hiện cạnh mọi cảnh báo GDACS.
7. Gộp trùng giữa nguồn; một sự kiện chỉ đẩy một lần.
8. Khớp vị trí theo bán kính người dùng chọn (5–100 km) cho hai địa điểm: thành phố hiện tại và mảnh đất tương lai. Người dùng chọn địa bàn thủ công; IP hoặc GPS chỉ gợi ý.
9. Cảnh báo tự mở thẻ 72 giờ tương ứng (ngập → thẻ ngập ngoại tuyến).
10. Nhật ký độ trễ (nguồn → hiển thị) được tính từ dấu thời gian thật; không công bố số chưa đo.

### 9.3 Kênh

| Kênh | Open | Member | Ghi chú |
|---|---|---|---|
| Trong app, thông báo đẩy web | Cảnh báo cam/đỏ | Mọi mức | Miễn phí, Cổng 1–2 |
| Email | Tóm tắt tuần | Theo sự kiện | Gói miễn phí của nhà cung cấp email |
| SMS, WhatsApp, Zalo OA, Telegram | — | Khi doanh thu trả được phí từng tin | Tắt mặc định |
| Vòng an toàn gia đình | Có | Có | Sau Cổng 2 |

### 9.4 Danh bạ "Ai giúp tôi"

Mỗi quốc gia một trang ngoại tuyến, mỗi mục có nguồn và ngày kiểm: số khẩn cấp (VN 112/113/114/115; EU 112; US 911), cơ quan phòng chống thiên tai, Hội Chữ thập đỏ quốc gia, cơ quan khí tượng, tổ chức quốc tế hiện diện, đường dây NGO. Ra mắt VN và US (Cổng 1), thêm ID, PH, ES, BR (Cổng 3). Kiểm lại mỗi quý; mục quá hạn kiểm tự hiện cảnh báo "chưa kiểm lại từ …".

---

## 10. Thương mại không kho: mạng nhà cung cấp toàn cầu và Gói Groundstead

**Mô hình (D-03):** Groundstead không mua hàng, không giữ hàng, không giao hàng. Groundstead kết nối dữ liệu sản phẩm của các hãng, sàn và nhà cung cấp có sẵn trên toàn cầu, tuyển chọn theo module và hiểm họa, rồi ghép thành **Gói Groundstead**. Người dùng mua từng món tại nhà cung cấp; Groundstead nhận hoa hồng affiliate.

### 10.1 Ba lớp nhà cung cấp

| Lớp | Ví dụ (xác minh điều khoản khi tích hợp) | Cách kết nối | Khi nào |
|---|---|---|---|
| 1. Sàn theo quốc gia | Amazon (US, UK, DE, ES, FR, JP), Shopee, Lazada, Tiki (VN, ID, PH, TH), Mercado Libre (BR, MX), AliExpress | Chương trình affiliate chính thức hoặc mạng affiliate; API sản phẩm nếu chương trình cho phép | Từ T+30 khi có tài khoản |
| 2. Hãng sản xuất có affiliate trực tiếp | Trạm điện di động, bộ lọc nước, radio, thiết bị nhắn tin vệ tinh | Mạng affiliate (Impact, Awin, CJ, Rakuten hoặc tương đương) | Từ Cổng 2 |
| 3. Dropship qua API nhà cung cấp | Nhà cung cấp dropship có API đặt hàng | Groundstead thành bên bán → nghĩa vụ người bán (§14) | **Chỉ khi** có pháp nhân nhận tiền, chính sách đổi trả và thu hồi được duyệt. Không nằm trong 90 ngày. |

Việc đăng ký tài khoản affiliate phải do chủ dự án làm một lần đứng tên IAI LLC (danh tính, thuế, chấp nhận điều khoản). Khóa API được cấp cho môi trường qua cơ chế bí mật, không dán vào chat, không ghi vào repo.

### 10.2 Gói Groundstead

Một Gói là **danh sách các ô vật dụng** (ví dụ "Đèn đội đầu, pin thông dụng, ≥ 8 giờ ở mức sáng thấp"), không phải một sản phẩm đóng hộp. Với mỗi quốc gia, mỗi ô được điền 1–3 sản phẩm ứng viên từ nhiều nhà cung cấp, xếp hạng theo độ đầy đủ hồ sơ, tình trạng thu hồi, giá và khả năng giao.

| Gói (đợt 1) | Module | Quốc gia đầu |
|---|---|---|
| Túi 72 giờ cá nhân | 72 giờ | VN, US |
| Dự trữ tại nhà 2 tuần (hộ 4 người) | 72 giờ | VN, US |
| Mất điện | 72 giờ, Điện Lành | VN, US |
| Ngập và bão | 72 giờ | VN, US |
| Nắng nóng và khói | 72 giờ | VN, US |
| Sơ cứu gia đình | Thân Lành | VN, US |
| Nước Lành khởi đầu | Nước Lành | VN, US |
| Điện Lành khởi đầu (trạm điện + tấm pin gập) | Điện Lành | VN, US |
| Liên lạc khi mất mạng | 72 giờ, Làng Lành | US trước (thiết bị vệ tinh cần giấy phép, thuê bao theo nước) |
| Vườn Lành theo vùng khí hậu | Vườn Lành | Chỉ nhà cung cấp trong nước (hạt giống qua biên giới chịu kiểm dịch) |

**Trang Gói bắt buộc hiện:** có gì, **thiếu gì**, phù hợp với ai, không phù hợp với ai; tổng giá ước tính kèm thời điểm lấy giá; nơi mua từng món; công khai hoa hồng; người dùng tích "đã có" để bỏ món trùng và xuất danh sách để mua ở nơi khác. Một Gói chỉ được gọi là "đủ cho 72 giờ" khi phủ 100% ô bắt buộc của checklist tương ứng; nếu không, ghi rõ phần chưa phủ.

### 10.3 Hồ sơ tối thiểu của mỗi sản phẩm được đưa vào Gói

Nhà sản xuất và nhà cung cấp; model chính xác; mã sản phẩm tại nhà cung cấp; quốc gia bán; tài liệu chứng nhận phù hợp và cách kiểm tra; giới hạn sử dụng; kết quả tra thu hồi (US CPSC, EU Safety Gate) và ngày tra; nguồn dữ liệu và ngày cập nhật; nhãn "Chưa được Groundstead thử thực tế". Sản phẩm thiếu hồ sơ hoặc trùng thu hồi bị chặn khỏi Gói. Khi nhà cung cấp đổi model, sản phẩm bị gỡ cho đến khi có hồ sơ mới.

### 10.4 Bốn sai lầm bị chặn từ trang sản phẩm (bộ lọc tuyên bố, có kiểm thử)

1. Bộ lọc nước không mặc nhiên xử lý mọi chất ô nhiễm; phải nêu đúng phạm vi chứng nhận của từng thiết bị.
2. Khẩu trang lọc hạt (N95 hoặc tương đương) không bảo vệ khỏi khí độc và không cung cấp oxy.
3. Máy phát chạy nhiên liệu có nguy cơ CO; chỉ dùng ngoài trời, cách xa nhà theo hướng dẫn của nguồn; trang bán phải nói điều này, không chỉ ghi công suất.
4. Đun sôi hoặc khử khuẩn không xử lý được nước nhiễm nhiên liệu, hóa chất độc hoặc chất phóng xạ.

### 10.5 Mở theo từng thị trường

Một sản phẩm chỉ hiện nút mua tại một nước khi đã xác nhận: **quốc gia nhận × nhà cung cấp × mã hàng × khả năng giao × điều kiện đổi trả của nhà cung cấp**. Pin và thiết bị điện chỉ lấy từ nhà cung cấp trong nước hoặc có kho tại nước đó (quy định vận chuyển pin phụ thuộc loại pin và cách đóng gói). Trong thời gian thảm họa, Gói hiện giá và tình trạng theo lần cập nhật cuối kèm giờ; không hứa giao khẩn cấp.

---

## 11. Cộng đồng và gói thành viên

| Tầng | Giá đề xuất / năm | Quyền lợi | Khi nào bán |
|---|---|---|---|
| **Open / Mở** | 0 | Toàn bộ Chế độ 72 giờ, 9 module cơ bản, gói ngoại tuyến, cảnh báo cam/đỏ, danh bạ "Ai giúp tôi", Gói Groundstead | Từ Cổng 1. Mọi thông tin cứu sinh luôn ở tầng này. |
| **Member / Thành viên** | 39 USD · 690.000 đ | Đồng bộ nhiều thiết bị và nhiều địa điểm, nội dung nâng cao ngoại tuyến, cảnh báo mọi mức, tóm tắt email theo sự kiện, vòng an toàn gia đình mở rộng, ưu đãi do nhà cung cấp cấp (nếu có) | Khi có tài khoản Stripe của IAI LLC (§19). Giá kiểm lại sau 90 ngày. |
| **Organization / Tổ chức** (từ bản B) | Theo số cơ sở | Kiểm kê nhiều cơ sở, nhắc hạn, phân công, diễn tập | Sau Cổng 2 |
| **Circle / VIP** | 390 USD · 6.900.000 đ (bản A) | Cohort ≤ 30 có Lead, lộ trình 1:1, điều phối viên người | **Không bán** cho đến khi có Lead cộng đồng nhận chia sẻ 20–30% phí cohort. |
| Gia đình (cộng thêm) | +15 USD · +250.000 đ | Tối đa 6 tài khoản | Cùng Member |

**Nhóm cộng đồng:** nhóm công khai theo thành phố và ngôn ngữ mở sau Cổng 2, có quy tắc, AI gắn cờ tin sai và quy trình gỡ bài 24 giờ. Phòng điều phối khẩn cấp tự mở (bản A) chưa làm trong 90 ngày vì cần người điều phối.

**Phân loại mức quan tâm** (Chưa quan tâm / Quan tâm / Đặc biệt quan tâm) tính từ bước 0 và hành vi trong app; người dùng thấy và sửa được nhãn của mình; không dùng dữ liệu sức khỏe cho tiếp thị.

---

## 12. Đa ngôn ngữ và SEO bản ngữ

| Đợt | Ngôn ngữ | Thời điểm | Điều kiện |
|---|---|---|---|
| 1 | English (gốc), Tiếng Việt | Cổng 1 (thẻ 72 giờ) → Cổng 2 (9 module) | Thẻ S qua kiểm tra bất biến; nội dung J viết bản ngữ |
| 2 | Español, Português (BR), Bahasa Indonesia, Français | Từ 22/12/2026 → Cổng 3 | Như trên; gói quốc gia ES, BR, ID tương ứng |
| 3 | العربية (có giao diện phải–trái), हिन्दी, 日本語, ไทย, Filipino, 中文 | Từ tháng 4 | Mở theo dữ liệu truy cập; Ả Rập cần kiểm thử RTL |

Ngôn ngữ giao diện, ngôn ngữ hướng dẫn, phạm vi cảnh báo và phạm vi bán hàng là bốn khả năng khác nhau và được bật riêng cho từng nước (B).

**SEO bản ngữ:** một root, thư mục theo ngôn ngữ (`/en`, `/vi`, `/es`, `/pt-br`, `/id`, `/fr`), hreflang đầy đủ, `x-default` = `/en`, sitemap riêng từng ngôn ngữ; dữ liệu có cấu trúc schema.org (HowTo, FAQPage, Product, Organization) theo ngôn ngữ; từ khóa nghiên cứu theo từng nước (ví dụ VI "bỏ phố về quê tự cung tự cấp", ES "vivir en el campo autosuficiente"), không dịch từ khóa Anh; đo riêng theo thư mục trên Search Console (cần chủ dự án xác minh quyền sở hữu site một lần).

**Khả năng tiếp cận:** mục tiêu kiểm thử WCAG 2.2 AA — chữ lớn, trình đọc màn hình, thao tác bàn phím, không chỉ dùng màu để truyền đạt, hỗ trợ phải–trái. Cần kiểm thử thật; không tự tuyên bố đạt chuẩn.

---

## 13. Kiến trúc kỹ thuật (tóm tắt)

Chi tiết ở `01_DEV_LOOP_PLAN.md` §3.

| Lớp | Lựa chọn |
|---|---|
| Web | Next.js (App Router), sinh trang tĩnh cho nội dung, thư mục theo ngôn ngữ; Vercel |
| Ứng dụng ngoại tuyến | PWA: service worker, IndexedDB, gói nội dung theo ngôn ngữ và quốc gia, có bản kê SHA-256 được ký số (Ed25519); Capacitor cho iOS/Android từ tháng 4 |
| Nội dung | Markdown + frontmatter trong repo (git là nhật ký duyệt), kiểm bằng JSON Schema khi build |
| Dữ liệu người dùng | Mặc định lưu trên máy; đồng bộ tùy chọn qua Supabase (Postgres + RLS + Auth) |
| Cảnh báo | Bộ chuyển đổi từng nguồn → mô hình CAP chung; chạy định kỳ (Supabase Edge Functions hoặc Vercel Cron); thông báo đẩy web (VAPID) |
| Thương mại | Lớp kết nối nhà cung cấp, danh mục, hồ sơ sản phẩm, bộ dựng Gói, chuyển hướng affiliate không ghi dữ liệu cá nhân |

**Nguyên tắc bắt buộc:** kho hướng dẫn khẩn cấp phân phối tách khỏi cửa hàng (lỗi thương mại không làm mất quyền đọc hướng dẫn); ngoại tuyến trước; máy yếu và pin thấp; dữ liệu tối thiểu (không theo dõi vị trí liên tục); không khóa cứu sinh sau tường phí.

**Ba giới hạn phải nói thật trong sản phẩm:** gói ngoại tuyến phải tải trước và trình duyệt có thể xóa dữ liệu khi thiếu dung lượng (có nút kiểm tra gói và bản in); bản đồ không chứng minh trú ẩn đang mở hay đường đi an toàn; nút gọi không có nghĩa cứu hộ đã nhận yêu cầu.

---

## 14. Pháp lý và tuân thủ

Danh mục kiểm tra, không phải tư vấn pháp lý. Mọi văn bản công khai (điều khoản, chính sách riêng tư, miễn trừ) ở trạng thái **DRAFT** cho đến khi chủ dự án duyệt; nên có luật sư xác nhận trước khi thu tiền ở từng thị trường.

### 14.1 Việt Nam (đã tra số hiệu ngày 06/11/2026)

| Lĩnh vực | Văn bản | Hiệu lực | Việc của Groundstead |
|---|---|---|---|
| Thương mại điện tử | Luật TMĐT 122/2025/QH15; **Nghị định 248/2026/NĐ-CP** (ban hành 30/06/2026) | 01/07/2026 | Xác định mô hình của Groundstead theo luật (website cung cấp thông tin và liên kết affiliate, không có chức năng đặt hàng, khác với bán trực tiếp có đặt hàng hoặc nền tảng trung gian); làm thủ tục tương ứng với Bộ Công Thương nếu thuộc diện. Theo bài phổ biến, nền tảng nước ngoài có giao diện tiếng Việt, tên miền .vn hoặc từ 100.000 giao dịch/năm với người mua VN phải đăng ký — **chưa đối chiếu văn bản gốc**. |
| Dữ liệu cá nhân | Luật BVDLCN 91/2025/QH15; **Nghị định 356/2025/NĐ-CP** (thay NĐ 13/2023) | 01/01/2026 | Đồng ý rõ cho vị trí, dữ liệu sức khỏe, dữ liệu trẻ em trong kế hoạch gia đình; mặc định lưu trên máy; xóa và xuất dữ liệu một chạm; đánh giá tác động khi đồng bộ dữ liệu nhạy cảm lên máy chủ; chuyển dữ liệu ra nước ngoài (Supabase, Vercel đặt máy chủ ngoài VN). |
| Mốc 01/01/2027 (theo bản B) | Xác thực điện tử người bán và người livestream trên các nền tảng thuộc phạm vi | 01/01/2027 | Kiểm Groundstead có thuộc phạm vi không (nhiều khả năng không, vì không phải sàn). |
| Đất đai | Luật Đất đai 2024 | — | Nội dung bước 2 chỉ ở mức "câu hỏi cần hỏi", luôn kèm hộp "hỏi luật sư địa phương". |

Bản A trích "NĐ 218/2026" cho dữ liệu cá nhân và TMĐT: số hiệu này là nghị định sửa đổi NĐ 158/2024 về vận tải đường bộ, đã loại khỏi kế hoạch.

### 14.2 Quốc tế

| Lĩnh vực | Văn bản, yêu cầu | Việc làm |
|---|---|---|
| Dữ liệu cá nhân | GDPR (EU/UK), CCPA/CPRA (California), LGPD (Brazil), Luật PDP (Indonesia) | Chính sách riêng tư theo ngôn ngữ; thỏa thuận xử lý dữ liệu với Supabase, Vercel và nhà cung cấp email |
| Affiliate | Công khai hoa hồng (FTC Mỹ, CMA Anh) | Dòng công khai trên mọi trang có liên kết affiliate (có kiểm thử) |
| An toàn sản phẩm | EU GPSR áp dụng từ 13/12/2024; Mỹ: CPSC — bán sản phẩm đã thu hồi là trái luật | Tra thu hồi trước khi đưa vào Gói; khi chuyển sang dropship (lớp 3), Groundstead gánh nghĩa vụ người bán → cần đánh giá riêng |
| Thanh toán | Stripe: danh sách quốc gia được hỗ trợ chưa có Việt Nam | Stripe qua IAI LLC (Mỹ); thu tiền tại VN cần quyết định pháp nhân VN |
| Nội dung | Quyền của WHO, ICRC; biểu tượng chữ thập đỏ/trăng lưỡi liềm đỏ | Sổ quyền §8.3 |
| Cảnh báo | Điều khoản từng API; không dùng logo cơ quan như đối tác khi chưa có thỏa thuận | Ghi "nguồn — giờ phát" trên mọi cảnh báo |
| Nhãn hiệu | USPTO, EUIPO, Madrid, Cục SHTT (nhóm 9, 35, 41, 42) | Vòng lặp tra sơ bộ; nộp đơn là quyết định có chi phí của chủ dự án |

---

## 15. Lộ trình

Ngày bắt đầu: 06/11/2026. T+14 = **20/11/2026**, T+30 = 06/12/2026, T+45 = **21/12/2026**, T+60 = 05/01/2027, T+90 = **04/02/2027**. Không qua cổng thì không mở việc của giai đoạn sau. Các mốc dưới đây là mốc kỹ thuật vòng lặp tự đạt được; mốc phụ thuộc chủ dự án được ghi rõ.

### 15.1 72 giờ đầu (06/11 → 09/11)

| Giờ | Việc | Đầu ra |
|---|---|---|
| 0–6 | Hợp nhất kế hoạch, backlog, công cụ vòng lặp | Tài liệu này, `backlog.json`, `02_ACCEPTANCE.csv` |
| 6–24 | Khung repo, kiểm tra (`verify`), Next.js EN/VI, lược đồ nội dung và hồ sơ thẻ | Trang chạy được trên máy, build chặn nội dung thiếu hồ sơ |
| 24–48 | Màn hình khẩn cấp, 3 thẻ đầu (ngập, mất điện, nắng nóng) EN/VI, gói quốc gia VN/US | Bản mẫu bấm được trên điện thoại |
| 48–72 | Service worker và gói ngoại tuyến có kiểm toàn vẹn; preview riêng tư trên Vercel (khi có repo riêng) | Bản mẫu mở được ở chế độ máy bay |

### 15.2 Ba cổng

| Cổng | Ngày | Điều kiện qua (kiểm bằng `02_ACCEPTANCE.csv`) | Phụ thuộc chủ dự án |
|---|---|---|---|
| **Cổng 1** | 20/11/2026 | Landing EN/VI + công cụ bước 0; Chế độ 72 giờ ngoại tuyến với 20 thẻ EN/VI có hồ sơ; cảnh báo GDACS + USGS trong app; danh bạ VN/US; preview riêng tư chạy | Tạo repo; duyệt nội dung landing để công khai; quyền DNS `groundstead.iai.one` |
| Mốc T+30 | 06/12/2026 | Kế hoạch gia đình, tủ vật dụng, 3 bộ lập kế hoạch; Gói Groundstead VN/US (dữ liệu mẫu nếu chưa có tài khoản affiliate); thông báo đẩy web | Tài khoản affiliate để Gói chạy với liên kết thật |
| **Cổng 2** | 21/12/2026 | 9 module EN/VI + công cụ tính; 40 thẻ 72 giờ; thêm NWS, Meteoalarm, ReliefWeb; tài khoản và đồng bộ tùy chọn; dữ liệu có cấu trúc SEO; Member sẵn sàng về kỹ thuật | Tài khoản Stripe (IAI LLC) nếu muốn thu phí Member |
| Mốc T+60 | 05/01/2027 | Đợt 2 ngôn ngữ đang chạy; chế độ Tổ chức; nhật ký độ trễ cảnh báo | — |
| **Cổng 3** | 04/02/2027 | 6 ngôn ngữ (theo điều kiện §12); PWA hoàn chỉnh (gói < 50 MB/ngôn ngữ); vòng an toàn gia đình; danh bạ thêm ID, PH, ES, BR | Search Console; (tùy chọn) người kiểm tra tình nguyện |

### 15.3 Tháng 4–12

| Tháng | Mục tiêu | Điều kiện |
|---|---|---|
| 4–6 | App iOS/Android (Capacitor); đợt 3 ngôn ngữ; canonical sang domain riêng nếu đạt 10.000 người dùng/tháng hoặc 100 Member | Tài khoản nhà phát triển Apple (khoảng 99 USD/năm) và Google Play (25 USD một lần) — chi từ doanh thu |
| 4–6 | Lớp nhà cung cấp 2 (hãng sản xuất) mở rộng; 500 lượt mua qua Gói/tháng | Tài khoản mạng affiliate |
| 7–9 | Thỏa thuận cảnh báo với cơ quan VN; người duyệt chuyên môn trả bằng doanh thu | Doanh thu đủ |
| 10–12 | Gói Tổ chức cho NGO/địa phương; 10.000 người yếu thế nhận gói ngoại tuyến miễn phí qua Angel Edu Tam Foundation; cân nhắc dropship (lớp 3) | Pháp nhân nhận tiền, luật sư |

---

## 16. Chi phí, doanh thu và kinh tế đơn vị (mức 0 đồng)

### 16.1 Chi phí

| Khoản | Giai đoạn chưa thương mại | Khi liên kết affiliate chạy thật | Ghi chú |
|---|---|---|---|
| Kỹ thuật, nội dung, tuyển chọn, vận hành | 0 (vòng lặp AI) | 0 | Chạy trên gói Claude hiện có của chủ dự án |
| Vercel | 0 (Hobby) | Khoảng 20 USD/tháng (Pro) | Gói Hobby chỉ cho dùng cá nhân, phi thương mại; site có liên kết affiliate là thương mại → cần Pro trước khi bật. Giá tham khảo, kiểm khi nâng. |
| Supabase | 0 (Free; project tạm dừng khi không hoạt động) | Khoảng 25 USD/tháng (Pro) | Chỉ cần khi có tài khoản người dùng thật |
| Tên miền | 0 (`groundstead.iai.one`) | Tùy chọn 40–60 USD/năm cho 3 TLD | Không mua trong vòng lặp |
| Nguồn cảnh báo | 0 (nguồn miễn phí) | 0 | Nguồn trả phí chỉ khi doanh thu trả được |
| SMS, WhatsApp | 0 (tắt) | Theo tin, từ phí Member | |
| Nhãn hiệu | 0 (tra sơ bộ) | Tùy chọn | Bỏ qua làm tăng rủi ro phải đổi tên |
| **Tổng tối thiểu** | **0** | **khoảng 45 USD/tháng** | |

Những thứ bản B dự trù nhưng đã bỏ theo D-03: đội 6–7 người, chuyên gia duyệt trả phí, kiểm định, tồn kho thử, mẫu hàng, bảo hiểm trách nhiệm. Rủi ro của việc bỏ được ghi ở §18.

### 16.2 Doanh thu

1. **Hoa hồng affiliate** từ Gói Groundstead (bản A ước 3–8% tùy chương trình và ngành hàng; cần kiểm theo từng chương trình).
2. **Member** 39 USD/năm (khi có Stripe).
3. **Tổ chức** (sau Cổng 2).
4. **Handbook PDF** (sau Cổng 2).

### 16.3 Kinh tế đơn vị (giả định, chưa có số thật)

- Một lượt mua qua Gói: giỏ trung bình 120 USD × hoa hồng 5% = **6 USD**.
- Một Member: 39 USD − phí thanh toán ước 1,5 USD = **37,5 USD/năm**, tức khoảng 3,1 USD/tháng.
- Hòa vốn hạ tầng 45 USD/tháng: khoảng **8 lượt mua qua Gói/tháng**, hoặc **15 Member**, hoặc kết hợp.
- Mỗi chi phí mới (SMS, nguồn trả phí, người duyệt) chỉ bật khi doanh thu tháng trước trả được nó, và được ghi vào `03_DECISIONS.md`.

---

## 17. KPI theo cổng

Không có ngân sách quảng cáo; tăng trưởng đến từ SEO bản ngữ, cảnh báo và chia sẻ cộng đồng. Mục tiêu dưới đây là giả định để đo, được chỉnh ở mỗi cổng theo dữ liệu thật.

| KPI | Cổng 1 | Cổng 2 | Cổng 3 | Tháng 12 |
|---|---|---|---|---|
| **Hộ/tổ chức hoàn thành kế hoạch 72 giờ (chỉ số chính)** | — | 100 | 500 | 10.000 |
| Người dùng tháng | — | 1.500 | 5.000 | 100.000 |
| Đăng ký sớm (có đồng ý) | 200 | 1.000 | — | — |
| Hoàn thành bước 0 | 40% khách | 40% | 45% | 50% |
| Lượt mua qua Gói (theo báo cáo affiliate) | 0 | 30 | 100 | 500/tháng |
| Member | 0 | 0–30 | 100 | 1.000 |
| Ngôn ngữ có nội dung đầy đủ | 2 (thẻ 72 giờ) | 2 | 6 | 11 |
| Độ trễ cảnh báo trung vị (nguồn → hiển thị) | đo | < 10 phút | < 5 phút | < 3 phút |
| Nội dung và sản phẩm có hồ sơ đầy đủ | 100% | 100% | 100% | 100% |
| Tìm đúng thẻ trong ≤ 30 giây (mẫu thử) | — | ≥ 90% | ≥ 90% | ≥ 90% |

Những mục tiêu này không chứng minh sản phẩm làm giảm thương vong.

---

## 18. Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Nội dung an toàn chưa có chuyên gia duyệt gây hại (hệ quả của D-03) | **Cao** | Chỉ tóm lược nguồn chính thức; nhãn `AI_DRAFT` rõ ràng; không phát hành hóa chất, phóng xạ, xung đột, liều thuốc; kiểm bất biến bản dịch; mời người kiểm tra tình nguyện; ưu tiên chi đầu tiên từ doanh thu là người duyệt sơ cứu |
| Trách nhiệm pháp lý khi không có bảo hiểm và chưa có luật sư | Cao | Miễn trừ DRAFT; không thu tiền trước khi chủ dự án duyệt điều khoản; affiliate (không cầm tiền hàng) trước |
| Lãng mạn hóa nông thôn | Cao | Bước 0–1 nói thẳng chi phí, y tế, cô lập; kể cả câu chuyện quay lại thành phố |
| Thiết bị "chưa thử thực tế" làm giảm niềm tin | Trung bình | Nhãn trung thực; hồ sơ chứng nhận; tra thu hồi; ưu tiên thương hiệu có chứng nhận độc lập |
| Tài khoản affiliate bị từ chối hoặc chậm duyệt | Trung bình | Nhiều chương trình song song; Gói vẫn hữu ích như danh sách mua ở bất kỳ đâu |
| Vi phạm điều khoản gói hosting miễn phí khi thương mại | Trung bình | Chuyển Vercel Pro trước khi bật liên kết affiliate (việc của chủ dự án, §19) |
| Phụ thuộc API bên thứ ba | Trung bình | Ít nhất 2 nguồn cho mỗi loại hiểm họa; bản ghi mẫu để kiểm thử |
| Thương hiệu bị xem là "prepper sợ hãi" | Trung bình | Giọng bình tĩnh, số liệu có nguồn, không hình ảnh tận thế |
| Trùng nhãn hiệu Groundstead | Thấp–trung bình | Tra sơ bộ trong tuần đầu; tên lấy từ một tệp cấu hình |
| Phân tán sức lực trong hệ sinh thái | Cao | Một chủ dự án; ba cổng cứng; quy tắc "đã có ở dự án nào?" |
| Vòng lặp tự chấm bài mình | Trung bình | Không DONE khi chưa chạy thật; diff kiểm thử được xem trong PR; việc liên quan bảo mật ghi "chờ người rà độc lập" |

---

## 19. Việc chỉ người làm được (tối thiểu, mỗi việc một lần)

Vòng lặp làm mọi việc còn lại. Các việc dưới đây cần danh tính pháp lý, chấp nhận hợp đồng hoặc quyền mà AI không được thay mặt.

| Mã | Việc | Chặn gì | Khi nào cần |
|---|---|---|---|
| GS-H01 | Tạo repo trống `tranhatam-collab/groundstead` trên GitHub và cấp quyền cho Claude GitHub App | Tách repo, CI riêng, preview Vercel tự động | Ngay |
| GS-H02 | Duyệt nội dung landing EN/VI để công khai (một lần đọc, trả lời "duyệt") | Landing công khai | Trước 20/11 |
| GS-H03 | Cho biết DNS của `iai.one` đang ở đâu, hoặc cấp quyền tạo bản ghi cho `groundstead.iai.one` | Landing công khai | Trước 20/11 |
| GS-H04 | Đăng ký tài khoản affiliate đứng tên IAI LLC (sàn VN, Amazon US, mạng affiliate) và cấp khóa qua cơ chế bí mật của môi trường | Gói có liên kết thật | Trước 06/12 |
| GS-H05 | Nâng Vercel lên Pro trước khi bật liên kết affiliate | Thương mại hợp lệ | Trước 06/12 |
| GS-H06 | Quyết định tên sau khi đọc báo cáo tra nhãn hiệu sơ bộ | Đăng ký tên, mạng xã hội | Tuần 1–2 |
| GS-H07 | Tài khoản Stripe đứng tên IAI LLC | Thu phí Member | Trước 21/12 nếu muốn thu |
| GS-H08 | Duyệt các bản DRAFT điều khoản, quyền riêng tư, miễn trừ | Thu dữ liệu đăng ký sớm, thu tiền | Trước 20/11 (cho đăng ký sớm) |
| GS-H09 | Xác minh quyền sở hữu site trên Google Search Console | Đo SEO | Sau khi công khai |
| GS-H10 | Xác nhận định vị SI Bank | Không chặn | Bất kỳ lúc nào |

---

## 20. Nguồn tham khảo

**Pháp lý (tra ngày 06/11/2026 khi hợp nhất):**
- [Bộ Công Thương — Phổ biến Luật TMĐT và Nghị định 248/2026/NĐ-CP](https://moit.gov.vn/tin-tuc/bo-cong-thuong-pho-bien-luat-thuong-mai-dien-tu-va-nghi-dinh-so-248-2026-nd-cp.html)
- [Cần Thơ — Triển khai Nghị định 248/2026/NĐ-CP ngày 30/6/2026](https://pbgdpl.cantho.gov.vn/trien-khai-nghi-dinh-so-2482026nd-cp-ngay-30-thang-6-nam-2026-cua-chinh-phu-quy-dinh-chi-tiet-mot-so-dieu-cua-luat-thuong-mai-dien-tu)
- [Tổng quan Nghị định 248/2026/NĐ-CP (thứ cấp)](https://hethongphapluat.com/nghi-dinh-248-2026-nd-cp-huong-dan-luat-thuong-mai-dien-tu.html)
- [Cần Thơ — Triển khai Nghị định 218/2026/NĐ-CP (vận tải đường bộ)](https://pbgdpl.cantho.gov.vn/trien-khai-thuc-hien-nghi-dinh-so-2182026nd-cp-ngay-1962026-cua-chinh-phu)
- [EY — Nghị định 356/2025/NĐ-CP hướng dẫn Luật Bảo vệ dữ liệu cá nhân](https://www.ey.com/vi_vn/technical/tax/tax-and-law-updates/nghi-dinh-so-356-2025-nd-cp-quy-dinh-chi-tiet-mot-so-dieu-va-bien-phap-thi-hanh-luat-bao-ve-du-lieu-ca-nhan)
- [PwC Việt Nam — Quy định mới về bảo vệ dữ liệu cá nhân (01/2026)](https://www.pwc.com/vn/vn/publications/2026/20260128-new-rules-personal-data-protection.pdf)

**Do bản A trích** (danh sách đầy đủ ở mục 14 của bản A): WEF Global Risks Report 2026; CFR Preventive Priorities 2026; Munich Re nửa đầu 2026; Aon 9 tháng 2026; WFP Global Outlook 2026; SOFI 2026; Tractor Supply Homesteading Report 2026; Fannie Mae qua House Digest; Marketplace 7/2026; Finhay; Báo Pháp luật; Future Market Report (off-grid solar); 360iResearch, TechSci (survival tools); Global Growth Insights (emergency kit); Grips Intelligence; permies.com; GDACS, ReliefWeb, USGS, NWS, Meteoalarm, OpenAQ, IFRC GO.

**Do bản B trích** (URL nằm trong tệp gốc của bản B, không có trong phiên hợp nhất): WMO (tổng kết khí hậu; bản tin El Niño 26/10/2026); GDACS (sự kiện và điều khoản sử dụng); UNHCR; WHO (lời kêu gọi 2026); Báo cáo SDG 2026 của Liên Hợp Quốc; ITU (03/11/2026); IFRC (ứng dụng sơ cứu); American Red Cross; Ủy ban châu Âu (tài liệu 72 giờ, 30/10/2026); USGS (dự đoán động đất); NSF (chứng nhận bộ lọc nước); CDC (xử lý nước); IATA 2026 (vận chuyển pin); W3C WCAG 2.2; Luật TMĐT 122/2025/QH15; Luật BVDLCN 91/2025/QH15; EU GPSR; US CPSC; Stripe (quốc gia hỗ trợ); điều khoản sử dụng của WHO và ICRC.
