# Hai gói chuẩn bị cho chủ dự án — 10/11/2026

Chủ dự án nhắn **"All"**: làm cả hai việc đã đề xuất — gói cho luật sư (gỡ `HUM-LEGAL-DEL-01`) và bản
quyết định kho byte (gỡ `WO10-03d` / DEC06). Cả hai là **chuẩn bị**, không phải quyết định: vòng lặp không
tự chọn phương án nào và không tự ký thay ai.

- Bảo mật: **chờ reviewer độc lập**.
- `npm run verify`: **exit 0**. Quét bí mật 574 tệp. **677 pass**, 1 bỏ qua (trước hai gói này là 662). `test:loop` 27/27.

---

## Gói 1 — Danh mục xóa và giữ lại, cho luật sư (`HUM-LEGAL-DEL-01`)

### Vấn đề thật của một danh mục viết tay

`WO11-02c` (03/11) đã có bản đề xuất tốt, nhưng bảng kiểm kê trong đó liệt kê **7 bảng**. Lược đồ hôm nay
có **32 bảng**. Nghĩa là nếu luật sư ký vào bản 03/11, chữ ký đó phủ chưa tới một phần tư hệ thống, và
không ai nhận ra. Đó không phải lỗi của người viết; đó là bản chất của một danh mục viết tay trong một
dự án đang lớn.

Nên gói này đổi cách làm:

- **Phân loại dữ liệu cá nhân là phán đoán của con người** → khai báo trong `tools/legal/deletion-catalogue.mjs`.
- **Lược đồ là sự thật** → đọc từ cơ sở dữ liệu.
- **Kiểm thử so hai bên.** Thêm một bảng mà không phân loại thì đỏ. Chữ ký của luật sư vì thế không âm
  thầm lạc hậu: nó lạc hậu một cách *ồn ào*.

### Đã làm

| Tệp | Nội dung |
|---|---|
| `tools/legal/deletion-catalogue.mjs` | Bản khai báo 32 bảng (mức dữ liệu cá nhân, cơ chế chỉ-thêm, việc làm khi xóa, thời hạn giữ, ghi chú); `inventory` đọc lược đồ thật; `diffCatalogue` so hai bên; `renderCatalogue` sinh tài liệu |
| `docs/legal/DRAFT_danh-muc-xoa-va-giu-lai.md` | 122 dòng, **sinh từ mã**, không viết tay. Mở đầu bằng việc luật sư phải quyết, rồi mới tới bản kiểm kê đầy đủ |
| `tests/legal/deletion-catalogue.test.ts` | 16 kiểm thử |

### Con số mà gói này nói ra

- **28 trên 32 bảng chưa có quyết định** về việc xóa hoặc thời hạn giữ.
- **6 bảng rủi ro cao** — mang nhiều hơn mã định danh *và* chưa có quy tắc xóa:
  `billing_events`, `break_glass_requests`, `case_event_reasons`, `documents`,
  `field_confirmation_values`, `items`.
- **11 bảng chỉ cho thêm**, qua **ba** hàm trigger khác nhau.

### Một lỗi của chính tôi, bắt được trước khi nó vào tài liệu pháp lý

Lần kiểm kê đầu tôi chỉ tìm trigger `forbid_append_only_mutation`, nên đếm **9** bảng chỉ-thêm. Thực tế có
**11**: `audit_events` dùng `forbid_audit_mutation` và `field_confirmations` dùng
`forbid_field_confirmation_mutation`. Nếu không kiểm lại, tài liệu gửi luật sư sẽ nói sai về cơ chế bảo vệ
hai bảng — trong đó một bảng là nhật ký kiểm toán. `APPEND_ONLY_FUNCTIONS` nay liệt kê cả ba, và có kiểm
thử khẳng định đúng hai bảng kia dùng đúng hai hàm riêng.

### Đột biến (bẫy có thật sự sập không)

- **M1** — bỏ một bảng khỏi bản khai báo (giả lập một bảng mới chưa ai phân loại): **1/15 đỏ**. Đây là bẫy chính.
- **M2** — chỉ tìm một hàm chỉ-thêm (lặp lại đúng lỗi của tôi): **3/15 đỏ**.
- **M3** — `diffCatalogue` không bao giờ báo bảng chưa khai: **1/15 đỏ**.
- **M4** — danh sách rủi ro cao luôn rỗng: **1/15 đỏ**.
- Khôi phục: sha256 khớp bản gốc; chạy lại 15/15.
- Thêm một phép thử riêng cho bẫy "tài liệu cũ": sửa một chữ trong tệp đã commit → **1/16 đỏ**; khôi phục → 16/16.

### Việc của con người, không phải của vòng lặp

Luật sư điền: với mỗi bảng, **xóa / che nội dung / giữ lại**; nếu giữ thì **bao lâu**, **căn cứ pháp lý
nào**, **ai được xem**. Ô ký ở mục 5 của tài liệu. Khi có bản ký, đội kỹ thuật cập nhật bản khai báo theo
đúng bản ký, và kiểm thử sẽ canh.

---

## Gói 2 — Kho byte cho tài liệu (`WO10-03d`, DEC06)

### Tôi KHÔNG viết lại bản đề xuất, vì đã có một bản tốt

`docs/plan/evidence/WO10-03d-prep.md` (06/11) đã có ba phương án A/B/C, ưu điểm, hệ quả, khuyến nghị và ô
quyết định để trống. Viết lại là làm việc vô ích và tính tiền hai lần. Thay vào đó tôi gỡ những thứ thật
sự đang chặn việc *ghi được* một quyết định.

### Chặn 1: quyết định này không có mặt trong hàng đợi quyết định

`docs/plan/06_DECISION_QUEUE.md` có D1–D15. Kho byte **không có trong đó** — tức là một việc đang chặn
`WO10-03d` lại không nằm ở nơi chủ dự án vào xem để quyết. Đã thêm:

- **D16** kho byte cho tài liệu (chặn WO10-03d);
- **D17** cách trả liên kết tải gói xuất (chặn HUM-WO10-03a);
- **D18** danh mục xóa, trỏ sang Gói 1 (chặn HUM-LEGAL-DEL-01 và WO20-01).

### Chặn 2: mã DEC06 trỏ vào hai việc khác nhau, với hai trạng thái khác nhau

`06_DECISIONS_DELEGATED.md` dùng **DEC06** cho cả lưu trữ tệp (**CHỜ NGƯỜI**) và AI (**QUYẾT**: giữ tắt).
Đặc tả bất biến `ops/03_FOUNDER_DECISIONS.md` chỉ có một DEC06 = "Vendor AI/data region và privacy"
(NOT_APPROVED) và **không có mục nào cho lưu trữ tệp**.

Hệ quả thực tế: câu "duyệt DEC06" là không rõ nghĩa, và một trong hai việc đã được quyết từ trước.
Đã ghi rõ sự trùng mã vào ledger, **giữ nguyên cả hai dòng cũ** (chúng là hồ sơ), và chuyển việc kho byte
sang theo dõi ở D16. **Không sửa đặc tả** — đặc tả là bất biến và `check:bundle` vẫn báo 69/69 khớp.
Việc cấp mã chính thức là quyết định của chủ dự án.

### Chặn 3: ba dữ kiện mới, phát hiện sau ngày 06/11

Đã ghi vào hàng đợi ngay dưới bảng, vì chúng đổi cách cân nhắc:

1. **Xóa hàng `documents` không xóa tệp.** Bản kiểm kê pháp lý 10/11 xếp `documents` vào nhóm rủi ro cao
   đúng vì thế. Kho được chọn **phải** xóa được tệp trong một thời hạn, và thời hạn đó là câu hỏi của
   luật sư (D18). Hai quyết định này dính nhau, trước đây không ai ghi.
2. **Versioning và xóa mềm là bẫy.** WO16-01b đã đo được điều này trên bản sao lưu. Kho object bật
   versioning hoặc thùng rác mặc định sẽ có đúng vấn đề đó → tiêu chí mới: **xóa cứng được, tắt được versioning**.
3. **Phương án B nay có tiền lệ trong repo**: `export_bodies` (sửa được, hạn 24 giờ, có hàm dọn). Hình dáng
   triển khai đã biết và chi phí sao lưu đo được. Điều này **không** làm B tốt hơn A cho dữ liệu thật.

---

## Giới hạn của cả hai gói

1. **Không gói nào là một quyết định.** Mọi ô quyết định để trống. Vòng lặp không chọn phương án và không
   ký thay luật sư.
2. **Bản khai báo mức dữ liệu cá nhân là phán đoán kỹ thuật, chưa qua luật sư.** Ví dụ `organizations.legal_name`
   tôi xếp là mã định danh pháp nhân, nhưng với hộ kinh doanh cá thể nó có thể là tên người — đã ghi trong ghi chú.
3. **Kiểm kê chỉ phủ cơ sở dữ liệu.** Byte tệp ở kho ngoài chưa chọn, nhật ký ứng dụng, và bản sao lưu nằm
   ngoài phạm vi bảng này. Tài liệu nói rõ ở mục 4.
4. **Chưa có nhà cung cấp nào được liên hệ**, chưa có tài khoản nào được tạo, chưa có hợp đồng xử lý dữ liệu nào.
