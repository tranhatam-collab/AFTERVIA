# CHECKLIST (DRAFT): Tên, nhãn hiệu, quyền sở hữu trí tuệ và nhà cung cấp

> **Trạng thái: DRAFT.** Đây là danh sách việc cần làm, không phải kết luận pháp lý. Không khẳng định tên AFTERVIA đã được kiểm tra, được cấp quyền hay không xâm phạm. Không phải tư vấn pháp lý.
> Nguồn: `docs/spec/AFTERVIA_AZ_2026-10-31/brand/02_NAMING_AND_TRADEMARK_DUE_DILIGENCE.md` và `legal/01_IP_OWNERSHIP_AND_VENDOR_CHECKLIST.md`.
> Phê duyệt: HUM-WO18-02 (luật sư và tư vấn IP). Repo không tự đánh dấu mục nào là hoàn tất.

## A. Trạng thái đã biết

| Mục | Trạng thái theo đặc tả |
|---|---|
| DEC01 Tên làm việc AFTERVIA | PROPOSED; chưa clearance |
| DEC03 Pháp nhân sở hữu và tài khoản hạ tầng | UNASSIGNED |
| Kiểm tra web ban đầu | Đã thấy từ hoặc cụm từ tương tự ngoài lĩnh vực. Đây chỉ là sàng lọc sơ bộ, không phải kết luận |
| Tên miền | Chưa mua |
| Nhãn hiệu, bản quyền, sáng chế | Chưa đăng ký hoặc nộp |
| Tên công ty, app store, mạng xã hội | Chưa kiểm tra đầy đủ |
| Chuyển giao source và điều khoản generated code | Chưa ký |

## B. Trình tự tên (bắt buộc theo đặc tả)

| # | Việc | Người phụ trách | Trạng thái |
|---|---|---|---|
| 1 | Xác định pháp nhân sở hữu. Lập biên bản founder chuyển quyền nếu cần | Chủ dự án | [CHƯA, DEC03] |
| 2 | Tra exact, gần âm, gần hình và bản dịch trong WIPO và cơ sở quốc gia hoặc khu vực. Thuê đại diện sở hữu công nghiệp đánh giá | Đại diện sở hữu công nghiệp | [CHƯA] |
| 3 | Kiểm nhóm hàng hóa và dịch vụ. Nhóm 9 và 42 là điểm khởi đầu, cần luật sư xác nhận. Nhóm 35 chỉ khi hoạt động thực tế thuộc phạm vi | Luật sư | [CHƯA] |
| 4 | Tra app store, tên công ty, tên miền, mạng xã hội. "Không thấy kết quả" không đồng nghĩa với "đã đăng ký" | Chủ dự án, luật sư | [CHƯA] |
| 5 | Nếu rủi ro cao, chốt tên dự phòng qua cùng quy trình. Không chỉ thêm AI vào tên bị trùng | Chủ dự án | [CHƯA] |
| 6 | Phê duyệt đăng ký, phí, chủ thể và thị trường trước khi thao tác | Chủ dự án | [CHƯA] |

## C. Hồ sơ tài sản

Mỗi tài sản cần có owner, người sáng tạo, giấy phép và bằng chứng bàn giao. Không gán bản quyền chỉ vì có ký hiệu ©.

| Tài sản | Owner | Người sáng tạo | Giấy phép hoặc điều khoản | Bằng chứng bàn giao |
|---|---|---|---|---|
| Tên AFTERVIA, logo | [CHƯA] | [CHƯA] | [CHƯA] | [CHƯA] |
| Tên miền | [CHƯA] | Không áp dụng | [CHƯA] | [CHƯA] |
| UI, icon, thiết kế | [CHƯA] | [CHƯA] | [CHƯA] | [CHƯA] |
| Copy landing và store | [CHƯA] | [CHƯA] | [CHƯA] | [CHƯA] |
| Mã nguồn (web, api, mobile, packages) | [CHƯA] | [CHƯA] | [CHƯA] | Lịch sử git và hợp đồng nhà thầu |
| Schema và migration cơ sở dữ liệu | [CHƯA] | [CHƯA] | [CHƯA] | Lịch sử git |
| Workflow và tài liệu thiết kế | [CHƯA] | [CHƯA] | [CHƯA] | [CHƯA] |
| Bộ dữ liệu đánh giá, fixture, ảnh demo | [CHƯA] | [CHƯA] | Tự tạo hoặc có phép | [CHƯA] |

## D. Chuỗi quyền sở hữu (chain of title)

- [ ] Pháp nhân giữ tên miền, repo, tài khoản app store, cloud và hợp đồng nhà cung cấp. [CHƯA, DEC03]
- [ ] Founder, nhân viên và nhà thầu ký văn bản về: phạm vi chuyển quyền, bảo mật, quyền sử dụng dữ liệu, công cụ AI và nghĩa vụ cung cấp source.
- [ ] Lưu bằng chứng đóng góp của con người: lịch sử chỉnh sửa, hợp đồng và biên bản bàn giao.
- [ ] Nhà thầu không dùng tài sản của bên thứ ba khi chưa có phép.
- [ ] Generated code: có văn bản xác nhận quyền sử dụng thương mại, sửa đổi, chuyển giao và tự lưu trữ (self-host) cho toàn bộ phạm vi kỳ vọng. Điều khoản công khai của nhà cung cấp không đủ thay thế văn bản riêng.
- [ ] Không suy quyền sở hữu đầu vào thành quyền sở hữu mọi đầu ra.
- [ ] Quyền đối với đầu ra AI phụ thuộc pháp luật và mức đóng góp của con người. Nguyên tắc bản quyền của Mỹ không tự áp dụng cho các nơi khác.

## E. Câu hỏi cho nhà cung cấp (vendor)

Cần câu trả lời bằng văn bản ràng buộc. Câu trả lời trên trang marketing không thay điều khoản hợp đồng. Ghi ngày, người trả lời và tên hợp đồng.

| # | Câu hỏi | Trả lời | Ngày | Người trả lời | Điều khoản hợp đồng |
|---|---|---|---|---|---|
| 1 | Có xuất đầy đủ source không, gồm server code, migration, assets và lockfile? | | | | |
| 2 | Có quyền build và tự lưu trữ sau khi hủy đăng ký không? | | | | |
| 3 | Ai sở hữu đầu ra và có quyền chuyển nhượng đầu ra không? | | | | |
| 4 | Dữ liệu có dùng để huấn luyện không? Thời gian lưu và nhà cung cấp phụ nào? | | | | |
| 5 | Có DPA, vùng dữ liệu, thông báo sự cố và bằng chứng xóa dữ liệu không? | | | | |
| 6 | Có kiểm thử sao lưu và xuất dữ liệu (exit test) không? | | | | |

## F. Mã nguồn mở và đầu ra AI

- [ ] Tạo SBOM cho sản phẩm. [CHƯA]
- [ ] Phát hiện license và notice của dependency. Rà soát dependency copyleft trước khi phân phối. [CHƯA]
- [ ] Tìm kiếm độ tương đồng mã khi có dấu hiệu sao chép.
- [ ] Không sao chép UI hoặc nhận diện thương hiệu của đối thủ.
- [ ] Không khẳng định mọi đầu ra AI đều không vi phạm.
- [ ] Ảnh, fixture và tài liệu demo phải tự tạo hoặc có phép. Khách cho xem hóa đơn không đồng nghĩa được dùng cho marketing hoặc huấn luyện.

Ghi chú: cảnh báo audit production (`npm audit --omit=dev`) là vấn đề bảo mật riêng, đã được ghi trong PR và không thuộc checklist này.

## G. Không công bố khi chưa có

- Không đưa huy hiệu IP, SOC 2, legal clearance hay cụm "đã đăng ký" lên landing hoặc store.
- Hiện chưa có đăng ký IP, sáng chế, nhãn hiệu, SOC 2 hoặc legal clearance.

## H. Điều kiện để đóng checklist

- DEC01 và DEC03 được chốt bằng quyết định của chủ dự án.
- Luật sư IP xác nhận kết quả mục B và mục D (HUM-WO18-02).
