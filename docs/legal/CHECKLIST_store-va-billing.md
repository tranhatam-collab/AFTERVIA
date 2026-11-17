# CHECKLIST (DRAFT): Store và billing

> **Trạng thái: DRAFT.** Không mở live checkout, không nhập khóa thật, không tạo tài khoản store, không đăng ký listing. DEC09 (live payment và store listing) đang NOT_AUTHORIZED.
> Nguồn: `engineering/11_BILLING_AND_ENTITLEMENTS.md`, `handoff/08_BILLING_SANDBOX.txt`, `brand/04_LANDING_AND_APP_STORE_COPY.md`, `validation/01_ACCEPTANCE_TESTS.csv` (T46).
> Không phải tư vấn pháp lý. Chính sách của từng store và quy định thuế cần kiểm tra trên tài liệu hiện hành, và luật sư từng thị trường phải duyệt.

## A. Trạng thái hiện tại

| Mục | Trạng thái |
|---|---|
| DEC09 Live payment và store listing | NOT_AUTHORIZED |
| Nhà cung cấp thanh toán cho B2B web | Chưa chốt |
| Storefront và thị trường | Chưa chốt |
| Pháp nhân ký hợp đồng thanh toán | Chưa chốt (DEC03) |
| Billing sandbox | Chưa xây; chỉ xây sau khi thiết kế được duyệt |
| Entitlement, webhook, hạn mức | Chưa có; thuộc chuỗi WO11-02 đang BLOCKED |
| Kiểm hủy và xóa trên store thật (T46) | NOT_RUN; cần tài khoản store thật |

Đề xuất giá (USD mỗi tháng, trước thuế, chưa phải giá bán): Personal 0; Family 4,99; Desk 49, 149 và 399. [CHỜ DUYỆT GIÁ]

## B. Phân luồng thanh toán

- [ ] B2B web: dùng nhà cung cấp được chấp thuận cho pháp nhân và thị trường. [CHỜ DEC03, DEC07, DEC09]
- [ ] Mobile Family: dùng cơ chế phù hợp App Store và Google Play theo storefront và loại dịch vụ. [CHỜ luật sư và kiểm tra chính sách hiện hành của từng store]
- [ ] Lớp quản lý đăng ký (ví dụ RevenueCat) có thể dùng nhưng không thay thế nghĩa vụ của store. [CHƯA QUYẾT ĐỊNH]
- [ ] Không hướng dẫn né cơ chế mua trong ứng dụng. Không thêm liên kết nhằm né chính sách.
- [ ] Tiền hoàn của món hàng do cửa hàng hoặc hãng xử lý ngoài hệ thống. Ứng dụng chỉ ghi kết quả có chứng cứ.

## C. Thông tin bắt buộc trước khi mua

- [ ] Giá, kỳ thanh toán và thuế.
- [ ] Tự động gia hạn.
- [ ] Cách hủy.
- [ ] Phần được giữ hoặc mất sau khi hủy.
- [ ] Không hiển thị giá đề xuất như giá đã bán khi chưa được duyệt.

## D. Hủy và xóa (T46)

- [ ] Hủy đăng ký trong ứng dụng và hủy đăng ký trên store là hai việc khác nhau. Hủy gói không tự xóa tài khoản.
- [ ] Xóa tài khoản không mặc nhiên hủy đăng ký trên store khi store yêu cầu thao tác riêng. Khi đó phải hướng dẫn chính xác từng bước.
- [ ] Hết hạn hoặc hủy gói không xóa hồ sơ và không khóa việc xuất dữ liệu.
- [ ] Luồng xóa tài khoản trong ứng dụng và trên web phải khớp với yêu cầu hiện hành của store. [CHỜ kiểm tra tài liệu hiện hành; liên quan WO11-02]
- [ ] Kiểm trên tài khoản store thật, có ảnh màn hình hoặc bước ghi lại, ngày và người thực hiện. **Chưa thực hiện**: cần tài khoản store thật, nằm ngoài vòng lặp tự chủ.

Tiêu chí nghiệm thu T46 theo đặc tả: "Hướng dẫn chính xác, không còn charge trái chính sách."

## E. Kiểm thử sandbox trước khi bật live

Trạng thái: chưa có kiểm thử nào trong danh sách này được chạy.

- [ ] Webhook giả với chữ ký hoặc dấu thời gian sai bị từ chối.
- [ ] Phát lại (replay) sự kiện không tăng hạn mức hoặc ngày thuê bao.
- [ ] Sự kiện đến sai thứ tự được xử lý theo trạng thái authoritative của nhà cung cấp, dùng effective_time hoặc version.
- [ ] Ledger sự kiện có ràng buộc duy nhất theo (provider, event_id).
- [ ] Trạng thái đăng ký được phân biệt: trial, active, grace, past_due, canceled_at_period_end, expired, refunded, disputed.
- [ ] Hoàn tiền, tranh chấp, hạ gói và hủy được kiểm riêng.
- [ ] Xóa tài khoản và hủy đăng ký được kiểm như hai việc khác nhau.
- [ ] Hạn mức đếm phía server. Retry không đếm đôi. Hết hạn mức không tự tính phí vượt (không overage mặc định).
- [ ] Tách tiền khỏi doanh thu: hoàn tiền, thuế, phí và tiền về ngân hàng là các khoản riêng.
- [ ] Có báo cáo đối soát sandbox và danh sách blocker trước khi live.

## F. Đối soát

- Hằng ngày: đối chiếu sự kiện billing với file xuất của nhà cung cấp.
- Hằng tháng: doanh thu, hoàn tiền, phí, quyết toán và tiền về ngân hàng.
- Không dùng số liệu trên giao diện nội bộ làm bằng chứng cho tiền đã vào.

## G. Store listing và khai báo dữ liệu

- [ ] Chỉ mô tả camera, thông báo, xóa tài khoản, chia sẻ và đăng ký khi đã kiểm trên bản phát hành.
- [ ] Không dùng link store giả, email hỗ trợ giả, pháp nhân giả hoặc ảnh sản phẩm giả.
- [ ] Mô tả không hứa bảo hành, hoàn tiền hay tư vấn pháp lý. Khung đang dùng: "AI suggestions require review. AFTERVIA does not decide warranty eligibility, provide legal representation, or guarantee refunds. Features may vary by market and plan."
- [ ] Khai báo quyền riêng tư và dữ liệu với từng store chỉ sau khi thông báo quyền riêng tư được duyệt. Khai báo phải khớp với hành vi thật của bản phát hành.

## H. Thị trường

Mọi thị trường trong `legal/02_GLOBAL_COMPLIANCE_REGISTER.csv` đang DISABLED. Luật sư cần duyệt từng thị trường trước khi mở.

| Thị trường | Chủ đề cần duyệt | Người duyệt theo đăng ký |
|---|---|---|
| Việt Nam | Quyền riêng tư, tiêu dùng, chuyển dữ liệu, thương mại | Luật sư Việt Nam |
| EU/EEA | GDPR, tiêu dùng, quyền sửa chữa, DPP | Luật sư EU và địa phương |
| Anh | UK GDPR, tiêu dùng, chuyển dữ liệu | Luật sư Anh |
| Hoa Kỳ | Quyền riêng tư theo bang, tiêu dùng, bảo hành, store | Luật sư Hoa Kỳ |
| Canada, Singapore, Úc | Chưa nghiên cứu; chưa có nguồn chi tiết trong gói; không mở bán | Luật sư địa phương |

## I. Điều kiện trước khi bật live

- DEC09 được duyệt; nhà cung cấp thanh toán và storefront được chấp thuận.
- Luật sư duyệt điều khoản thương mại, hoàn tiền và thuế (HUM-WO18-02).
- T46 đã chạy trên tài khoản store thật và có bằng chứng.
- Đối soát sandbox có bằng chứng.
- Luồng xóa tài khoản (WO11-02) hoàn tất và khớp chính sách store hiện hành.
- Thông báo quyền riêng tư và điều khoản đã được công bố (HUM-WEB-03).
