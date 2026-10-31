# AFTERVIA
## Kế hoạch sản phẩm, kinh doanh và bàn giao AI xây dựng ứng dụng mobile + web

**Phiên bản 1.0 • Ngày 31/10/2026 • Chủ dự án đề xuất: Trần Hà Tâm**

**Quyết định đề xuất:** xây thử một nền tảng phối hợp hậu mãi có chứng cứ dành cho cửa hàng điện máy, điện tử và khách hàng của họ. Dùng Wron làm công cụ tạo ứng dụng có giới hạn, không giao cho Wron quyền quyết định kiến trúc, pháp lý, chi tiêu hoặc phát hành.

AFTERVIA là tên làm việc, chưa được tra cứu và chấp thuận nhãn hiệu đầy đủ, chưa xác nhận tên miền. Đây là bộ kế hoạch và đặc tả để thực thi, không phải ứng dụng đã lập trình hoặc doanh nghiệp đã có doanh thu.

## A. Luận điểm đầu tư và quyết định lựa chọn

Không chọn tạo thêm một chatbot tổng quát, một công cụ tạo ảnh, hay một ứng dụng chỉ lưu hóa đơn. Chọn một công việc cụ thể: **giúp khách hàng, cửa hàng và đơn vị dịch vụ xử lý một vấn đề sau mua hàng trên cùng một hồ sơ, với bằng chứng, trách nhiệm và bước tiếp theo rõ ràng.**

Lý do thương mại là cửa hàng có công việc lặp lại, có nhân sự đang phải xử lý và có thể đo chi phí. Khách hàng có lợi ích rõ nhưng không bắt buộc phải trả tiền để thực hiện quyền bảo hành. Bên trả tiền chính là cửa hàng mua phần mềm vận hành; khách hàng nhận hồ sơ cơ bản miễn phí. Gói gia đình là nguồn bổ sung, không phải giả định sống còn.

Giả thuyết chưa được chứng minh: những cửa hàng có 1–10 địa điểm, 3–30 nhân viên và khối lượng hậu mãi đủ lớn sẽ trả 49–399 USD/tháng cho một giải pháp triển khai nhẹ, đa thương hiệu, có giao diện tiếng Việt và tiếng Anh. Phải kiểm tra bằng khách trả tiền thật.

Mục tiêu 1–2 năm là tạo doanh thu triệu USD với kinh tế đơn vị đủ tốt. Định giá một tỷ USD là kịch bản mở rộng có điều kiện, không phải lời hứa, không phải giá trị hiện tại và không dùng để hợp lý hóa chi tiêu trước khi tìm được khách.

## B. Bằng chứng thị trường và điều không được suy diễn

Sensor Tower công bố chi tiêu IAP toàn cầu năm 2025 khoảng 167 tỷ USD. Con số này cho thấy thị trường app có khả năng kiếm tiền, nhưng không phải quy mô thị trường của AFTERVIA. [S04]

NRF và Happy Returns ước tính giá trị hàng bị trả lại tại Mỹ năm 2025 là 849,9 tỷ USD. Khảo sát cũng cho thấy trải nghiệm trả hàng tệ có thể ảnh hưởng ý định mua lại. Đây là bằng chứng về tầm quan trọng của hậu mãi, không phải khoản doanh thu phần mềm có thể chiếm lấy. [S06]

RevenueCat cho thấy các app AI trong mẫu có khả năng thu tiền nhưng gặp vấn đề giữ chân. Vì vậy, AFTERVIA bán kết quả công việc, không bán số lượt chat. [S05]

EU đã có khung thúc đẩy sửa chữa với mốc áp dụng 31/07/2026. Tuy nhiên, phạm vi phụ thuộc sản phẩm và luật chuyển hóa quốc gia. Hộ chiếu sản phẩm số DPP được áp dụng theo nhóm sản phẩm, không mặc nhiên bắt buộc cho mọi món đồ. Đây là hướng tương thích tương lai, không phải lý do quảng cáo sản phẩm “đã đạt chuẩn EU”. [S19][S20]

Chưa có số lượng tìm kiếm tuyệt đối được xác minh, chưa có khảo sát sẵn sàng trả tiền và chưa có danh sách doanh nghiệp đủ lớn để khóa TAM. Bộ hồ sơ cung cấp chương trình kiểm chứng và danh sách từ khóa, không bịa số lượt tìm kiếm.

## C. Cạnh tranh: không phải khoảng trống chưa ai làm

Các sản phẩm hiện hữu đã giải quyết nhiều phần của bài toán. Itemtopia quản lý tài sản, hóa đơn và bảo hành. Keevora công bố cả theo dõi bảo hành lẫn gọi điện AI. ReceiptCash công bố trợ lý yêu cầu xử lý sau mua. Claimlane đã có AI và quy trình hậu mãi. Product Wallet có hạ tầng ví sản phẩm nhãn riêng. AfterShip và Loop cũng có quy trình bảo hành. [S08–S14]

Claimlane niêm yết gói Core từ 800 USD/tháng với 2.000 ticket/năm tại thời điểm đối chiếu. Mức giá này là điểm tham chiếu, không chứng minh mọi cửa hàng nhỏ đều thiếu lựa chọn rẻ hơn. Cũng không được so gói AFTERVIA dự kiến 49 USD với Claimlane như hai sản phẩm tương đương. [S07]

AFTERVIA phải cạnh tranh bằng một tổ hợp có thể kiểm tra: triển khai không cần dự án ERP; khách giữ và xuất được hồ sơ; nhiều bên chỉ được xem tài liệu đã chia sẻ; công việc tiếp theo có người chịu trách nhiệm; AI chỉ dùng bằng chứng trong hồ sơ; chi phí phù hợp nhóm cửa hàng đã chọn.

Trong thử nghiệm, phải đo AFTERVIA với cách làm hiện tại và tối thiểu hai đối thủ gần nhất. Nếu đối thủ giải quyết tốt hơn ở cùng tổng chi phí, không tiếp tục chỉ vì đã có tên thương hiệu hoặc đã tốn công tạo giao diện.

## D. Khách hàng đầu tiên và phạm vi đủ hẹp

Khách hàng trả tiền đầu tiên: cửa hàng hoặc chuỗi nhỏ bán thiết bị điện tử và đồ gia dụng không thuộc ngành đặc biệt. Người dùng hàng ngày là nhân viên hậu mãi; người duyệt mua là chủ cửa hàng hoặc quản lý vận hành. Người tiêu dùng dùng cổng hồ sơ miễn phí.

Điều kiện tuyển đối tác thử: có ít nhất 50 hồ sơ hậu mãi/tháng hoặc ít nhất 10 giờ/tháng dành cho việc tìm chứng từ, hỏi lại thông tin và cập nhật trạng thái. Những mức này là tiêu chí tuyển mẫu, không phải số liệu ngành.

Thử nghiệm khám phá tại Việt Nam để quan sát quy trình và ngôn ngữ; đồng thời tuyển một nhóm đối tác tiếng Anh ở một thị trường đã được pháp lý phê duyệt. Không lấy mức sẵn sàng trả tiền ở Việt Nam để suy thẳng ra giá toàn cầu, hoặc ngược lại.

Không mở y tế, ô tô, tín dụng, bảo hiểm, tranh chấp tư pháp, thiết bị nguy hiểm hoặc thị trường mua bán đồ cũ trong MVP. Không cung cấp hướng dẫn tự sửa thiết bị có nguy cơ gây hại. Không tự quyết định khách đủ hay không đủ quyền bảo hành.

## E. Sản phẩm và ba không gian sử dụng

**AFTERVIA Personal:** app iOS/Android và web cho khách hàng. Lưu món đồ, hóa đơn, điều khoản do người dùng cung cấp, lịch nhắc và hồ sơ xử lý. Trạng thái rõ: thông tin được cửa hàng xác nhận, thông tin người dùng nhập, thông tin AI đọc được nhưng chưa duyệt.

**AFTERVIA Desk:** web cho cửa hàng. Tiếp nhận, kiểm tra thiếu chứng từ, giao người phụ trách, theo dõi hạn phản hồi, mời đơn vị dịch vụ và đóng hồ sơ với bằng chứng. Đây là sản phẩm thu phí chính.

**AFTERVIA Partner:** ban đầu chỉ là quyền truy cập giới hạn vào một hồ sơ. Không xây một marketplace đối tác độc lập khi chưa có lưu lượng. API nhãn riêng và tích hợp nhà sản xuất thuộc giai đoạn sau.

Ba không gian là các vai trò trên một nền tảng, không phải ba startup và không phải ba cơ sở dữ liệu sao chép lẫn nhau.

## F. Vòng giá trị hoàn chỉnh của MVP

Luồng chuẩn: cửa hàng tạo hồ sơ mua hàng hoặc khách tải hóa đơn → AI gợi ý trường dữ liệu → người dùng xác nhận → tạo món đồ → ghi nhận điều khoản và thời hạn có nguồn → khách mở yêu cầu → cửa hàng kiểm tra hồ sơ → mời đơn vị dịch vụ nếu cần → các bên cập nhật tiến độ → người có thẩm quyền xác nhận kết quả → khách nhận bản xuất.

Ví dụ minh họa, không phải giao dịch thật: khách mua một máy hút bụi, có hóa đơn và tài liệu bảo hành 12 tháng. Ứng dụng lưu chính tài liệu đó và mốc xác nhận; không tự suy rằng mọi máy hút bụi đều được 12 tháng bảo hành. Khi có vấn đề, ứng dụng tập hợp thông tin và bản nháp đề nghị hỗ trợ. Cửa hàng hoặc hãng mới là bên xác định hướng xử lý theo nghĩa vụ áp dụng.

Điểm “hoàn thiện” không nằm ở số màn hình. Một hồ sơ phải chạy xuyên suốt mobile và web, tồn tại sau đăng xuất, phân quyền đúng, xuất được và xóa được theo chính sách. Những chức năng chưa triển khai không được có nút giả.

## G. Đặc tả chức năng theo ưu tiên

P0 gồm đăng nhập, tổ chức và thành viên, danh mục món đồ, tải chứng từ, nhập tay khi AI lỗi, xác nhận dữ liệu, lịch nhắc, tạo hồ sơ hậu mãi, trạng thái và bình luận, chia sẻ từng tài liệu và quyền đối tác theo hồ sơ, bàn làm việc cửa hàng, nhật ký truy cập, xuất dữ liệu và xóa tài khoản. Hoàn thành P0 trước mọi tính năng tăng trưởng.

P1 gồm mời khách bằng liên kết một lần, nhập CSV có kiểm tra, báo cáo thời gian xử lý, quyền gia đình, thuê bao thử nghiệm trong sandbox và thông báo email/push có kiểm soát. Một luồng thanh toán thật chỉ được mở sau khi có phê duyệt pháp lý, chính sách store và chủ dự án.

P2 gồm kết nối đơn hàng, API nhãn riêng, hồ sơ chuyển chủ có sự đồng ý, kiểm tra thông báo thu hồi từ nguồn chính thức và quy tắc quốc gia đã được rà soát. Không lấy P2 làm lời hứa trong onboarding MVP.

Không có tự động đòi tiền, tự gọi điện, truy cập ngân hàng, scraping hộp thư, chữ ký đại diện pháp lý, chia sẻ dữ liệu để quảng cáo hay quyết định từ chối bảo hành bằng AI.

## H. AI: trích xuất, tổng hợp và gợi ý có giới hạn

Ba chức năng AI đầu tiên là đọc chứng từ, tóm tắt hồ sơ và soạn bản nháp câu hỏi hoặc phản hồi. Mọi trường quan trọng phải đi kèm nguồn, vị trí trong chứng từ, trạng thái duyệt và phiên bản. Không dùng một “điểm tin cậy” tự sinh để thay sự xác nhận của người dùng.

Ngày hết hạn chỉ được tính bằng quy tắc xác định từ mốc bắt đầu và điều kiện đã xác nhận. Phân biệt thời hạn trả hàng theo chính sách cửa hàng, bảo hành thương mại và quyền luật định. Thông tin thiếu phải là null hoặc “chưa xác định”, không tự điền thời hạn thông dụng.

Chứng từ là đầu vào không đáng tin: nội dung “bỏ qua hướng dẫn” trong hóa đơn không được trở thành lệnh. AI không có quyền gửi email ra ngoài, cấp quyền truy cập, sửa số tiền hoặc đổi chính sách. Các thao tác đó qua API kiểm quyền và sự chấp thuận rõ ràng.

Đánh giá trên bộ tài liệu được phép sử dụng, có nhãn do người kiểm tra lập. Các chỉ số gồm độ đúng từng trường, tỷ lệ biết từ chối khi thiếu chứng cứ, số kết luận không có nguồn, chi phí mỗi tác vụ và thời gian xử lý. Không đưa dữ liệu thật vào benchmark nếu thiếu quyền.

## I. Kiến trúc kỹ thuật và ranh giới của Wron

Kiến trúc đề xuất: client mobile theo stack Wron thực sự hỗ trợ; client web cùng API; backend Supabase/Postgres do chủ dự án kiểm soát; kho chứng từ riêng tư; các hàm server cho nghiệp vụ nhạy cảm; hàng đợi tác vụ AI/thông báo; billing adapter; nhật ký vận hành.

Expo/React Native là ứng viên phù hợp để thử, không phải kết luận đã kiểm định toàn bộ stack Wron. Cần development build, không coi Expo Go là bằng chứng sẵn sàng phát hành. [S28]

Wron công bố xây mobile/web và tích hợp Supabase, RevenueCat. Nhưng xuất mã nguồn, build độc lập, quản lý nhiều client, kiểm thử và bảo mật vẫn phải được chứng minh ở Gate 0. Điều khoản cũng không bảo đảm đầu ra độc nhất hay thành công kinh doanh. [S01][S02]

Nếu không xuất được source có quyền sử dụng thương mại rõ ràng, Wron chỉ được dùng cho prototype bằng dữ liệu giả lập. Kiến trúc và dữ liệu không được bị khóa vào một builder. Không đưa secret vào prompt hoặc client. Supabase service-role có thể vượt RLS, do đó chỉ dùng phía server với kiểm quyền riêng. [S29]

## J. Dữ liệu, bằng chứng và quyền kiểm soát

Các thực thể cốt lõi gồm người dùng, tổ chức, thành viên, món đồ, chứng từ, dữ kiện trích xuất, điều khoản bảo hành, lịch nhắc, hồ sơ hậu mãi, bên tham gia hồ sơ, tài liệu được chia sẻ, sự kiện, thông báo, thuê bao, đồng ý và yêu cầu xóa.

Mỗi món đồ của khách có chủ thể kiểm soát riêng. Cửa hàng không được nhìn thấy toàn bộ kho tài sản của khách chỉ vì từng bán một sản phẩm. Hồ sơ dùng chung có `case_participants`; mỗi tài liệu phải có `case_document_grants`. Quyền tổ chức không tự động tạo quyền đối với hồ sơ cá nhân.

Giá trị tiền lưu theo đơn vị nhỏ nhất và mã tiền tệ; không dùng float cho số tiền giao dịch. Mốc thời gian có UTC và múi giờ IANA cho lịch nhắc. Ngày mua có thể chỉ là ngày địa phương, không tự đổi sang thời điểm UTC gây lệch hạn.

Hash chỉ giúp nhận biết thay đổi so với bản đã lưu, không chứng minh hóa đơn là thật. Chữ ký cửa hàng chỉ xác nhận hành động của tài khoản đã xác thực, không mặc nhiên là chứng thực pháp lý hoặc chứng minh quyền sở hữu tài sản.

## K. Bảo mật và quyền riêng tư

Mô hình đe dọa ưu tiên rò tài liệu giữa tenant, liên kết chia sẻ bị chuyển tiếp, prompt injection, lộ API key, webhook giả, gian lận chứng từ, nhân viên truy cập quá mức và xóa dữ liệu không hoàn tất.

Mọi bảng và storage object cần chính sách kiểm quyền. Kiểm thử phải dùng hai cửa hàng và hai khách khác nhau, không chỉ dùng tài khoản admin. File có giới hạn kích thước, loại được phép, quét mã độc, tên lưu ngẫu nhiên và URL ngắn hạn. Tải tài liệu nhạy cảm qua cổng kiểm quyền để thu hồi có hiệu lực theo thiết kế.

Mã hóa đường truyền và lưu trữ không đồng nghĩa mã hóa đầu cuối. Nếu server/AI đọc được chứng từ, không quảng cáo “chỉ chủ tài khoản giải mã được”. Log không ghi toàn văn hóa đơn, token hoặc số thanh toán.

Có môi trường dev/staging/production tách biệt, MFA cho admin, phê duyệt phát hành, backup mã hóa và diễn tập phục hồi. Mục tiêu nội bộ ban đầu là RPO 24 giờ, RTO 8 giờ; chưa cam kết SLA thương mại trước khi đo thực tế.

## L. Pháp lý và hoạt động quốc tế

Thiết kế toàn cầu không có nghĩa mở thương mại toàn cầu ngay. Mỗi quốc gia cần một `country_pack` chứa phạm vi được mở, ngôn ngữ, tiền tệ, thuế, điều khoản, thông báo riêng tư, nhà xử lý dữ liệu, điều kiện chuyển dữ liệu và quy tắc đã có người duyệt.

Việt Nam cần rà Luật Bảo vệ dữ liệu cá nhân có hiệu lực từ 01/01/2026 và văn bản bảo vệ người tiêu dùng hiện hành, bao gồm bản hợp nhất 2026 đã tìm thấy. Không chỉ sử dụng checklist năm 2023. [S23][S24]

Hoa Kỳ cần xem cả pháp luật liên bang và tiểu bang, quy tắc gia hạn thuê bao và yêu cầu về dữ liệu. EU/EEA, UK phải có đánh giá quyền riêng tư và chuyển dữ liệu riêng. Các nghĩa vụ không thể được suy ra chỉ từ địa chỉ IP hoặc ngôn ngữ giao diện. [S25][S26][S27]

Người dùng khai báo quốc gia cư trú, nơi giao dịch và bên bán. Khi các yếu tố xung đột, hệ thống không tự kết luận quyền luật định. Chỉ lưu và nhắc theo điều khoản đã xác nhận hoặc chuyển người có chuyên môn xem xét.

Ngôn ngữ chưa có bản dịch có thể dùng tiếng Anh cho giao diện chung, nhưng nếu thông báo pháp lý địa phương bắt buộc mà chưa đáp ứng thì chặn mở bán. Không mặc nhiên coi tiếng Anh là đủ điều kiện pháp lý.

## M. Thương hiệu và sở hữu trí tuệ

Tên làm việc: AFTERVIA. Ý nghĩa định vị là con đường rõ ràng sau khi mua một món đồ. Câu định vị tiếng Việt: “Sau mua, luôn rõ.” Câu định vị tiếng Anh: “Clarity after every purchase.”

Tên này chưa có kết luận không xung đột. Tìm kiếm web sơ bộ đã xuất hiện cách dùng từ tương tự ngoài lĩnh vực phần mềm; không đủ để cấp clearance. Phải tra cứu trùng, tương tự âm/ý, class hàng hóa dịch vụ và quyền đã có ở từng lãnh thổ. Tên miền và tài khoản mạng xã hội chưa được xác nhận còn trống. [S21]

Lớp tài sản cần bảo vệ gồm wordmark, thiết kế do người thực hiện tạo ra, mã nguồn đủ điều kiện bảo hộ, tài liệu, bộ kiểm thử hợp pháp, bí mật vận hành và hợp đồng đối tác. Không thể độc quyền ý tưởng “AI quản lý bảo hành”. Không coi toàn bộ đầu ra AI tự động được bảo hộ bản quyền. [S22]

Tất cả người làm thuê hoặc đối tác phát triển cần điều khoản chuyển giao quyền phù hợp, danh sách thành phần nguồn mở và chứng cứ đóng góp. Đối với Wron, phải có xác nhận về quyền khai thác, sửa đổi, chuyển giao và xuất generated code; không chỉ dựa vào điều khoản người dùng giữ quyền đối với input. [S02]

Chưa nộp đơn nhãn hiệu, bản quyền hay sáng chế trong lượt này. Không được dùng ký hiệu ®. Không công bố “độc quyền”, “đã cấp bằng” hoặc “toàn cầu” về IP khi chưa có hồ sơ thực tế.

## N. Hệ thiết kế mobile và web

Thiết kế bình tĩnh, đáng tin, ít màu nhấn. Light và dark đều phải đọc rõ; tránh cảm giác dashboard tài chính phức tạp. Logo được định hướng là đường đi liên tục kết hợp hai lớp tài liệu, nhưng hình đồ họa cuối cùng cần thiết kế độc lập và kiểm tra tương tự.

Mobile tập trung vào thêm chứng từ, xem món đồ và cập nhật một hồ sơ. Web tập trung vào xử lý hàng loạt, phân công và báo cáo. Không thu nhỏ nguyên dashboard desktop thành mobile.

Mọi màn hình có trạng thái rỗng, đang tải, lỗi, mất mạng và không đủ quyền. Lịch nhắc không dùng countdown gây áp lực. Nếu hạn chưa xác nhận, ghi rõ chứ không tô đỏ giả. Không có đánh giá khách hàng, số tiền tiết kiệm hoặc số người dùng bịa.

Menu ngôn ngữ thể hiện tên ngôn ngữ đầy đủ; biểu tượng quốc gia chỉ là hỗ trợ lựa chọn thị trường, không suy quốc tịch. Các nhãn được lấy từ hệ thống bản địa hóa. Hỗ trợ bàn phím, screen reader, phóng chữ và reduced motion.

## O. Giá, giới hạn sử dụng và nguyên tắc thu tiền

Giá thử nghiệm đề xuất: Personal Free cho hồ sơ cơ bản; Family 4,99 USD/tháng; Desk Starter 49 USD/tháng; Desk Growth 149 USD/tháng; Desk Scale 399 USD/tháng. Đây chưa phải bảng giá đã được thị trường chấp nhận.

Giả định cơ cấu B2B trong mô hình mục tiêu là 50% Starter, 30% Growth và 20% Scale, tạo ARPA bình quân 149 USD/tháng. Thực tế phải đo lại theo thị trường và số địa điểm. Không giả định khách Việt Nam mặc nhiên chịu được mức giá quốc tế.

Free không khóa hồ sơ khi cần thực hiện quyền hậu mãi. Người dùng luôn được xuất dữ liệu; hết thuê bao thì hạn chế tính năng nâng cao, không giữ chứng từ làm con tin. Không tự động gia hạn bằng thông tin gây hiểu nhầm.

Mobile dùng cơ chế thanh toán phù hợp với loại tính năng và storefront; không mặc nhiên đặt link web để né chính sách. Web bán gói doanh nghiệp theo hợp đồng được rà soát. Thuế, phí thanh toán và phí store không phải doanh thu của nền tảng. [S30][S31]

## P. Cách giao việc cho Wron

Không dán toàn bộ kế hoạch vào một ô prompt. Trang công khai của Wron hiển thị giới hạn 1.500 ký tự ở bước khởi tạo; bộ bàn giao có prompt mở đầu ngắn và chuỗi công việc nhỏ. Giới hạn trong tài khoản thực cần kiểm tra lại. [S01]

Bước đầu là capability probe: dựng đăng nhập, ghi và đọc một bản ghi thật ở sandbox, đăng xuất/đăng nhập lại, xuất mã nguồn và build độc lập. Sau đó kiểm thử việc khách A không thấy dữ liệu khách B. Chưa qua cổng này thì không đưa tri thức độc quyền hoặc dữ liệu thật vào dự án.

Mỗi lần giao việc chỉ thay đổi một lát cắt. AI phải báo tệp đã sửa, migration, cách kiểm thử, kết quả đã chạy, lỗi còn lại và điểm cần chủ dự án quyết định. Không tự tạo tài khoản trả phí, cài công cụ lạ, phát hành public hoặc ghi đè nhánh chính.

Nếu Wron không thực hiện được yêu cầu, ghi `BLOCKED` với chứng cứ. Không tạo màn hình “thành công” giả để che việc chưa có backend. Phương án thoát dùng repository đã xuất và môi trường lập trình độc lập; nếu không xuất được thì chỉ giữ prototype tham khảo.

## Q. Nghiệm thu và định nghĩa hoàn thành

Bản MVP chỉ được nghiệm thu khi luồng đầu cuối chạy trên ít nhất một iPhone, một máy Android thật và các trình duyệt web mục tiêu; dữ liệu đồng bộ; không có lỗi nghiêm trọng; các quyền chặn đúng; export/delete hoạt động; có backup đã thử phục hồi.

Kiểm thử cần bao phủ logic ngày và múi giờ, dữ liệu thiếu, file hỏng, mất mạng, upload trùng, AI không khả dụng, notification bị từ chối, URL chia sẻ hết hạn, truy cập chéo tenant, thay đổi vai trò và webhook gửi lặp.

Chất lượng AI không được đánh giá chỉ bằng một hóa đơn đẹp. Có tập dễ, tập khó và tập gây hiểu nhầm. Với trường ngày, tiền, serial và điều khoản, phải đo riêng; mọi suy đoán sai có ảnh hưởng quyền lợi phải được chặn trước khi hành động.

Các test trong gói tài liệu có trạng thái “chưa chạy”. Không được đọc sự tồn tại của một checklist như bằng chứng ứng dụng đã an toàn. Nghiệm thu bảo mật do người khác với AI tạo code kiểm tra.

## R. Lộ trình từ ngày phê duyệt đến 24 tháng

Ngày 1–14: 30 phỏng vấn gồm 15 cửa hàng, 10 khách và 5 đơn vị dịch vụ; xem quy trình thật với quyền sử dụng dữ liệu; capability probe Wron; rà tên và phạm vi pháp lý; chọn 5 đối tác thiết kế. Không mở bán.

Ngày 15–45: hoàn thành lát cắt P0 trên mobile/web, kiểm thử dữ liệu và phân quyền. AI chỉ đọc tài liệu giả lập hoặc đã được phép. Chốt quy trình bỏ dùng nhà cung cấp.

Ngày 46–75: pilot giới hạn với 5–10 cửa hàng và các khách tự nguyện; đủ hồ sơ để đo trước/sau; người thật duyệt đầu ra nhạy cảm. Mở thanh toán thử hoặc thật chỉ khi được phê duyệt riêng.

Ngày 76–90: xử lý lỗi, xác định có ít nhất 3–5 cửa hàng trả tiền thật, chuẩn bị beta store. Nếu không đạt nhu cầu hoặc không xuất source, dừng mở rộng.

Tháng 4–6: cải thiện retention và onboarding; tháng 7–12: một ngành hàng, tối đa hai thị trường được duyệt; tháng 13–18: kênh reseller và tích hợp; tháng 19–24: mở rộng có kiểm soát. Mốc thời gian là kế hoạch, không phải cam kết Wron hoàn thành.

## S. Thu hút khách hàng và bán hàng

Kênh đầu tiên là đối tác cửa hàng, không phải quảng cáo đại trà cho người tiêu dùng. Một cửa hàng dùng tốt có thể mời khách nhận hồ sơ sau mua; khách có thể tiếp tục dùng với sản phẩm từ nơi khác. Đây là cơ chế phân phối cần kiểm chứng, chưa phải hiệu ứng mạng đã tồn tại.

Quy trình bán B2B: chọn đúng nhóm cửa hàng → phỏng vấn → đo tình trạng ban đầu → demo bằng hồ sơ mẫu → pilot có phạm vi → đo kết quả → đề nghị hợp đồng. Không gửi spam hàng loạt hoặc tự liên hệ khách trong lượt lập kế hoạch này.

Nội dung tìm kiếm tập trung vào công việc: thất lạc hóa đơn, tìm thời hạn đã cam kết, cách chuẩn bị hồ sơ và cách theo dõi sửa chữa. Không viết bài pháp lý chắc chắn bằng AI mà chưa có người duyệt từng quốc gia.

Chỉ tăng quảng cáo sau khi biết CAC và retention theo cohort. Tất cả câu chuyện khách hàng phải có sự đồng ý và chứng cứ. Không hứa “tiết kiệm X USD” dựa trên số tiền ghi trên hóa đơn.

## T. Vận hành và đội ngũ

Một founder và một builder AI không đủ để vừa phát triển, rà bảo mật, duyệt pháp lý, bán hàng và trực sự cố ở quy mô lớn. AI có thể hỗ trợ khối lượng công việc; trách nhiệm vẫn cần người được giao rõ.

Giai đoạn pilot cần người phụ trách sản phẩm, kỹ sư chịu trách nhiệm kiến trúc, reviewer bảo mật độc lập, người vận hành khách hàng và hỗ trợ pháp lý theo việc. Không nhất thiết tuyển toàn thời gian tất cả ngay ngày đầu.

Khi mở rộng, phân tách phát triển, xét duyệt, hỗ trợ và quyền truy cập dữ liệu. Nhân viên hỗ trợ không mặc định xem hóa đơn; cần cấp quyền theo vụ việc, hết hạn và lưu audit.

Sự cố mức cao gồm truy cập chéo tài khoản, thất lạc dữ liệu, gửi nhầm tài liệu và thu phí sai. Có quyền dừng AI hoặc dừng chức năng thương mại mà không ngừng quyền truy cập/xuất hồ sơ của khách. Không cam kết vận hành 24/7 không giám sát khi chưa có năng lực thực tế.

## U. Kế hoạch tài chính 24 tháng

Workbook kèm theo tính từng tháng từ khách mới, churn, ARPA, giới thiệu khách gia đình, chi phí trực tiếp, phí thanh toán, hoàn tiền, bán hàng và chi phí vận hành. Các số là giả định mô hình, không phải giao dịch đã xảy ra.

| Chỉ tiêu | Thận trọng | Mục tiêu | Tăng tốc |
|---|---:|---:|---:|
| Doanh thu thuần mô hình năm 1 | 27.956 USD | 87.036 USD | 211.663 USD |
| Doanh thu thuần mô hình năm 2 | 309.559 USD | 1.012.782 USD | 2.508.759 USD |
| Kết quả vận hành năm 2, trước thuế/lãi vay/khấu hao | -437.308 USD | -125.523 USD | 273.659 USD |
| ARR thuần mô hình tại tháng 24 | 569.194 USD | 1.904.265 USD | 4.756.919 USD |
| Số cửa hàng hoạt động cuối tháng 24, làm tròn | 465 | 1.017 | 2.097 |
| Nhu cầu vốn cực đại cộng dự phòng 20% | 822.179 USD | 608.980 USD | 785.335 USD |

Kịch bản mục tiêu đạt triệu USD doanh thu năm thứ hai nhưng chưa có lãi vận hành cả năm. Kịch bản thận trọng đốt vốn lớn nếu vẫn cố vận hành đủ 24 tháng; thực tế phải áp dụng cổng dừng, không cấp toàn bộ số tiền này trước.

Giả định mục tiêu gồm churn B2B 1,5%/tháng; CAC B2B 300 USD; chi phí trực tiếp 35 USD/cửa hàng/tháng; 40 đơn hàng đủ điều kiện mời/tháng; 25% khách nhận hồ sơ; 3% trong số đó chuyển Family. Tất cả cần đo lại. Doanh thu Family không được cộng trùng với hồ sơ miễn phí do cửa hàng tài trợ.

Mô hình thanh toán theo tháng, dòng tiền về trễ một tháng, chưa mô phỏng hợp đồng trả trước năm, thuế thu nhập, nợ hoặc phân phối lợi nhuận. Doanh thu, lợi nhuận, ARR và tiền vào là bốn đại lượng khác nhau. Không có số doanh thu thực tế được xác nhận trong bộ kế hoạch.

## V. Định giá triệu USD và kịch bản một tỷ USD

Một ứng dụng được tạo xong không tự động có giá trị một triệu USD. Giá trị phụ thuộc giao dịch đầu tư hoặc mua bán, khả năng giữ khách, quyền sở hữu tài sản, chất lượng doanh thu và rủi ro.

Bảng độ nhạy thuần toán học: nếu thị trường chấp nhận 10 lần ARR thì cần 100 triệu USD ARR để suy ra 1 tỷ USD; 20 lần cần 50 triệu; 30 lần cần khoảng 33,33 triệu. Những bội số này là giả định để hiểu quy mô, không phải bội số giao dịch hiện hành hoặc lời dự báo.

Một cấu hình mở rộng minh họa là 30.000 cửa hàng độc lập ở ARPA tương lai 199 USD/tháng, 400.000 gói Family ở 4,99 USD/tháng và 100 hợp đồng doanh nghiệp độc lập ở 100.000 USD/năm. Tổng doanh thu thường niên theo giá hợp đồng trước hoàn tiền là 105,592 triệu USD. Không cộng doanh nghiệp và cửa hàng nếu cùng một hợp đồng.

Để đạt cấu hình đó trong 24 tháng cần kênh phân phối quốc tế, đội triển khai, vốn tăng trưởng, pháp lý nhiều thị trường và năng lực sản phẩm vượt xa MVP. Chưa có chứng cứ hiện tại để coi mốc một tỷ USD sau 1–2 năm là kết quả có khả năng được dự báo đáng tin. Vẫn giữ nó như đích thiết kế quy mô, nhưng cấp vốn theo kết quả từng giai đoạn.

## W. Mở rộng sản phẩm mà không biến thành siêu ứng dụng

Sau khi chứng minh được một ngành hàng, mở lần lượt sang nhà phân phối, nhãn hàng, hồ sơ sản phẩm nhãn riêng và tích hợp vòng đời sửa chữa. Chỉ mở chuyển chủ, thu hồi sản phẩm hoặc DPP khi đủ dữ liệu, quyền và chuyên môn.

Mỗi nhánh mới có khách trả tiền, chủ sở hữu công việc, hạn mức chi phí và điều kiện dừng riêng. Không thêm mạng xã hội, ngân hàng, token, ví tiền hay marketplace chỉ để tăng câu chuyện định giá.

AFTERVIA không thay thế Muonnoi, Nguyen AI/Owner OS, Khoa Mộc Miên hoặc SI Bank. Kết nối hệ khác trong tương lai phải có giao diện và sự đồng ý rõ, không chia sẻ dữ liệu mặc định.

Lợi thế dài hạn có thể đến từ quy trình, tích hợp, chất lượng hồ sơ và độ tin cậy trong xử lý; dữ liệu cá nhân không phải tài sản được tùy ý đem bán. Tập dữ liệu cải tiến chỉ dùng theo quyền và mục đích phù hợp.

## X. Rủi ro lớn và các cổng dừng

Rủi ro thứ nhất là nhu cầu không đủ cấp thiết: dừng hoặc đổi phân khúc nếu cửa hàng không trả tiền dù đã chứng minh tiện ích. Thứ hai là nhập liệu gây phiền: nếu không hoàn tất hồ sơ đầu tiên đủ nhanh, cải thiện onboarding thay vì mua thêm lượt tải.

Rủi ro thứ ba là đối thủ mạnh hơn và rẻ hơn: thử nghiệm ngang công việc và tổng chi phí. Thứ tư là builder khóa mã nguồn: chặn dữ liệu thật tại Gate 0. Thứ năm là rò dữ liệu: dừng tính năng chia sẻ và điều tra, không che bằng thay giao diện.

Rủi ro thứ sáu là bán rẻ nhưng hỗ trợ đắt: đo phút hỗ trợ/cửa hàng, chi phí AI và tỷ lệ hồ sơ thiếu. Nếu biên đóng góp không đạt ngưỡng, điều chỉnh phạm vi hoặc giá trước tăng trưởng.

Không vượt một cổng bằng báo cáo tự đánh giá của chính AI đã viết code. Không phát hành khi chưa duyệt pháp lý và quyền IP. Không dùng mục tiêu tỷ USD để bỏ qua cổng dừng.

## Y. Những quyết định chủ dự án cần chốt

Đây là đề xuất để duyệt, chưa phải giấy phép chi tiêu. Các quyết định cần ghi nhận gồm tên làm việc, nhóm khách hàng đầu tiên, hạn mức discovery/prototype, pháp nhân sở hữu, tài khoản hạ tầng do chủ dự án giữ, reviewer độc lập và thị trường pilot.

Đề xuất cấp ngân sách từng giai đoạn: khám phá 1.500–3.000 USD; prototype kỹ thuật 500–2.000 USD; MVP pilot 15.000–35.000 USD; beta vận hành 40.000–90.000 USD. Đây là khoảng ước tính công việc, chưa phải báo giá, không cộng máy móc vào workbook nếu đã nằm trong Opex.

Ưu tiên ngay sau phê duyệt là kiểm định Wron và tìm năm đối tác thiết kế, không mua gói dài hạn hoặc triển khai toàn cầu. Thử nghiệm chỉ được mở khi có phạm vi dữ liệu và quyền thao tác cụ thể.

## Z. Bộ hồ sơ bàn giao và thứ tự sử dụng

Đọc `00_START_HERE.md`, sau đó dùng `handoff/00_WRON_BOOTSTRAP_LT1500.txt`. Thực hiện capability probe trước chuỗi prompt xây ứng dụng. Đối chiếu PRD, quyền truy cập, dữ liệu, API, kiểm thử và điều kiện phát hành sau từng bước.

Các tệp Markdown là đặc tả; CSV là sổ quản lý có thể nhập vào công cụ dự án; JSON/OpenAPI là hợp đồng thiết kế; XLSX là mô hình giả định có công thức. `engineering/10_REPO_FILE_MANIFEST.csv` là danh mục mã nguồn cần Wron tạo trong tương lai, không phải tuyên bố code đó đã tồn tại.

Mọi test, tên miền, đăng ký IP, tài khoản store, quyền thanh toán và bằng chứng hiệu quả còn thiếu đều được ghi trạng thái. Hoàn chỉnh bộ kế hoạch không đồng nghĩa đã chứng minh khả thi thương mại, đã bảo mật tuyệt đối hoặc đã được phép hoạt động toàn cầu.

**Kết luận:** xây một MVP hậu mãi hoàn chỉnh theo một luồng công việc, kiểm chứng tiền trả và kết quả xử lý, giữ quyền sở hữu và khả năng rời builder. Mục tiêu triệu USD có đường tính cụ thể; mục tiêu một tỷ USD chỉ có ý nghĩa khi các điều kiện tăng trưởng và chất lượng doanh thu thực sự được đáp ứng.
