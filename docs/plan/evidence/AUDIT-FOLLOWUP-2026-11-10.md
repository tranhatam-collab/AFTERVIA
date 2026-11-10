# Đóng các phát hiện kiểm toán còn mở — 10/11/2026

Vòng lặp hết việc AUTO (`decide` trả STOP), nên lượt này quay lại các phát hiện `[R]` (chỉ báo cáo, chưa
sửa) trong `docs/plan/09_AUDIT_2026-11-10.md`. Mỗi phát hiện được **kiểm lại trong mã trước khi kết luận**,
không tin bản báo cáo.

- `npm run verify`: **exit 0**, 681 pass / 1 bỏ qua (trước lượt này 678). `npm run e2e:web`: **exit 0**.
- Thêm một mục: bài kiểm đua xóa tài khoản được làm mạnh lên (xem mục riêng bên dưới).
- Bảo mật: **chờ reviewer độc lập**.

## Kết quả kiểm từng phát hiện

| Mã | Kết luận sau khi kiểm | Hành động |
|---|---|---|
| **D-03** | **Đã đóng về bản chất, báo cáo nói thiếu một vế.** Nội dung hết hạn **không đọc được** dù purge chưa chạy: hàm đọc kiểm cả `v_job.expires_at <= now()` lẫn `b.expires_at > now()` (`0021:226,233`). Cộng với chặn trên 10 gói sống (0030), rủi ro đã được chặn. Việc còn lại thuần vận hành: chọn nơi chạy purge theo lịch | Không sửa mã. Đã ghi sẵn trong `0030` là việc của người |
| **D-04** | **Có thật, và vòng lặp KHÔNG tự sửa được.** Xem mục riêng bên dưới | Đưa vào hàng đợi quyết định: **D19** |
| **D-10** | **Có thật, nhưng chưa sửa được hôm nay**: *không tồn tại bảng extraction nào*, `extraction_id` là uuid tự do không khóa ngoại, và không route HTTP nào gọi tới hàm | Viết **bẫy** để lỗ hổng không xuất hiện im lặng |
| **D-11** | **Đã đóng từ OWN-A-07.** `restore-drill.mjs:29` gọi `assertTestDatabase`, mà hàm này nay ủy quyền cho `assertLocalTestDatabase` — guard dùng chung, đòi host loopback, không chỉ hậu tố `_test` | Không cần sửa |
| **A-12** | Đã đóng từ OWN-A-15 (regex sink mở rộng) | Không cần sửa |
| **A-14** | **Có thật.** Bốn câu sai trong `docs/dev/LOCAL_MACOS.md` | Đã sửa, xem bên dưới |

## D-10 — biến lời ghi chú thành luật

Migration `0006` tự ghi: *"Hạn chế còn lại: chưa có bảng extraction nên chưa có khóa ngoại và chưa kiểm
quyền sở hữu extraction."* Lời ghi chú đó đúng, nhưng nó không chặn được gì.

Nguy hiểm thật nằm ở tương lai: **ngày ai đó thêm bảng extraction, lỗ hổng ghi chéo tài khoản xuất hiện im
lặng**, vì `record_field_confirmation` vẫn nhận bất kỳ uuid nào.

`tests/security/extraction-ownership-tripwire.test.ts` (3 kiểm thử) ghi lại trạng thái hôm nay và đặt bẫy:

- không có bảng nào tên chứa `extraction` → ghi nhận đúng như thế, **không giả vờ đã an toàn**;
- `field_confirmations.extraction_id` vẫn **không có khóa ngoại** — đây chính là lý do chưa viết được phép kiểm;
- hàm **không gọi được** bởi `anon` lẫn `authenticated` — đây là lý do hôm nay chưa khai thác được.

Khi bảng extraction xuất hiện, bài kiểm đỏ ngay với câu:
`an extraction table now exists (...), so record_field_confirmation must check ownership of extraction_id (D-10)`.

**Đã chứng minh bẫy sập**: tạm thêm một migration tạo bảng `extractions` → **1/3 đỏ** đúng câu trên; gỡ
migration tạm → 3/3 xanh trở lại. Tệp tạm đã xóa (đã kiểm lại không còn trong `supabase/migrations/`).

## D-04 — vì sao vòng lặp dừng lại và hỏi người

Sự thật đã kiểm trong mã:

- `record_upload_inspection` được **`grant execute ... to authenticated`** (`0004_quarantine.sql`), và nằm
  trong danh sách bề mặt khách gọi được của bẫy quyền hàm (0026).
- Hàm nhận trạng thái, lý do, MIME phát hiện và kích thước **từ người gọi**, chỉ kiểm người gọi có phải chủ
  tài liệu. Nghĩa là **người tải tệp lên cũng là người khai tệp đã qua kiểm**.
- `SCANNER_UNAVAILABLE` được chấp nhận y như `CLEAN` ở bốn chỗ: `0005:87`, `0008:211`, `0012:34`, `0013:85`.
- Hôm nay chưa khai thác được, vì chưa có kho byte nên không có tệp thật nào được phục vụ.

Ba cách sửa đều vượt quyền vòng lặp, và lý do nằm trong chính mã:

1. Chặn `SCANNER_UNAVAILABLE` ở các đường dùng → **khóa toàn bộ luồng tài liệu ngay**. Đó là quyết định sản
   phẩm, không phải sửa lỗi.
2. Bắt hàm chỉ cho máy chủ gọi (`assert_server_caller`) → nhưng `withUser` của API đặt
   `set local role authenticated`, nên **chính API cũng không gọi được**. Chỉ dời chỗ nghẽn.
3. Thêm cột "ai xác nhận" → hôm nay không ai đọc, và với dữ liệu tổng hợp thì không có gì để truy ngược.

Điều kiện đủ là **có scanner đã duyệt (INFRA)**, cùng lúc với D16. Đã ghi thành **D19** trong hàng đợi
quyết định, kèm toàn bộ dẫn chứng trên.

## A-14 — tài liệu nói sai bốn chỗ

`docs/dev/LOCAL_MACOS.md` đã sửa:

1. "repo không cài gói playwright" → **sai**: `package.json` ghim `playwright ^1.65.0`.
2. e2e "CI chưa có" → **sai**: job `e2e-web` có trong CI từ `7c852c9`.
3. "`npm run verify` đỏ ở bước audit ... xem blocker trên PR #1" → cổng đó **đã hết đỏ** từ `487d084`.
4. "19 migration" → nay **33**.

Thêm hai thứ vốn thiếu, và chính là nội dung A-14 phàn nàn:

- **bước cài trình duyệt** `npx playwright install chromium` (`npm ci` không tải Chromium);
- cách xử lý lỗi `Executable doesn't exist ... chromium_headless_shell-<số>` (lệch revision), kèm
  `PLAYWRIGHT_BROWSERS_PATH` cho máy đã có sẵn trình duyệt.

Cập nhật thêm: luồng e2e nay có bước xóa tài khoản (T25), và điều kiện thoát 0 gồm **cả lỗi console**, không
chỉ lỗi trang.

## Sức mạnh test — bài kiểm đua xóa tài khoản (kiểm toán xếp "trung bình: không có barrier")

Kiểm toán đúng, và vấn đề nặng hơn chữ "trung bình" gợi ý.

Bản cũ dùng `Promise.all` hai lời gọi độc lập. Node có thể chạy xong cái thứ nhất **trước khi** bắt đầu cái
thứ hai, nên hai giao dịch không hề chồng nhau. Khi đó khẳng định "đúng một cái bị từ chối" vẫn đúng **dù
khóa tập owner có tồn tại hay không** — tức là bài kiểm xanh trong cả trường hợp nó sinh ra để bắt.

Bản mới đỗ một giao dịch mở, gọi cái thứ hai, rồi **khẳng định cái thứ hai còn treo** trong lúc cái đầu chưa
commit. Đó mới là bằng chứng hai bên thật sự tranh nhau. Sau khi commit, cái thứ hai mới đọc được trạng thái
đã commit và bị từ chối `55000`; kiểm thêm rằng chỉ một tombstone được tạo.

**Đã chứng minh bản mới bắt được, bản cũ thì không.** Gỡ `for update` khỏi phần khóa tập owner trong `0028`:

- bản mới **đỏ** đúng câu `the second owner must block on the owner-set lock ... expected 'settled' to be 'pending'`;
- bản cũ sẽ vẫn xanh trong đúng tình huống đó, vì hai lời gọi tuần tự vẫn cho "đúng một cái bị từ chối".

Khôi phục `0028`: sha256 khớp bản gốc; chạy lại 8/8.

Ghi chú về mã: đường xóa tài khoản **đã có** khóa tập owner từ `0020` (giữ nguyên ở `0028`), nên đây là
sửa **bài kiểm**, không phải sửa lỗi. Không có thay đổi nào trong `supabase/migrations/` ở lượt này.

## Giới hạn

1. **CI chưa xác nhận lượt này.** Run cho `48f9ed7` đỏ cả ba job trong 2 giây, không bước nào chạy, log 404 —
   dấu hiệu hạ tầng, không phải nội dung. Tôi không có quyền chạy lại (403) và đã ghi một comment trên PR #1.
   Các commit sau đó, gồm commit này, cũng sẽ không có CI cho tới khi chủ dự án xử lý.
2. **D-04 vẫn mở.** Không có thay đổi mã nào trong lượt này chạm vào nó.
3. Bẫy D-10 chỉ dò theo **tên bảng chứa `extraction`** và vài dấu hiệu chuỗi trong thân hàm. Một bảng đặt tên
   khác hẳn sẽ lọt. Đây là bẫy, không phải chứng minh.
