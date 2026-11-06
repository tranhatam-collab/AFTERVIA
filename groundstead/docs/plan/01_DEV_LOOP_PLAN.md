# Groundstead — Kế hoạch build và giao thức vòng lặp phát triển

Ngày 06/11/2026 · Áp dụng cho thư mục `groundstead/` (tạm trên nhánh làm việc của repo AFTERVIA) và sau đó cho repo `tranhatam-collab/groundstead`. Mỗi vòng lặp bắt đầu bằng việc đọc tệp này.

Kế hoạch sản phẩm: `00_MASTER_PLAN.md`. Backlog: `backlog.json`. Nghiệm thu: `02_ACCEPTANCE.csv`. Quyết định: `03_DECISIONS.md`. Trạng thái hiện tại: `05_STATUS.md`.

---

## 1. Mục tiêu và định nghĩa xong

| Mức | Định nghĩa |
|---|---|
| Một task xong | Lệnh `npm run verify` thoát 0 trên commit; kiểm thử mang mã GT của task chạy thật và đạt; có tệp `docs/evidence/<TASK-ID>.md`; `node tools/loop/backlog.mjs done <id> --evidence "..."` thành công. |
| Một cổng xong (về kỹ thuật) | Task rà cổng (`GS-G1`, `GS-G2`, `GS-G3`) DONE với báo cáo nêu từng điều kiện ở §15.2 của kế hoạch là đạt, chưa đạt, hay chờ chủ dự án. |
| Phần máy làm được xong | `decide` trả `STOP_HANDOFF`: mọi task AUTO/AUTO_PREP/AUTO_EXT đều DONE; phần còn lại là việc chỉ người làm được. |

Không có "PASS" khi chưa có lần chạy thật. Kiểm thử bị bỏ qua là `NOT_RUN`.

---

## 2. Repo và tách repo

**Hiện tại:** repo `tranhatam-collab/groundstead` chưa tồn tại (thử gắn ngày 06/11/2026: không tìm thấy). Toàn bộ dự án nằm trong `groundstead/` trên nhánh `ccr-8dbbf147-1ge7hc` của repo AFTERVIA. Thư mục này tự đóng gói: có `package.json`, công cụ và tài liệu riêng; không import gì từ AFTERVIA; mọi đường dẫn trong công cụ tính từ gốc `groundstead/`.

**Khi chủ dự án tạo repo (GS-H01)**, task `GS-001` chạy:

```bash
git subtree split --prefix=groundstead -b groundstead-export   # giữ nguyên lịch sử của thư mục
git push https://github.com/tranhatam-collab/groundstead.git groundstead-export:main
```

Sau đó vòng lặp chuyển sang làm việc trong repo mới, trên một nhánh làm việc riêng, kèm PR nháp; thư mục `groundstead/` trong AFTERVIA được giữ nguyên cho đến khi chủ dự án quyết định xóa. Đẩy lên `main` của repo mới chỉ một lần để tạo nhánh gốc, vì repo trống chưa có nhánh nào.

**CI:** trong lúc còn ở AFTERVIA, CI của AFTERVIA không chạy kiểm tra của Groundstead (và đang đỏ ở bước audit dependency của Expo, không liên quan). Vòng lặp tự chạy `npm run verify` của Groundstead trước mỗi commit. CI riêng của Groundstead được tạo trong `GS-001`.

---

## 3. Kiến trúc và cấu trúc thư mục

### 3.1 Stack

| Phần | Lựa chọn | Lý do |
|---|---|---|
| Runtime | Node.js 22 (`.nvmrc`) | Cùng chuẩn với AFTERVIA |
| Web | Next.js (App Router), xuất tĩnh cho nội dung, `/[locale]/…` | Stack của chủ dự án; SEO; host trên Vercel |
| Ngoại tuyến | Service worker viết tay, IndexedDB, gói nội dung có bản kê SHA-256 ký Ed25519 | Kiểm soát được hành vi khi tải thiếu hoặc hỏng (GT07) |
| Nội dung | Markdown + frontmatter trong `content/`; JSON Schema kiểm bằng Ajv khi build | Git là nhật ký duyệt; build chặn nội dung thiếu hồ sơ (GT03) |
| Kiểm thử | `node:test` cho mọi kiểm thử (Node 22 chạy thẳng tệp `.ts` nhờ type stripping), qua `tools/loop/run-node-tests.mjs` để ma trận đọc mã GT; Playwright với Chromium có sẵn cho offline và axe | Một trình chạy, ít dependency; Vitest 4.1.12 làm npm lỗi khi giải peer (D-13) |
| Dữ liệu người dùng | Trên máy trước; Supabase (Postgres + RLS + Auth) cho đồng bộ tùy chọn, từ Cổng 2 | Dữ liệu tối thiểu |
| Cảnh báo | Bộ chuyển theo nguồn → mô hình CAP chung; job định kỳ | §9 của kế hoạch |
| Thương mại | Lớp kết nối nhà cung cấp; bộ dựng Gói; chuyển hướng `/go/<id>` | Không kho (D-03) |

Phiên bản cụ thể được ghim chính xác trong `package-lock.json` khi cài; không dùng khoảng phiên bản cho dependency chạy thật.

### 3.2 Cấu trúc thư mục đích

```
groundstead/
  app/                    Next.js App Router: [locale]/, emergency/, packs/, go/
  lib/
    brand.ts              tên thương hiệu và tagline (một chỗ duy nhất)
    content/              nạp, kiểm lược đồ, nhãn trạng thái duyệt
    offline/              service worker, bản kê, kiểm chữ ký
    alerts/               mô hình CAP, bộ chuyển từng nguồn, gộp trùng, khớp vị trí
    commerce/             nhà cung cấp, hồ sơ sản phẩm, bộ lọc tuyên bố, thu hồi, Gói
    calculators/          bước 0, nước, điện, lương thực, tài chính, đất
    planner/              kế hoạch gia đình, tủ vật dụng, 3 bộ lập kế hoạch
  content/
    sources.json          sổ nguồn và quyền
    countries/            VN.json, US.json, …
    cards/{en,vi}/        thẻ an toàn (lớp S)
    modules/{en,vi}/      bài lộ trình (lớp J)
    packs/                định nghĩa Gói
    schema/               JSON Schema
  tests/                  node:test (.ts) và Playwright, tên kiểm thử bắt đầu bằng mã GT
  tools/loop/             backlog.mjs, matrix.mjs (+ kiểm thử)
  tools/checks/           secret-scan.mjs, bundle-secret-scan, content-validate, translation-invariants
  docs/plan/              00–05 và backlog.json
  docs/evidence/          bằng chứng từng task
```

---

## 4. Loại task

| Loại | Vòng lặp được bắt đầu? | Ý nghĩa |
|---|---|---|
| `AUTO` | Có | Code, kiểm thử, nội dung trong repo |
| `AUTO_PREP` | Có | Tài liệu chuẩn bị, báo cáo, rà cổng; không có kiểm thử GT bắt buộc |
| `AUTO_EXT` | Có, trong phạm vi D-04 | Tác động dịch vụ ngoài đã được cho phép: tạo project Vercel và Supabase cho dev, deploy preview có bảo vệ, đẩy repo mới, đưa landing lên `groundstead.iai.one` khi có bản ghi duyệt |
| `HUMAN` | Không, luôn `WAITING_HUMAN` | Việc cần danh tính pháp lý, hợp đồng, chi tiền hoặc quyền mà AI không được thay mặt (§19 kế hoạch) |

Một task AUTO_EXT phụ thuộc HUMAN chỉ sẵn sàng khi chủ dự án báo việc HUMAN đã xong; vòng lặp ghi xác nhận đó vào `03_DECISIONS.md` (ngày, nội dung chủ dự án nói) rồi mới đánh dấu task HUMAN là DONE với bằng chứng là bản ghi đó.

---

## 5. Một vòng lặp

**Bước 0 — Kiểm tra trước.** Trong `groundstead/`: `npm run verify` phải xanh trên commit hiện tại. Nếu đỏ sẵn, sửa trước, không mở task mới.

**Bước 1 — Quyết định.** `node tools/loop/backlog.mjs decide`:
- `RESUME` → tiếp tục task `IN_PROGRESS`, đọc `docs/evidence/<id>.md` nếu có.
- `START` → `node tools/loop/backlog.mjs start <id>`.
- `STOP_*` → không lên lịch vòng kế tiếp; viết báo cáo cuối (§9).

**Bước 2 — Đọc đúng phạm vi.** Dòng task trong `backlog.json`, các dòng GT liên quan trong `02_ACCEPTANCE.csv`, mục liên quan của `00_MASTER_PLAN.md`. Không đọc lại toàn bộ kế hoạch mỗi vòng.

**Bước 3 — Làm một lát cắt.** Chỉ phần task yêu cầu. Kiểm thử có tiền tố mã (ví dụ `GT13 bản Test không hiện như cảnh báo công chúng`). Task quá lớn thì tách bằng `backlog.mjs split` trước khi làm.

**Bước 4 — Kiểm chứng.**

```bash
npm run verify
node tools/loop/matrix.mjs from-report .loop/node-tests.json   # báo cáo do npm test ghi
```

**Bước 5 — Kết quả.**
- *Xanh:* viết `docs/evidence/<id>.md` (lệnh đã chạy, số kiểm thử đạt/trượt, tệp đổi, giới hạn còn lại, cách hoàn tác), rồi `backlog.mjs done <id> --evidence "..."`.
- *Đỏ:* sửa nguyên nhân gốc, tối đa 3 lần cho cùng một lỗi; sau đó `backlog.mjs block <id> --reason "<lỗi, đường dẫn, mã lỗi>"`. Không tắt kiểm thử, không đổi kỳ vọng cho qua, không `skip`.
- *Thiếu hạ tầng hoặc quyền:* `block` kèm lệnh và thông báo lỗi; không giả PASS.

**Bước 6 — Cập nhật trạng thái, commit, đẩy, cập nhật preview.** Cập nhật `docs/plan/05_STATUS.md` (task vừa làm, kết quả verify, URL preview nếu có, việc kế tiếp). Commit `"<TASK-ID>: <mô tả ngắn>"` (không ghi tên model), đẩy lên nhánh làm việc, giữ PR nháp. Nếu task đổi giao diện hoặc nội dung web: tạo deployment mới trên project Vercel `groundstead` bằng `gitSource` trỏ commit vừa đẩy (project chưa nối Git cho đến GS-001), chờ `READY`, ghi URL vào `05_STATUS.md`; deployment lỗi thì đọc log build và sửa trong cùng vòng.

**Bước 7 — Lên lịch.** Chạy lại `decide`. Nếu `START` hoặc `RESUME`: `send_later` khoảng 2 phút với prompt ở §8. Nếu `STOP_*`: không lên lịch, viết báo cáo.

---

## 6. Quy tắc cứng

1. Không DONE, không PASS khi chưa có lệnh chạy thật và kết quả đọc được.
2. Không bắt đầu task HUMAN. Không tự nhận vai trò pháp lý, tài chính, phê duyệt.
3. Không dữ liệu cá nhân thật; không mua tên miền, gói dịch vụ hay quảng cáo; không nhập thông tin thanh toán; không nâng gói; nếu tạo tài nguyên có chi phí > 0 thì dừng và hỏi.
4. Không đưa bí mật, token, khóa riêng Ed25519 hay khóa service role vào repo, log, prompt hoặc bundle client. Khóa API của nhà cung cấp chỉ qua cơ chế bí mật của môi trường. Không tắt xác minh TLS.
5. Không ghi tên model vào commit, PR, bình luận hay tệp được đẩy.
6. Không force-push, không merge, không đẩy lên nhánh khác nhánh làm việc (trừ lần tạo `main` của repo mới trong `GS-001`).
7. Mỗi vòng một task.
8. Nội dung an toàn: chỉ tóm lược nguồn có quyền sử dụng trong sổ nguồn; luôn ghi nguồn; trạng thái `AI_DRAFT` cho đến khi có người duyệt thật. Không viết liều thuốc, xử lý hóa chất, lệnh sơ tán, tuyến đường an toàn, dự đoán động đất.
9. Pháp lý, chính sách, điều khoản luôn ở trạng thái DRAFT trong repo.
10. Công khai: preview luôn có bảo vệ truy cập. Landing chỉ lên `groundstead.iai.one` khi `03_DECISIONS.md` có bản ghi duyệt nội dung của chủ dự án cho đúng phiên bản (commit) đó.
11. Việc liên quan bảo mật ghi "chờ người rà độc lập" trong bằng chứng; không tự gọi là đã được duyệt.
12. Migration cơ sở dữ liệu chỉ chạy trên DB có tên kết thúc bằng `_test` (cục bộ) hoặc project Supabase dev.

**Dừng khẩn:** phát hiện rò dữ liệu, phát cảnh báo sai ra công khai, tài nguyên phát sinh chi phí ngoài dự kiến, hoặc lệnh có thể xóa dữ liệu thật → dừng vòng, không lên lịch, báo cáo bằng chứng.

---

## 7. Phạm vi tác động bên ngoài (D-04)

| Được làm | Không được làm |
|---|---|
| Tạo project Vercel tên `groundstead…` trong tài khoản đã kết nối, deploy preview có bảo vệ truy cập | Gắn domain khi chưa có duyệt và DNS; nâng gói; bật analytics trả phí |
| Tạo một project Supabase `groundstead-dev` ở gói miễn phí, chỉ dữ liệu giả | Tạo project khi gói miễn phí đã hết chỗ (sẽ phát sinh phí) |
| Đưa landing EN/VI lên `groundstead.iai.one` khi đủ điều kiện ở quy tắc 10 | Đưa phần ứng dụng ngoài landing ra công khai trước Cổng 1 |
| Gọi API công khai, miễn phí của nguồn cảnh báo và nguồn thu hồi khi kiểm tích hợp (kiểm thử dùng bản ghi mẫu, không gọi mạng) | Gọi API trả phí; đăng ký tài khoản thay chủ dự án |
| Đẩy repo mới sau GS-H01 | Xóa nhánh, xóa repo, đổi cài đặt bảo vệ nhánh |

---

## 8. Lịch chạy và prompt

- **Writer duy nhất:** chuỗi `send_later` của phiên này. Không bật Cloud Routine ghi song song. Vòng lặp AFTERVIA đang ở `STOP_STUCK` và ghi trên nhánh khác (`ccr-4544c9f7-b1t50m`), nên hai vòng lặp không ghi chồng lên nhau.
- **Nhịp:** mỗi vòng xong thì hẹn vòng kế tiếp sau khoảng 2 phút.
- **Ngân sách:** 100 lần bắt đầu task (`meta.iteration_budget`) cho 58 task vòng lặp, phần dư dùng cho làm lại. Hết ngân sách → `STOP_BUDGET` và báo cáo; chủ dự án quyết định có nâng ngân sách không.
- **Báo cáo cho chủ dự án:** mỗi khi qua một cổng, khi dừng, và khi một việc HUMAN đang chặn đường chính.

**Prompt của vòng lặp (dùng cho `send_later`):**

> Tiếp tục vòng lặp phát triển Groundstead. Đọc `groundstead/docs/plan/01_DEV_LOOP_PLAN.md` trong repo `/home/user/AFTERVIA` (hoặc trong repo `groundstead` nếu đã tách) rồi thực hiện đúng một vòng: chạy `node tools/loop/backlog.mjs decide` trong thư mục `groundstead/` và làm theo giao thức. Không bắt đầu task HUMAN. Nếu decide trả về STOP_*, viết báo cáo cuối và không lên lịch vòng kế tiếp.

---

## 9. Báo cáo khi dừng

- Lý do dừng (`STOP_*`), số vòng đã dùng trên ngân sách.
- Task DONE trong lượt, commit SHA, kết quả `npm run verify`.
- Task BLOCKED kèm lý do và bằng chứng.
- Việc HUMAN đang chặn, kèm việc cụ thể chủ dự án cần làm.
- Ma trận: `node tools/loop/matrix.mjs summary`.
- URL preview mới nhất (nếu có).

---

## 10. Backlog theo cổng (tóm tắt; nguồn thật là `backlog.json`)

| Cổng | Task vòng lặp | Nội dung |
|---|---|---|
| **Cổng 1 — 20/11/2026** | GS-000, 010, 080, 011, 030, 015, 031, 014, 013, 016, 034, 035, 020, 021, 022, 023, 033, 032, 050, 051, 052, 081, G1, 082, 001 | Khung, Next.js EN/VI, preview, lược đồ nội dung, sổ nguồn, gói quốc gia VN/US, 20 thẻ, màn hình khẩn cấp, landing, bước 0, ngoại tuyến có ký số, kiểm bất biến bản dịch, cảnh báo GDACS/USGS, SEO, rà cổng, landing công khai, tách repo |
| **Mốc T+30 — 06/12/2026** | GS-040, 041, 042, 060, 061, 062, 063, 064, 065, 053, 066 | Kế hoạch gia đình, tủ vật dụng, 3 bộ lập kế hoạch, lớp nhà cung cấp, hồ sơ và bộ lọc tuyên bố, tra thu hồi, 10 Gói, trang Gói, công khai affiliate, job cảnh báo + thông báo đẩy, bật affiliate thật |
| **Cổng 2 — 21/12/2026** | GS-036, 091, 092, 093, 094, 095, 037, 054, 070, 071, 072, 073, 083, G2 | Spec và 8 module lộ trình EN/VI, công cụ tính, 40 thẻ, thêm nguồn cảnh báo, Supabase + RLS, đồng bộ, xóa/xuất dữ liệu, quyền theo tầng, hiệu năng và axe |
| **Cổng 3 — 04/02/2027** | GS-100 … 106, G3 | Gói quốc gia mới, đợt 2 ngôn ngữ, vòng an toàn gia đình, chế độ Tổ chức, nhật ký độ trễ, nguồn cháy/khói |
| Chờ người | GS-H01 … H10 | Xem §19 của `00_MASTER_PLAN.md` |

Thứ tự trong `backlog.json` là thứ tự ưu tiên: vòng lặp luôn lấy task sẵn sàng đứng đầu.

---

## 11. Rủi ro của chính vòng lặp

| Rủi ro | Kiểm soát |
|---|---|
| Pass giả | Ma trận chỉ cập nhật từ báo cáo chạy thật; diff kiểm thử nằm trong PR |
| Nội dung an toàn sai do AI soạn | Chỉ tóm lược nguồn trong sổ nguồn; kiểm bất biến; nhãn `AI_DRAFT`; không phát hành chủ đề cấm |
| Lộ bí mật | Quét bí mật trong `verify`; quét bundle client (GS-010); khóa chỉ qua biến môi trường |
| Phát sinh chi phí | Quy tắc 3; chỉ gói miễn phí; dừng và hỏi khi có giá |
| Mất trạng thái giữa các vòng | Trạng thái nằm trong `backlog.json`, `02_ACCEPTANCE.csv`, `docs/evidence/`, `05_STATUS.md` và lịch sử git |
| Vòng lặp đứng vì việc HUMAN | Thứ tự backlog đặt việc không phụ thuộc người lên trước; `STOP_STUCK` kèm danh sách việc người cần làm |
