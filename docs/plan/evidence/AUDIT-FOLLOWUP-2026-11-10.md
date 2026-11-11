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

## Lượt /loop tiếp theo: A-06 và bundle di động thật

**A-06 — đã đóng, không cần sửa.** Kiểm lại trong mã: `image-size` không còn trong `package-lock.json`
(không có khóa nào chứa tên này), và `expo` nằm trong `dependencies` (đính chính 10/11 của WO24-01).
Commit nâng cấp Expo SDK 58 (`11ebd66`) không nằm trên nhánh này, nhưng cây phụ thuộc hiện tại đã
không còn `image-size` nên lỗ hổng "devDependency bị `--omit=dev` bỏ sót" không còn tồn tại.

**Bundle Android thật — lỗ hổng được bịt.** `typecheck:mobile` không thấy lỗi phân giải module lúc chạy.
Mã di động import giá trị runtime từ `@aftervia/domain` (`draft.ts`, `request-deletion.ts`, `privacy.tsx`),
và `@aftervia/*` không có `workspaces`, chỉ phân giải qua `paths` của tsconfig. Lần bundle thật đầu tiên
(`npx expo export --platform android`): exit 0, 1283 module, và mọi chuỗi đặc trưng của WO11-03 nằm trong
bundle (`/v1/account/deletion`, `primary_data_erasure`, `LEGAL_PENDING`,
`tombstone_registry_outside_backup`, `isDeletionRequestId`).

`tools/checks/mobile-bundle.mjs` đóng gói việc đó (`npm run check:mobile-bundle`), **không** đưa vào
`npm run verify`: thêm một bước vào cổng là quyết định phạm vi, chờ chủ dự án duyệt.

Kiểm chứng công cụ:
- dương tính: `mobile bundle OK: 1 Android bundle(s), 2871646 bytes, 4/4 markers present`, exit 0;
- M1 — chuỗi không có trong bundle (`--require=ZZZ_...`) → exit 1, liệt kê đúng chuỗi thiếu;
- M2 — import `@aftervia/domain` trong `request-deletion.ts` bị đổi thành gói không tồn tại → Metro báo
  `Unable to resolve module` → exit 1. File khôi phục, sha256 khớp, chạy lại xanh.

**Ghi chú về môi trường.** Lần `verify` đầu đỏ với 8 test và 329 bị bỏ qua, nguyên nhân là Postgres đã tắt
sau khi môi trường đổi thư mục làm việc (log có `ECONNREFUSED`). Khởi động lại `service postgresql start`
rồi chạy lại: `verify` exit 0, 681 đạt / 1 bỏ qua.

## Lượt "hoàn tất những gì còn lại": D-09, D-03, A-05, WO20-01

**D-09 — đã đóng (phần còn thiếu: iss và aud).** `verifyHs256` nhận `expectedIssuer` và `expectedAudience`; khi
đặt, token thiếu hoặc sai là bị từ chối bằng `bad_iss` / `bad_aud`. Máy chủ luôn đặt hai giá trị này khi xác
thực phiên. Mọi phiên cục bộ được ký qua một hàm duy nhất, `signLocalSession`, nên không còn chỗ nào ký ra phiên
thiếu nhà phát hành (đã kiểm: không còn lời gọi `signHs256` nào tạo phiên hợp lệ ngoài hàm này).
- Test đỏ trước: 8/17 đỏ (unit và HTTP). Sau khi sửa: `tests/api` 112/112, typecheck sạch.
- Đột biến: bỏ kiểm `iss` ở máy chủ → 1/17 đỏ (ca "token của nhà phát hành khác"); làm kiểm `aud` luôn đúng →
  3/17 đỏ. Khôi phục, sha256 khớp.
- Giới hạn: phiên vẫn là mô phỏng (DEC03 chưa chọn nhà cung cấp). Hai giá trị `aftervia-local` và `authenticated`
  đặt theo mặc định phiên của nhà cung cấp kiểu Supabase, để khi đổi nhà cung cấp thì chỉ đổi giá trị.

**D-03 — đã đóng phần kỹ thuật; lên lịch là hạ tầng (D21).** `tools/db/purge-export-bodies.mjs` chạy
`purge_expired_export_bodies()` từ dòng lệnh, đọc `DATABASE_URL` từ môi trường, in JSON `{"purged": n}`, thoát 0/1/2.
Không in chuỗi kết nối: lỗi kết nối chỉ in mã lỗi.
- Test đỏ trước: 3/4 đỏ. **Ca thứ tư lúc đầu xanh vì lý do sai**: file script chưa tồn tại làm Node thoát 1 và
  không in secret, nên test kiểm được "mã thoát 1 và không lộ chuỗi" nhưng không kiểm được "lỗi kết nối". Đã siết lại
  để đòi đúng thông báo `cannot connect`, rồi mới thấy nó đỏ. Ghi lại vì nó cho thấy một test có thể xanh mà không
  kiểm gì.
- Đột biến: nuốt lỗi kết nối (trả 0) → 1/4 đỏ; in chuỗi kết nối ra → 1/4 đỏ; ghi sai số đã dọn → 1/4 đỏ. Khôi phục,
  sha256 khớp, 4/4 xanh.

**A-05 — đã đóng sau khi tái lập bằng chứng; thời lượng là lỗi ghi nhận.**
- Cơ chế: `finished_at − started_at` cho bốn task là 0,04–0,50 giây. `start` và `done` được ghi liền nhau, nên trường
  này không đo thời gian làm việc. Không kết luận được từ metadata rằng công việc có thật hay không, nên đã chạy lại bằng chứng:
  - WO25-01: `tests/api/contract.test.ts` **18/18** trên DB thật (khớp).
  - WO23-01: `tools/loop/backlog.test.mjs` **21/21** hôm nay (lúc ghi là 14; số tăng do test budget/deps thêm sau đó).
  - WO24-01: SBOM có **26** phụ thuộc trực tiếp (khớp), đường `expo > @expo/metro > metro > image-size` (khớp).
    **Sai lệch:** bằng chứng ghi "794 gói", nhưng đếm được **782** cặp tên@phiên bản duy nhất. Chưa rõ do cách đếm
    hay do sai lệch thật; ghi nhận, không sửa lịch sử.
  - AV-DQ-05-FIX: e2e được chạy lại trong lượt này (xem bên dưới).
- Việc cần sửa là quy trình: `start` phải được ghi **trước khi** làm việc, không phải ngay trước `done`. Không sửa dữ liệu
  lịch sử của bốn task.

**WO20-01 — chuẩn bị xong, task vẫn TODO.** `docs/plan/evidence/WO20-01-prep.md`: bảng kiểm G4 với trạng thái thật,
kịch bản rollback (chưa chạy trên staging). Kết luận: G4 không đạt; không mục nào do vòng lặp tự đóng.
Phát hiện đáng chú ý: **không có migration đảo ngược nào** (rollback dữ liệu chỉ là khôi phục từ bản sao lưu), và
**không có script khôi phục cho production**.

**Quyết định mới cho chủ dự án** (trong `06_DECISION_QUEUE.md`): D20 đưa bundle di động vào `verify`; D21 nơi và lịch
chạy purge; D22 cho phép CI chạy thủ công.
