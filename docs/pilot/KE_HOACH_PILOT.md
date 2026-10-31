# Kế hoạch pilot 5–10 cửa hàng (DRAFT, WO19-01)

> **Trạng thái: DRAFT kế hoạch. Chưa chạy pilot.** Không có cửa hàng nào tham gia, không có dữ liệu thật, không có baseline và không có kết quả. Không phê duyệt nào được coi là đã có.
> Nguồn đặc tả: `validation/03_EXPERIMENT_REGISTER.csv` (E02, E03); `validation/02_RELEASE_GATES.md` (mục tiêu pilot, phê duyệt, G3); `research/04_DEMAND_VALIDATION.md` (baseline); `strategy/01_PRODUCT_THESIS_AND_MOAT.md` (điều kiện thử thắng); `ops/01_OPERATING_MODEL_AND_SUPPORT.md` (hỗ trợ và theo dõi); `product/05_ROADMAP_90D_24M.md` (ngày 46–60).
> Con số trong tệp này hoặc lấy từ đặc tả (có nguồn) hoặc là đề xuất (ghi rõ). Mục chưa có quyết định ghi [CHỜ CHỦ DỰ ÁN] hoặc [CHỜ LUẬT SƯ].

## 1. Giả thuyết và cách quyết định

| Thí nghiệm | Giả thuyết | Mẫu | Quy tắc quyết định (đặc tả) | Lưu ý (đặc tả) | Cửa sổ |
|---|---|---|---|---|---|
| E02 | Onboarding đủ nhẹ | 5 cửa hàng pilot | Hồ sơ thật đầu tiên không cần kỹ sư hỗ trợ | Đo median và p90; giảm phạm vi nếu chưa đạt | 30 ngày |
| E03 | Tiếp nhận tốt hơn | ≥200 hồ sơ đủ điều kiện, tổng cộng | Giảm ≥30% phút tiếp nhận; giảm ≥20% số lần hỏi lại | Không khẳng định nhân quả nếu không đối chiếu | 30 ngày |

- E02 chưa chốt cách đếm: "tất cả 5 cửa hàng" hay "một tỷ lệ". [CHỜ CHỦ DỰ ÁN xác nhận trước khi chạy].
- E03 chưa chốt mức so sánh: trung vị hay tổng phút. [CHỜ CHỦ DỰ ÁN]. Đề xuất: so trung vị với baseline cùng loại hồ sơ.
- Điều kiện thử thắng của đặc tả chiến lược có thêm: không tăng lỗi quyền lợi. Nếu lỗi quyền lợi tăng, E03 không được coi là thắng, dù phút tiếp nhận giảm.

## 2. Điều kiện trước khi bắt đầu

Không bắt đầu pilot khi chưa đủ tất cả điều kiện dưới đây. Mọi dòng hiện chưa đạt.

| # | Điều kiện | Nguồn | Trạng thái |
|---|---|---|---|
| 1 | Luật sư duyệt theo quốc gia; store và billing được duyệt (G3) | HUM-WO18-02; `validation/02` G3 | Chưa |
| 2 | Quốc gia pilot được chọn; country pack ENABLED sau duyệt pháp lý | DEC07; `packs/countries/` | DISABLED |
| 3 | Dùng tài liệu khách thật được phép | DEC08 | NOT_AUTHORIZED |
| 4 | Pilot có phép và dữ liệu thật được duyệt riêng | HUM-WO19-02; `docs/plan/00_EXECUTION_PLAN.md` | Chưa |
| 5 | Pilot profile đã công bố: số yêu cầu, số người dùng đồng thời, mẫu thao tác | T40; HUM-WO19-02 | Chưa |
| 6 | Đồng ý của từng cửa hàng và của người dùng cuối, có văn bản | HUM-WO19-02 ("đồng ý của người dùng"); `research/04` ("nếu được phép") | Chưa |
| 7 | Thiết bị thật, nếu cửa hàng dùng ứng dụng di động | DEV-01 | Chưa |
| 8 | Người vận hành và người hỗ trợ có tên và lịch trực | `ops/01`; rủi ro R10 | Chưa |
| 9 | Phê duyệt tách riêng cho: hoạt động, ngân sách, dữ liệu thật, nhà cung cấp, thanh toán, quốc gia, phát hành; mỗi cái có phạm vi, hạn và người duyệt | `validation/02` (mục Approval) | Chưa |
| 10 | Pilot chỉ trả tiền sau khi được phép | `validation/02` G3 ("pilot có trả tiền sau phép") | DEC09 NOT_AUTHORIZED |

## 3. Phạm vi và đối tượng

- Số cửa hàng: 5–10. E02 dùng 5; E03 cần ít nhất 200 hồ sơ đủ điều kiện tổng cộng.
- Hồ sơ đủ điều kiện: [CHỜ CHỦ DỰ ÁN định nghĩa]. Đề xuất: hồ sơ thuộc loại hàng trong phạm vi MVP, và cửa hàng có quyền đưa vào đo.
- Loại trừ theo bản nháp điều khoản (`docs/legal/DRAFT_dieu-khoan.md`, mục 2): y tế, ô tô, tín dụng, bảo hiểm, tranh chấp pháp lý, thiết bị có nguy cơ gây hại, mua bán đồ cũ.
- Người dùng cuối từ 18 tuổi trở lên theo bản nháp thông báo quyền riêng tư (`docs/legal/DRAFT_quyen-rieng-tu.md`, mục 8). Khách không đưa dữ liệu trẻ em vào hồ sơ.
- Chọn cửa hàng: [CHỜ CHỦ DỰ ÁN]. Đề xuất tiêu chí: có người đầu mối; đồng ý bằng văn bản; đủ hồ sơ để có ít nhất 20 hồ sơ baseline.

## 4. Baseline (đo trước khi dùng AFTERVIA)

Theo `research/04_DEMAND_VALIDATION.md`:

- Lấy ít nhất 20 hồ sơ đã kết thúc trên mỗi cửa hàng tham gia đo, nếu được phép.
- Ghi cho từng hồ sơ: thời gian tiếp nhận; số lần thiếu chứng từ; số lần hỏi trạng thái; số phút nhân viên thực sự thao tác; thời gian đóng; tỷ lệ mở lại.
- Gắn loại hồ sơ, độ khó và mùa vụ.
- Không so hồ sơ dễ trên AFTERVIA với hồ sơ khó của quy trình cũ. So cùng loại và cùng độ khó.
- Baseline và pilot dùng cùng định nghĩa thời điểm bắt đầu và kết thúc. Ghi định nghĩa trong cột `measure_method` của sổ đo.

So sánh với ít nhất hai sản phẩm gần nhất (`strategy/01`) nằm ngoài WO19-01 và không được làm trong tài liệu này.

## 5. Sổ đo thao tác

- Tệp: `docs/pilot/SO_DO_THAO_TAC.csv`. Hiện chỉ có dòng tiêu đề, không có dữ liệu.
- Mỗi dòng là một hồ sơ, thuộc `baseline` hoặc `pilot` (cột `phase`).
- Không ghi tên người, số điện thoại, địa chỉ, số serial, ảnh chứng từ hoặc nội dung tự do có dữ liệu cá nhân. Mã hồ sơ và mã cửa hàng là mã nội bộ.
- Ngoại lệ, hồ sơ tranh chấp và lỗi được ghi lại, không xóa để làm đẹp số liệu (`ops/01`).
- Chỉ lưu dữ liệu thật sau khi có đồng ý tương ứng và sau khi DEC08 cho phép. Trước đó chỉ dùng dữ liệu tổng hợp.

Định nghĩa cột (đề xuất):

| Cột | Ý nghĩa |
|---|---|
| `case_code` | Mã hồ sơ nội bộ, không suy được từ tên thật |
| `store_code` | Mã cửa hàng nội bộ |
| `phase` | `baseline` hoặc `pilot` |
| `case_type`, `difficulty`, `season` | Loại, độ khó và mùa vụ, để so cùng loại |
| `received_at`, `closed_at` | Thời điểm tiếp nhận và đóng (ISO 8601); để trống nếu chưa đóng |
| `intake_minutes` | Thời gian từ tiếp nhận đến hồ sơ sẵn sàng xử lý |
| `staff_minutes` | Phút nhân viên thực sự thao tác cho hồ sơ |
| `missing_doc_count`, `status_ask_count` | Số lần thiếu chứng từ và số lần hỏi trạng thái |
| `reopen_flag`, `engineer_help_flag`, `rights_error_flag`, `exception_flag` | Cờ 0 hoặc 1 |
| `measure_method`, `measurer_role` | Cách đo và vai trò người đo |
| `consent_ref` | Tham chiếu văn bản đồng ý, không chứa nội dung đồng ý |
| `note` | Ghi chú không có dữ liệu cá nhân |

## 6. Chỉ số và cách tính

| Chỉ số | Cách tính | Dùng cho | Ghi chú |
|---|---|---|---|
| Thời gian onboarding đến hồ sơ thật đầu tiên | Từ lúc cửa hàng tạo tài khoản đến khi hồ sơ thật đầu tiên đóng mà không cần kỹ sư hỗ trợ | E02 | Median và p90 theo cửa hàng và toàn nhóm |
| Số lần cần kỹ sư hỗ trợ | Đếm ticket hỗ trợ kỹ thuật can thiệp | E02 | Mỗi ticket có mức độ, người phụ trách, thời điểm cập nhật tiếp theo |
| Phút tiếp nhận | Tổng `staff_minutes` cho bước tiếp nhận của mỗi hồ sơ | E03 | So với baseline cùng loại; mức so sánh xem mục 1 |
| Số lần hỏi lại | `missing_doc_count` + `status_ask_count` | E03 | Đề xuất; so với baseline cùng loại |
| Lỗi quyền lợi | Số hồ sơ có `rights_error_flag = 1` | Điều kiện thử thắng | Phải không tăng so với baseline |
| Tỷ lệ mở lại | Hồ sơ có `reopen_flag = 1` chia tổng hồ sơ đã đóng | Chất lượng | |
| Ngoại lệ đối soát và tranh chấp | Số dòng có `exception_flag = 1` | Chất lượng | Báo cáo cùng tốc độ |

Không báo cáo tốc độ mà thiếu lỗi quyền lợi, ngoại lệ và tỷ lệ mở lại. Đặc tả yêu cầu: "lưu các ngoại lệ và chỉ số chất lượng, không chỉ tốc độ đóng case".

## 7. Tiêu chí dừng

Đề xuất, chưa được chủ dự án duyệt. Số trong ngoặc vuông do chủ dự án đặt.

Dừng ngay, cho cả pilot hoặc phạm vi của một cửa hàng:

1. Rò dữ liệu giữa các tổ chức, đăng nhập sai tổ chức, hoặc lệnh có thể xóa dữ liệu thật. Áp dụng cùng mục 6 của `docs/plan/01_LOOP_PROTOCOL.md`.
2. Cửa hàng yêu cầu dừng hoặc rút đồng ý: ngừng xử lý dữ liệu của cửa hàng đó, và xử lý xóa hoặc xuất theo quy trình.
3. Thu tiền hoặc thanh toán ngoài kế hoạch đã duyệt.
4. Lỗi P0 chưa có cách khắc phục sau [CHỜ CHỦ DỰ ÁN: số giờ].

Dừng hoặc đổi phạm vi khi đo:

5. E02: hồ sơ thật đầu tiên cần kỹ sư hỗ trợ theo cách đếm đã chốt. Không mở rộng số cửa hàng cho đến khi xử lý nguyên nhân.
6. E03: sau cửa sổ đo đủ, không đạt ≥30% phút tiếp nhận hoặc ≥20% số lần hỏi lại so với baseline cùng loại. Ghi kết quả không đạt. Không đổi tiêu chí sau khi đã thấy số liệu.
7. Lỗi quyền lợi tăng so với baseline. Dừng tính năng liên quan cho đến khi có nguyên nhân và kiểm chứng.
8. Hỗ trợ vượt sức: tỷ lệ ticket quá hạn vượt [CHỜ CHỦ DỰ ÁN] trong [CHỜ CHỦ DỰ ÁN: số tuần] liên tiếp. Tạm ngừng nhận cửa hàng mới.
9. Ngoại lệ đối soát không xử lý được sau [CHỜ CHỦ DỰ ÁN: số ngày].
10. Chi phí vượt giới hạn do chủ dự án đặt. Tạm dừng tác vụ AI cho đến khi có duyệt.

Nguyên tắc diễn giải: không ngoại suy từ vài tuần sang một năm; không khẳng định nhân quả nếu không đối chiếu; LOI (thư ý định) không tính là doanh thu.

## 8. Hỗ trợ và theo dõi

- Giờ làm việc công bố và SLA chi tiết: `docs/pilot/SLA_HO_TRO.md`.
- Hằng ngày: lỗi P0, dữ liệu và rủi ro, hồ sơ bị kẹt, cost cap, ngoại lệ đối soát (`ops/01`).
- Hằng tuần: kích hoạt của cohort, cửa hàng hoạt động, lý do rời bỏ, phút hỗ trợ, sửa đổi của AI, xu hướng lỗi, backlog (`ops/01`).
- Lịch theo roadmap: ngày 46–60 cho 5–10 cửa hàng, baseline và đo thao tác. E04 và E06 thuộc WO19 nhưng không nằm trong WO19-01.

## 9. Phê duyệt

Mỗi dòng cần phạm vi, hạn và người duyệt. Tất cả dòng hiện chưa được duyệt.

| Hoạt động | Phạm vi | Hạn | Người duyệt | Trạng thái |
|---|---|---|---|---|
| Pilot với cửa hàng thật | [CHỜ CHỦ DỰ ÁN] | [CHỜ] | [CHỜ] | Chưa |
| Dữ liệu tài liệu khách thật | DEC08 | [CHỜ] | [CHỜ] | NOT_AUTHORIZED |
| Quốc gia pilot | DEC07 | [CHỜ] | [CHỜ] | DISABLED |
| Ngân sách pilot | [CHỜ CHỦ DỰ ÁN] | [CHỜ] | [CHỜ] | Chưa |
| Nhà cung cấp AI | DEC06 | [CHỜ] | [CHỜ] | NOT_APPROVED |
| Thanh toán | DEC09 | [CHỜ] | [CHỜ] | NOT_AUTHORIZED |

## 10. Trạng thái hiện tại

- Chưa có cửa hàng tham gia. Chưa có baseline. Chưa có hồ sơ nào trong sổ đo.
- E02 và E03: NOT_STARTED trong `validation/03_EXPERIMENT_REGISTER.csv`. Tài liệu này không đổi trạng thái đó.
- Đây là bản chuẩn bị. Nó không phải bằng chứng của pilot.
