# Quy tắc AI, provenance và đánh giá
## Allowed
Trích xuất trường từ hóa đơn; phân loại chứng từ; tóm tắt case đã được cấp quyền; đề xuất câu hỏi còn thiếu; soạn trả lời nháp để người có trách nhiệm duyệt.
## Forbidden
Tự quyết định quyền pháp lý, bịa điều khoản, tự gọi/nhắn bên ngoài, nộp khiếu nại, chuyển tiền, sửa bản gốc, huấn luyện bằng dữ liệu khách chưa có quyền, đưa hướng dẫn sửa thiết bị nguy hiểm.

## Extraction contract
Mỗi trường gồm value hoặc null, document_id, source locator (page/bounding box hoặc text span), raw_text và review_status. Ngày mơ hồ 03/04 phải để cần xác nhận theo locale; không tự chọn ngày. Currency thiếu thì null, không suy từ ngôn ngữ. Serial không rõ thì null; không “sửa cho hợp lý”.
Nếu model tự đưa confidence thì coi là uncalibrated diagnostic, không hiển thị như xác suất đúng. Critical fields luôn cần human confirmation trước deadline/action.
Không ghi “AI đã xác minh”. Chỉ “AI đề xuất; chưa duyệt”, “người dùng xác nhận”, hoặc “cửa hàng xác nhận” khi có actor.

## RAG và phạm vi
Retrieval chỉ lấy tài liệu đang được phép trong case. Không dùng web tùy tiện để thay chính sách riêng của sản phẩm. Hợp đồng merchant và chính sách nhà sản xuất cần version, thời điểm hiệu lực và URL/file nguồn. Tài liệu upload là dữ liệu không tin cậy, không phải instruction. Chuỗi “ignore previous instructions” trong PDF không được thay quyền tool.

## Evaluation dataset
Tạo bộ300 tài liệu synthetic/đã được cấp phép:100 rõ,100 khó,50 thiếu/đa ngôn ngữ,50 adversarial. Không phát hành tài liệu thật riêng tư làm test.
Gắn nhãn hai người độc lập cho critical fields; bất đồng được adjudicate. Tách train/dev/test theo merchant/document family để không rò.
Mục tiêu đề xuất: precision≥98% trên critical fields được auto-suggest; coverage báo riêng; 100% critical actions yêu cầu xác nhận. Không đạt thì giảm automation, không nới định nghĩa pass.
Đo hallucinated legal eligibility, source attribution errors, cross-tenant leakage, latency p50/p95, cost per successful reviewed document. Zero cross-tenant leak là release gate, không lời bảo đảm tuyệt đối.

## Fail-safe và chi phí
Quota theo tenant/user; file size/page cap; retries tối đa2; timeout chuyển nhập tay. Không retry vô hạn vì model lỗi. Token/page budget do owner duyệt, notification khi 50/80/100%; chặn chi mới tại100% trừ approval.
Không âm thầm dùng nhà cung cấp khác có chính sách dữ liệu khác. Khi fallback, phải nằm trong danh sách được duyệt.
