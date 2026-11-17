
---

## Kiểm duyệt độc lập gói 33 câu hỏi quyết định — 04/11/2026

### 1. Verdict và blockers

**HOLD phát hành/mở rộng; chưa đủ căn cứ dùng “đồng ý khuyến nghị” để đóng toàn bộ gói quyết định.** Bản dán phù hợp với baseline 6bf240d về STOP_STUCK, 56/60 vòng, bảy AUTO/AUTO_PREP còn chờ, PR nháp và CI đỏ. **Remote đổi trong lúc audit sang e3d55e0: backlog hiện START SEC-IDEM-01, 83 task và tám AUTO/AUTO_PREP TODO; không còn STOP_STUCK.** Thay đổi mới không chứng minh bản dán sai tại thời điểm lập. Không có bằng chứng mới cho P0 trong phạm vi kiểm này; không kết luận P0 vắng mặt toàn sản phẩm.

**P1 đang mở — AV-QA-01, được tái xác minh tại SHA mới:** CI run `41583398903`, job `125743176008`, head `6bf240d037de14715b2eadb0f5c41d5b2593b610` thất bại ở `npm audit --omit=dev --audit-level=high`. **HEAD mới e3d55e0 có run 41749908234/job 126312142530 cũng failure ở dependency audit; verify success với 437 pass/1 skipped.** Verify thành công không thay kết quả cả job. Audit lockfile đọc-only ngày 04/11 vẫn exit 1: **31 cảnh báo, 1 low / 25 moderate / 5 high / 0 critical**. Đây là inventory advisory/dependency, không phải bằng chứng năm đường khai thác production đã được chứng minh.

Commit e3d55e0 đã thêm hồ sơ quyết định theo ủy quyền và biên bản thử override phương án 2 rồi hoàn tác vì Expo bundle lỗi. Đã xác minh file/commit, nhưng chưa có raw log thí nghiệm hoặc nguyên bản chỉ thị ủy quyền để xác nhận độc lập các claim đó. Không dùng audit này để bác bỏ hoặc cấp thay authority ấy.

Các điểm cần chỉnh trước khi triển khai lựa chọn: phân biệt builder đã được tài liệu ghi đồng ý với quyền source/IP còn thiếu; xác thực lại khác với JWT hết hạn 15 phút; phương án mã xuất một lần cần contract/atomic consume/retry; không để sole-owner/merchant-retention trở thành quyền giữ dữ liệu vô thời hạn. Cổng E2E còn hai khoảng trống assertion được tái hiện bằng kiểm logic nguồn, mô tả tại mục 4.

`review_depth: audit có phạm vi`. Lát cắt: độ chính xác và khả năng thực thi của 33 câu hỏi, dependency/authority, CI, delete/export/auth/retry, và hiệu lực một số cổng kiểm. Không phải full release audit, pentest hay benchmark chất lượng AI. **Không chọn phương án thay Founder, không thêm task, tăng ngân sách, chạy lại writer hoặc thay quyết định.** Quy tắc vòng lặp trong repo là đối tượng đối chiếu; các lệnh commit/push/send_later trong đó không cấp quyền cho reviewer.

### 2. Source receipt — local checkout và remote report baseline

```text
audit_id: AV-DQ-20261104-01
report_source: /Users/tranhatam/.codex/attachments/20045fea-bc44-4f3d-b9ad-23ed5d58c490/Văn bản đã dán.txt
report_sha256: 570096b6687d509a228495402df954dada5ac77cb16243c56fced5fff773c336
report_bytes: 7364
reported_at: không có timestamp chính xác trong bản dán
domain: aftervia.iai.one (đích đề xuất; không xác minh live/DNS)
repo_root_local: /Users/tranhatam/Library/Mobile Documents/com~apple~CloudDocs/Documents/Devnewproject/AFTERVIA
remote: origin -> https://github.com/tranhatam-collab/AFTERVIA.git
branch: ccr-4544c9f7-b1t50m
local_head: 9a76185498c2e945e30ceb159cd8eaab8838eee2
local_working_tree_before: modified docs/plan/05_AUTONOMY_STATUS.md và docs/plan/evidence/WO25-01.md; untracked independent-audit-2026-11-03/
local_baseline_captured_at: 2026-11-04T07:42:37.373850+07:00
report_baseline_verified: 6bf240d037de14715b2eadb0f5c41d5b2593b610
pr: #1 OPEN / DRAFT; base main@b809781cd8f2894837310320d1c09d7686f0f4da
relation_at_intake: local 9a76185 là ancestor của 6bf240d, chênh 13 commit
latest_remote_readback: e3d55e05462454dd604559d611865976451772fd, 2026-11-04T00:57:22.501721Z
latest_relation: e3d55e0 là con trực tiếp của 6bf240d, local chậm 14 commit
deployment_target: chưa có deployment ID/account/environment được cấp trong báo cáo
auditor: Codex, independent audit-only
```

**Không bác bỏ 56/60 bằng số 45/60 ở local checkout cũ.** PR readback đầu xác nhận head 6bf240d; readback cuối phát hiện e3d55e0; reviewer clone nhánh vào thư mục tạm riêng, `git rev-parse --show-toplevel`, remote/branch/HEAD/status khớp, cây sạch trước kiểm. Reviewer giữ snapshot 6bf240d, đọc toàn bộ diff ba file mới và kiểm lại backlog/CI tại e3d55e0 trong worktree tạm khác. Hai snapshot được phân biệt ở mọi kết luận dưới đây. Không fetch, checkout, reset hay merge vào local repo đang có thay đổi của lane khác.

Source archive chính xác của remote commit được giữ tại `docs/plan/evidence/independent-decision-review-2026-11-04/evidence/source-6bf240d.tar.gz`, SHA256 `774cad3367d6d98eef9c7ab892d605965a805828d49f0ebbead617654dac5dde`. Bản đọc trực tiếp các file trọng yếu nằm dưới `evidence/head-6bf240d/`. Đường dẫn evidence trong các mục sau tính từ thư mục audit này.

### 2a. Cập nhật HEAD trong lúc kiểm — e3d55e0

Readback PR #1 phát hiện `e3d55e05462454dd604559d611865976451772fd` (OPEN/DRAFT), đúng một commit sau baseline báo cáo. Diff chỉ gồm ba tệp: thêm `06_DECISIONS_DELEGATED.md`, thêm `evidence/P1-AUDIT-OPTION2.md`, và thêm task vào `backlog.json`. Không đổi source sản phẩm, workflow, tests hay lockfile. Toàn bộ diff, hai file mới, backlog, archive SHA mới và raw CI nằm trong `evidence/late-head-e3d55e0/`; source archive SHA256 `4300a87cb4cb02fd8838f73d38b1a9a4f0a1ddee483b4529178d553672d1080b`.

- **VERIFIED_HEAD_ONLY:** backlog 83 task, 56/60 vòng, sáu AUTO + hai AUTO_PREP TODO. `decide` exit 0: `START`, task `SEC-IDEM-01`, ready_count=1. `validate` exit 0: 83 task. Task mới chưa có implementation. Không chạy/start task hoặc scheduler từ kết quả này.
- **VERIFIED_CURRENT:** CI e3d55e0 run **41749908234**, job **126312142530**, ngày 04/11 00:51:22–00:52:40Z; verify success, audit failure, 31 cảnh báo (1 low/25 moderate/5 high); Vitest 437 pass/1 skipped trên 438; 58 file pass/1 skipped trên 59. Log zip 63.881 byte, 12 member, khác archive lịch sử 6bf240d. Lockfile byte-identical nên audit đọc-only tại 6bf240d vẫn áp dụng cùng lockfile; không cần cài lại.
- **VERIFIED_HEAD_ONLY về hồ sơ:** `06_DECISIONS_DELEGATED.md` ghi ủy quyền “tất cả luôn, làm đi, tự quyết luôn”, phân loại QUYẾT/QUYẾT TẠM/CHỜ NGƯỜI/KHÔNG CẤP cho các câu hỏi. **REPORTED_UNVERIFIED về authority:** chưa có bản chat gốc/chữ ký/receipt gắn chỉ thị với phạm vi và ngày. Không suy ra chỉ thị đó không tồn tại, không trả lời lại thay Founder. Nhiều lựa chọn đã có record mới, không mô tả chúng là hoàn toàn chưa được team quyết.
- **REPORTED_UNVERIFIED về thí nghiệm:** biên bản ghi audit và verify từng xanh trên overrides rồi Expo Android bundle lỗi; đã hoàn tác. Không kèm raw log hoặc patch thử đầy đủ để reviewer tái xác nhận nguyên nhân. Đã xác minh HEAD giữ lockfile cũ và P1 vẫn mở, chưa xác minh lời giải thích chính xác về `image-size` chỉ từ biên bản. Vì vậy phương án 2 đã được **team báo cáo thử**, không còn là đề xuất chưa thử; chưa được reviewer chấp nhận.

**Khoảng trống đồng bộ hồ sơ mới — AV-DQ-01 mở rộng:** Q2–Q4 deletion được ghi quyết/chọn tạm nhưng chưa tạo task; Q1–Q6 trong WO11-02c và 04/06 queue/Founder register chưa đồng bộ cùng baseline. §5 hồ sơ mới ghi Pages/subdomain có điều kiện, §8 vẫn ghi DEC12 không cấp; cần scoped addendum chỉ rõ ngoại lệ/điều kiện trước hành động, không tự diễn giải thành quyền DNS/deploy. Quyền hạn ngoài repo không thể xác minh chỉ bằng nội dung report. CSV có cột riêng cập nhật **đủ 33 câu** tại e3d55e0; bảng mục 5 bên dưới giữ đối chiếu baseline 6bf240d để bảo toàn lịch sử.

### 3. Binding rules, coverage và điều chưa kiểm

Đã đọc AGENTS workspace bản 03/11, Audit Protocol 1.2 gồm §20, các ranh giới Lifecycle/Release/Operations, và quy tắc/plan của đúng AFTERVIA: README, `00_EXECUTION_PLAN`, `01_LOOP_PROTOCOL`, `04_DECISIONS`, `05_AUTONOMY_STATUS`, `06_DECISION_QUEUE`, `07_RELEASE_READINESS`, backlog/acceptance matrix. Repo không có AGENTS gần hơn trong clone đã kiểm. Canonical là bộ spec chỉ đọc có checksum và phần quyết định thực thi có ngày trong `docs/plan`; không sửa spec để hợp thức hóa behavior khác.

Đã đối chiếu WO11-02c Q1–Q6, source legal/04 và founder register, các receipt liên quan auth/items/grant/export/E2E, code HTTP và migration chia sẻ/xóa/export/write-guard, local launcher, E2E runner và verify workflow. Cả 33 mục được ghi một dòng riêng trong `evidence/CLAIMS.csv`, có source, status, nhận xét và bằng chứng cần tiếp.

Không mở hay kiểm PDF/DOCX/XLSX như artifact nghiệm thu; chúng không phải đầu ra đang được xin duyệt trong bản dán này. Không tái chạy browser E2E hoặc toàn bộ DB/product suite; không dựng staging, đọc production DB, chọn vendor, gọi model/scanner trả phí, kiểm thiết bị thật hay chứng nhận pháp lý/IP. CI raw log đúng SHA là evidence CI; không đổi thành kết quả local của reviewer. Secret/provider environment, scheduler đang hoạt động và chủ quyền DNS không được xác nhận từ file cấu hình.

### 4. Findings và hướng đóng

| ID / mức | Phát hiện, bằng chứng và phạm vi | Hướng đóng / owner đề xuất |
|---|---|---|
| **AV-QA-01 — P1, tiếp tục mở** | Cả job 125743176008/run 41583398903 tại 6bf240d và job 126312142530/run 41749908234 tại e3d55e0 failure; cùng lockfile vẫn 31 cảnh báo, 5 high. Step verify success. Comment 6547639475 có đúng bốn phương án. | Founder chọn phạm vi remediation; dev pin diff/lockfile; reviewer kiểm compatibility, bundle/mobile và CI trên SHA mới. Team đã ghi thử overrides rồi hoàn tác vì bundle lỗi; raw log thí nghiệm chưa có. Không hạ gate hoặc coi audit xanh trong thử nghiệm là compatibility proof. |
| **AV-DQ-01 — P2, provenance quyết định** | Câu 33 hỏi ghi lại builder Claude vào 04, trong khi `04_DECISIONS.md:28` đã ghi đồng ý, `:55` tiếp tục giữ builder. D13/DEC-ENG-13 đã ghi AFTERVIA là working name; bảng DEC01 ở 00 vẫn PROPOSED. Câu 24/33 gộp phần đã ghi nhận với clearance/IP còn thiếu. e3d55e0 bổ sung hồ sơ ủy quyền, nhưng các register/queue/WO chưa đồng bộ và authority chat gốc chưa kiểm; xem §2a. Tài liệu không thay bằng chứng pháp lý nguồn; lần này chưa mở chat gốc 31/10. | Team đối chiếu receipt và ngày, tách “builder/tên làm việc đã ghi nhận” khỏi quyền IP/source, trademark và public approval. Không tự đổi DEC01–12 hoặc hỏi lại toàn bộ như chưa có record. |
| **AV-DQ-02 — P2, auth/deletion contract** | Câu 6/Q3 đề xuất C/15 phút; source hiện TTL 3600, `authenticateSession` dùng cutoff iat, requestDeletion chưa có recent-auth/verification proof. Giảm TTL không biến dev sign-in theo UUID thành xác minh chủ tài khoản. Supabase cũng phân biệt access token, refresh/session lifetime. | Product/security owner định nghĩa ba thời hạn riêng: access JWT, session idle/max, recent-auth window; nguồn verification, refresh/revoke, lost-session recovery. C chỉ là hướng synthetic trong khi chưa có auth thật; không đóng T25/đưa real data từ câu trả lời C. |
| **AV-DQ-03 — P2, contract xuất gói** | Câu 23 đưa B “mã truy cập một lần” như lựa chọn nhưng chưa định nghĩa giao thức. OpenAPI Job chỉ có id/status; không route tải. HTTP tạo băm token rồi không trả raw token; SQL `fetch_export_file` kiểm owner/hash/expiry, **không** có consumed state và cho đọc từng path. Đây là prototype chưa hoàn tất download, không phải one-time download đã có. | Tech lead + reviewer định nghĩa contract version/addendum có authority; một lần cho bundle hay từng file, auth/owner, atomic consume, retry khi mất mạng, replay cùng key, 5 file+manifest, expiry/cleanup/revoke/deletion và không log token. Giữ spec gốc chỉ đọc; B không tự miễn việc ghi contract mới. |
| **AV-DQ-04 — P2, erasure/retention thiếu nhánh xử lý** | Câu 7 từ chối xóa nếu sole owner chưa nêu fallback/hạn; câu 8 merchant giữ case chưa có field/purpose/expiry/legal-hold. Một câu trả lời A/C không xác định dữ liệu nào giữ và tới lúc nào. Đây là khoảng trống policy đề xuất, chưa phải kết luận vi phạm luật đã xảy ra. | Founder/counsel đúng quốc gia và người phụ trách dữ liệu chọn transfer/close-org/support flow, thời hạn phản hồi và ngoại lệ có mục đích; tách PII khỏi audit minimal. Không áp thời hạn một nước cho mọi nước hoặc trì hoãn yêu cầu vô thời hạn. |
| **AV-DQ-05 — P2, hiệu lực cổng E2E** | `web-e2e.mjs:187` thu consoleErrors, nhưng `:309` chỉ dùng pageErrors để quyết định ok. Chạy đúng đoạn source trong VM với consoleErrors có một lỗi vẫn ok=true. `:293` kiểm closed/repaired nhưng không kiểm version 6 của fixture; version 99 vẫn qua đoạn gate. Positive controls page error/API500/wrong-status đều bị từ chối. | Dev thêm assertion rõ cho điều kiện thật sự thuộc DoD; fault console/error/version phải làm gate thất bại nếu được claim là bắt buộc. Giữ đầy đủ lần chạy và retry. Không suy từ probe này rằng lần E2E lịch sử chắc chắn có console error hoặc sai version. |
| **AV-DQ-06 — P2, safety của E2E reset** | Runner gọi `assertTestDatabase` rồi reset schema trước khi local API launcher kiểm host. Hàm assert ở migrate chỉ kiểm suffix `_test`; bản thân nó không khóa target về loopback/fresh instance. Local launcher có guard host chặt hơn, nhưng đến sau reset trong E2E. | Test/infra owner khóa rõ allowed host/socket, DB mới thuộc run, cấu hình sạch và ownership trước thao tác drop; negative control target không được phép phải dừng trước connect/drop. Lần audit này không chạy reset/migration; không chứng minh đã đụng nhầm DB. |

Tất cả findings mới ở code/contract được chứng minh trên **committed HEAD 6bf240d**, không chuyển thành claim về production. Code không đổi ở e3d55e0, nên các phát hiện source còn áp dụng ở SHA mới. Policy được hồ sơ mới ghi quyết định dùng VERIFIED_HEAD_ONLY cho sự tồn tại hồ sơ và REPORTED_UNVERIFIED cho authority gốc chưa được mở; không quy thành không có approval. Không có patch sản phẩm trong lần review này.

Phạm vi idempotency ở câu 2 hợp lý qua kiểm source và đã được gộp thành task SEC-IDEM-01 ở HEAD mới: `/v1/items` không đọc khóa trước `create_item`; route grant chỉ kiểm khóa có mặt rồi bỏ khóa. Tuy nhiên, unique index `(case_id, document_id, recipient_id) WHERE revoked_at IS NULL` **đã chặn hai active grant trùng bộ ba**. Không được mô tả sai rằng DB không có chống trùng nào. Cần kiểm response replay đúng, payload mismatch, concurrent retry và revoke-then-retry; unique index không thay idempotency theo actor/key/body. Chưa độc lập chạy DB để tuyên bố đã tái hiện một số lượng bản trùng cụ thể.

### 5. Claim ledger — 33 câu hỏi được kiểm riêng

Bảng dưới đối chiếu bản dán với **6bf240d tại lúc tiếp nhận**, không phải trạng thái chưa quyết tại e3d55e0. Các lựa chọn “khuyến nghị” trong bản dán không tự thành approval. Hồ sơ quyết định mới và trạng thái cập nhật đủ 33 dòng nằm trong các cột `latest_*` của `evidence/CLAIMS.csv`; xem §2a để phân biệt record, authority và implementation.

| Câu | Kết luận kiểm chứng | Status |
|---|---|---|
| 1 | CI đỏ và bốn lựa chọn khớp; chọn overrides chưa có compatibility/bundle receipt | VERIFIED_CURRENT về CI/comment; đề xuất chưa duyệt |
| 2 | Thiếu replay key ở items/grant được source xác nhận; unique index của grant vẫn tồn tại | VERIFIED_HEAD_ONLY |
| 3 | 56/60 đúng; còn 4 vòng. +10 chưa cấp; chưa có cap tiền riêng được đo | VERIFIED_CURRENT về backlog |
| 4 | Q1/retention table là nháp, grace và merchant retention chưa chốt | VERIFIED_HEAD_ONLY |
| 5 | Append-only chứa PII thật về cấu trúc; C là proposal chưa triển khai | VERIFIED_HEAD_ONLY |
| 6 | C/15 phút chưa có; cần phân biệt expiry và recent-auth/verified | REPORTED_UNVERIFIED đối với lựa chọn đã thực hiện |
| 7 | REVOKED/sole-owner handling là lựa chọn còn chờ, thiếu fallback | REPORTED_UNVERIFIED |
| 8 | Revoke tài liệu có code; merchant giữ case chưa đủ policy | VERIFIED_HEAD_ONLY cho code; proposal chưa duyệt |
| 9 | DB chưa chặn export pending-deletion; route tải/cleanup còn thiếu | VERIFIED_HEAD_ONLY |
| 10 | Chọn Supabase là proposal; không tự đóng toàn DEC03 pháp nhân/hạ tầng | REPORTED_UNVERIFIED |
| 11 | Kho byte/scanner chưa được chọn; packet chưa có so sánh vendor/region/privacy/cost | REPORTED_UNVERIFIED |
| 12 | Default AI disabled có trong cấu hình mẫu/code/receipt; không kiểm env production | VERIFIED_HEAD_ONLY |
| 13 | Hosting ưu tiên đã ghi; DNS/account/deploy authority chưa được provider xác nhận | REPORTED_UNVERIFIED đối với quyền thực thi |
| 14 | Chờ clearance và copy approval khớp gate hiện hành | VERIFIED_HEAD_ONLY |
| 15 | Critical fields là proposal hiện có, chưa có model/field benchmark thật | VERIFIED_HEAD_ONLY |
| 16 | DST gap/overlap policy là proposal hiện có, không tự trở thành approval | VERIFIED_HEAD_ONLY |
| 17 | Outcome/reopen trong code; VI/EN/native acceptance chưa có | VERIFIED_HEAD_ONLY |
| 18 | Scan/SUSPENDED policy cần quyết; metadata synthetic không chứng minh tải byte an toàn | REPORTED_UNVERIFIED về approval |
| 19 | Inbox/assignment policy khớp WO08-03, chờ product confirmation | VERIFIED_HEAD_ONLY |
| 20 | Trần 30 ngày/partner/timeline thuộc rule thiết kế, không phải luật toàn cầu | VERIFIED_HEAD_ONLY |
| 21 | Owner-access rule khớp thiết kế; không tự miễn deletion/scanner controls | VERIFIED_HEAD_ONLY |
| 22 | Server/DB 500 trong khi contract 4000, đúng là mismatch cần quyết/contract riêng | VERIFIED_HEAD_ONLY |
| 23 | B chưa có one-time protocol; export hiện chưa download qua HTTP | REPORTED_UNVERIFIED về phương án đã hoàn thành |
| 24 | Working name đã có record chốt; clearance khác working name; DEC02 còn proposal | VERIFIED_HEAD_ONLY |
| 25 | Appointment reviewer ngoài chưa có trong nguồn đã kiểm | VERIFIED_HEAD_ONLY về trạng thái register; ngoài repo NOT_CHECKED |
| 26 | Pilot country/pack vẫn DISABLED, không kích hoạt từ câu hỏi này | VERIFIED_HEAD_ONLY |
| 27 | 30 phỏng vấn/5 partner là target, không có bằng chứng hoàn tất trong packet | VERIFIED_HEAD_ONLY |
| 28 | DEV-01/02 cần receipt thiết bị/trình duyệt; không kiểm thiết bị cá nhân của Founder | VERIFIED_HEAD_ONLY |
| 29 | INF-01 chưa có restore receipt đúng môi trường độc lập | VERIFIED_HEAD_ONLY |
| 30 | Counsel/IP cần appointment/scope và sign-off; không thay bằng script/test | VERIFIED_HEAD_ONLY |
| 31 | Native VI/EN review còn chờ, nhãn draft không phải acceptance | VERIFIED_HEAD_ONLY |
| 32 | Approval DAST có điều kiện đã ghi; key/Docker/target/config còn cần kiểm | VERIFIED_HEAD_ONLY cho hồ sơ; runtime NOT_CHECKED |
| 33 | Builder Claude đã được tài liệu ghi đồng ý; quyền source/IP là phần riêng chưa đủ receipt | VERIFIED_HEAD_ONLY |

Các mặc định D1/D2/D6 trong bản dán được hiểu là giữ lựa chọn/cơ chế hiện tại; **không resume scheduler từ audit**. STOP_STUCK là trạng thái backlog cũ; e3d55e0 đã START-ready cho SEC-IDEM-01, không chứng minh scheduler thực tế đang chạy. Không coi im lặng hoặc elapsed time là approval. DEC08–DEC12, real data/payment/store/production và việc gửi thông báo vẫn không được mở bởi báo cáo này.

### 6. Requirement → implementation và dependency

| Yêu cầu | Source / implementation | Evidence thực có | Khoảng trống |
|---|---|---|---|
| Vòng lặp chỉ nhận task máy làm được, dừng đúng gate | backlog.mjs, protocol, backlog 82 → 83 task | 6bf240d STOP_STUCK → e3d55e0 START SEC-IDEM-01; 18/18 loop tests tại 6bf240d | Scheduler execution/config hiện tại không được readback |
| Xóa tài khoản có receipt, revoke access | 0014 + API cutoff + 0018 write guard | Source và CI test suite đúng SHA | Primary erasure, append-only PII, real verification, membership/counsel, tombstone ngoài backup |
| Export đúng scope và dùng được | 0013 + HTTP createExport + bundle builder | Tạo job/metadata; CI source tests; E2E receipt chỉ job/UI | Download contract, auth/retry/expiry/cleanup, mở đủ năm file ở công cụ đích |
| Upload/scanner và AI thật | Contract + disabled/synthetic adapters | Có cổng và fixture | Vendor/region/retention/paid budget và eval chưa cấp/đo |
| Replay/idempotency | Items/grant/exports | Exports có request-key; grant có unique active tuple | Items/grant chưa có replay theo khóa; không bật sync thật từ client tests |
| Pilot/restore/independent acceptance | Country packs, INF/DEV/HUM tasks | Hồ sơ còn chờ | Country, consent, khách, thiết bị, restore, reviewer và public approvals |

Tại 6bf240d, bảy task “AUTO còn lại” là **5 AUTO + 2 AUTO_PREP TODO**, không phải tổng mọi việc. Tại e3d55e0 có **6 AUTO + 2 AUTO_PREP TODO**, tổng 83 task, và một task mới đủ dependency; đó là lý do decide đổi sang START dù budget vẫn 60 và used vẫn 56. Các task HUMAN/DEVICE/INFRA/BLOCKED còn nguyên. Không giải thích thay đổi này bằng việc đã tăng budget. Các câu trả lời policy phải được ghi đúng decision/WO và nghiệm thu thay đổi kỹ thuật; không đánh HUMAN task DONE chỉ vì có chữ “đồng ý”.

### 7. Sự thật theo lớp

| Lớp | Kết luận |
|---|---|
| Tài liệu/plan | Có gói quyết định tương đối đầy đủ; còn provenance/contract/policy gaps đã nêu |
| Git HEAD | Remote 6bf240d là baseline báo cáo; e3d55e0 là readback mới; local 9a76185 cũ hơn 14 commit |
| Worktree | Các dirty report của lane trước được chụp hash, bảo toàn prefix; không thay code để đuổi theo remote |
| Tests/build | CI verify: 437 pass / 1 skipped; loop 18/18. Reviewer chỉ tái chạy tool đọc-only, loop và source-logic probes |
| Browser E2E | E2E-WEB-01 được commit với receipt; raw 12 bước/ảnh không trong repo và chưa tái chạy độc lập lần này |
| Provider/deploy/DNS | NOT_CHECKED; subdomain và hosting preference không phải deployment receipt |
| Live runtime | NOT_CHECKED; không suy ra người dùng tải được gói hoặc dùng auth thật |
| Ops/restore | NOT_CHECKED đối với hệ thống vận hành; snapshot source của reviewer không phải restore drill |
| Approval | e3d55e0 có hồ sơ trả lời theo ủy quyền; chỉ thị gốc chưa kiểm. Không tự bổ nhiệm reviewer DEC05 hoặc cấp approval từ audit |

### 8. Kiểm bộ kiểm định, receipts và giới hạn tái hiện

Node dùng bởi reviewer: `v22.23.4` ở `/Users/tranhatam/.volta/tools/image/node/22.23.4/bin/node`. Chạy trong clone tạm sạch, không trong worktree của team. Không chạy migrate/reset, full npm verify hoặc browser khi chưa có DB mới được khóa; không mượn DB `_test` đang tồn tại của lane khác.

| Phép kiểm | Kết quả / evidence |
|---|---|
| PR #1 và comment 6547639475 | gh read-only; OPEN/DRAFT, head ban đầu 6bf240d, readback e3d55e0; base main b809781; bốn phương án khớp |
| CI run/job 6bf240d | 41583398903 / 125743176008; created 03/11 05:21:03Z, job 05:21:06–05:22:42Z; verify success, dependency audit failure |
| CI run/job e3d55e0 | 41749908234 / 126312142530; 04/11 00:51:22–00:52:40Z; verify success, audit failure; raw log đã lưu |
| CI Vitest | **438 total: 437 pass, 1 skipped**; 59 file: 58 pass, 1 skipped. Không ghi 438 pass |
| CI loop tests | 18 tests, 18 pass, 0 fail, 0 skipped; raw log có số này |
| npm audit đọc lockfile ngày 04/11 | exit 1; 31 cảnh báo: 1 low, 25 moderate, 5 high, 0 critical; không cài/sửa gói |
| `node tools/loop/backlog.mjs decide/status/validate` | exit 0 ở cả hai snapshot; 6bf240d STOP_STUCK/82 task, e3d55e0 START SEC-IDEM-01/83 task; 56/60 giữ nguyên |
| `node tools/checks/bundle-verify.mjs` | exit 0, 69/69 payload khớp |
| Đối chứng bundle sai một byte | Chỉ trên copy khác: exit 1, `hash mismatch 00_START_HERE.md`; file nguồn không đổi |
| `node --test …backlog.test.mjs …matrix.test.mjs` | 18/18, fail/cancelled/skipped/TODO đều 0 theo log |
| 6 source-logic probes của E2E | Clean, page error, API500 và wrong-status đúng oracle; console-only error và wrong final version không làm đoạn gate ném lỗi. **Đây không phải sáu browser E2E** |

Lần npm audit đầu của reviewer dừng **trước khi kết nối registry** vì user/global config cùng dùng `/dev/null`; stdout rỗng không được coi là advisory result. Đã giữ receipt/stderr lần lỗi, đổi sang hai file cấu hình rỗng riêng biệt rồi mới thu JSON audit nêu trên. Không dùng cấu hình npm có token người dùng, không chạy install/fix/scripts.

CI raw archive **6bf240d** có 2 member `0_verify.txt`, `verify/system.txt`, tải 31.022 byte; SHA và exact argv/time/exit nằm trong `evidence/ci-fetch-receipts.json`. Không dùng số thứ tự step cao nhất 15 làm tổng số step: API trả 11 step, trong đó một post setup step skipped. Cảnh báo runtime Node của GitHub Actions tách khỏi Node chạy package/test.

Tái hiện source probes bằng `node evidence/harness-probes.mjs` trong thư mục audit; script chỉ đọc bản source được pin và in kết quả, không mở DB/browser/network. Bundle fault control chạy trên copy riêng có hash. Các trường TODO/expected-failure không có trong log CI Vitest giữ unknown, không tự điền 0.

### 9. Ma trận kỹ thuật FPOS và phạm vi chất lượng

| Nhóm §8 | Trạng thái trong đợt này | Evidence/gap |
|---|---|---|
| Product/nghiệp vụ | VERIFIED_HEAD_ONLY ở requirement/decision | 33-row ledger; chưa đo task completion của người dùng |
| Kiến trúc thực tế | VERIFIED_HEAD_ONLY cho source local prototype | Provider topology/deploy NOT_CHECKED |
| Codebase | VERIFIED_HEAD_ONLY trong items/grant/delete/export/E2E đã chọn | Không gọi là full repo code/security scan |
| Auth/session/quyền | VERIFIED_HEAD_ONLY | Cutoff/source tests; recent-auth và real provider chưa có receipt |
| DB/dữ liệu | VERIFIED_HEAD_ONLY | 19 migration gồm 0000–0018 trong source; không tái chạy SQL lần này |
| API/tích hợp | VERIFIED_HEAD_ONLY | Contract/source; gap download/replay; API500 source control có fail |
| Payment/entitlement | NOT_CHECKED runtime | WO12 còn TODO, không payment live |
| Content/song ngữ/brand | VERIFIED_HEAD_ONLY cho trạng thái draft và approval | Native review/clearance còn chờ |
| Responsive/a11y | NOT_CHECKED | Không mở UI hoặc screen reader trong lần này |
| SEO | NOT_CHECKED | Không xác minh public landing/search console |
| Performance/reliability | NOT_CHECKED về sản phẩm | Không đo latency, mobile sync hoặc load pilot |
| Security | VERIFIED_HEAD_ONLY cho logic đã chọn; VERIFIED_CURRENT cho audit metadata | Advisory không phải PoC; không pentest/DAST mới |
| Legal/trust | REPORTED_UNVERIFIED đối với project clearance | Chỉ đối chiếu hướng dẫn sơ cấp, chưa có country/legal opinion |
| Cleanup | VERIFIED_CURRENT cho bảo toàn repo audit | Không cleanup dữ liệu, DB hay provider của team |
| AI system | NOT_CHECKED về chất lượng model | Disabled/default và requirements không chứng minh output AI tốt |
| Infra/DevOps | VERIFIED_CURRENT cho PR/CI receipt | DNS, account, scheduler, staging và DR NOT_CHECKED |
| Documentation | VERIFIED_HEAD_ONLY và delta report | Hồ sơ chính còn nhiều dòng lịch sử; đọc ngày và baseline từng đoạn |

Theo §20, tách **khả năng kiểm định**, **chất lượng đầu ra** và **release**. Không phát hành điểm /100 khi chưa khóa rubric sản phẩm và chưa đo hành trình đầu ra. Các kết quả đếm ở mục 8 là kết quả tool/case có mẫu số, không phải điểm sản phẩm.

| Trục chất lượng §20.5 | Đánh giá bằng chứng trong scope | Q_observed / C_evidence |
|---|---|---|
| Giá trị sản phẩm | Có hypothesis SMB B2B; interviews/partner target chưa có receipt trong packet | NOT_CHECKED / chưa có trọng số cho đợt product measurement |
| Đúng nghiệp vụ | Source policy và CI hiện có; export/replay/delete còn gap | NOT_CHECKED về chất lượng sản phẩm cuối |
| UX/accessibility | E2E là receipt của team, chưa browser/manual audit hiện tại | NOT_CHECKED |
| Nội dung/biên tập | 33/33 mục được đối chiếu; có gộp decision đã ghi và chưa đủ proof | Nhận xét định tính; không quy 33/33 trace thành điểm chất lượng |
| AI/agent | Chưa gọi model, chưa holdout/eval/cost per accepted task | NOT_CHECKED |
| Kỹ thuật/tích hợp | CI và tool evidence rõ; dependency P1 và harness assertion gaps | Không lấy trung bình để bù P1 |
| An toàn/quyền dữ liệu | Có revoke/cutoff, thiếu real-auth/retention/download acceptance | NOT_CHECKED về assurance toàn sản phẩm |
| Vận hành/phục hồi | Chưa restore/rollback trên staging phù hợp | NOT_CHECKED |
| Khác biệt thị trường | Có đối chiếu tài liệu ba cách thay thế dưới đây; chưa benchmark | NOT_CHECKED về lợi thế đã đo |

### 10. Đối chiếu quốc tế ngày 04/11/2026 — tài liệu, chưa benchmark

User/job được chọn từ PRD: nhân viên cửa hàng điện máy cần tiếp nhận chứng từ, phối hợp khách–cửa hàng–đối tác, xử lý case và giữ/xóa/xuất dữ liệu đúng quyền. Chưa chọn nước pilot, chưa có quyền lấy tài liệu khách thật; không đăng ký dịch vụ hay upload dữ liệu để so sánh.

| Lựa chọn / nguồn sơ cấp | Năng lực công bố phù hợp bài toán | Giới hạn đã đọc / chi phí | Đã tự thử / kết quả cùng bài | Giả thuyết cần bác bỏ cho AFTERVIA |
|---|---|---|---|---|
| Đối thủ trực tiếp: [Claimlane B2B](https://support.claimlane.com/en/articles/11137150-how-does-claimlane-work-for-b2b-businesses), tài liệu 23/09/2026 | Hồ sơ claim retailer–supplier, tài liệu và trao đổi cùng thread | Nhà cung cấp xử lý claim, Claimlane là platform; giá/gói/region chưa kiểm | Chỉ đọc tài liệu; không trial/benchmark | AFTERVIA cần chứng minh nhanh/dễ/đúng quyền hơn trên cùng hồ sơ, không chỉ có “case + chứng từ” |
| Liền kề: [Zendesk attachments](https://support.zendesk.com/hc/en-us/articles/4408885871130-How-can-I-remove-attachments-from-tickets) | Xóa/redact attachment nhưng giữ ticket; có deletion schedule | Một số tự động hóa cần ADPP; phạm vi messaging khác ticket attachment; chưa kiểm giá/region | Chỉ đọc tài liệu | Khả năng giữ case mà xóa PII đã có ở giải pháp khác; AFTERVIA phải đo đúng semantics và công vận hành |
| Thủ công, không AI: email + bảng case + [Drive restricted sharing](https://support.google.com/drive/answer/7166529?hl=en) | File roles, remove access, hạn truy cập cho work/school accounts | Kế thừa quyền folder có giới hạn; không tự có case workflow; giá/region chưa kiểm | Quy trình thủ công là baseline reviewer đề xuất, chưa chạy | Đo thời gian nhập/đối chiếu/quên revoke và số lỗi so với quy trình thủ công được cấu hình đúng |

Những năng lực nêu trên là **công bố được đọc từ nhà cung cấp**, chưa được reviewer xác nhận bằng test dịch vụ. Không lặp số khách hàng hay claim hiệu quả marketing thành evidence độc lập. Kết luận được phép: case/document collaboration và retention theo loại dữ liệu đã có lựa chọn thay thế; lợi thế AFTERVIA về VI/EN, UX điện máy và kiểm quyền là giả thuyết cần đo. Không kết luận “đầu tiên”, “duy nhất” hoặc thắng đối thủ.

Bài so sánh đề xuất, chưa chạy: cùng 10 bộ synthetic/được consent, cùng role/budget/time cap; có missing receipt, request trùng, grant hết hạn/thu hồi, customer deletion và closed case. Đo hoàn tất case **và mở được export**, thời gian, correction, lỗi quyền, chi phí human review. Dừng khi rò quyền; không dùng số màn hình/test để thay task success. Matrix nguồn/query/date và NOT_CHECKED được lưu tại `evidence/market-comparison.json`.

Nguồn kỹ thuật hiện hành [Supabase sessions](https://supabase.com/docs/guides/auth/sessions) phân biệt JWT/access token và refresh/session; các time-box/inactivity controls có điều kiện gói Pro, nên không suy từ lựa chọn Supabase rằng mọi kiểm soát nằm trong ngân sách 0. [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-EN) yêu cầu đường yêu cầu xóa, dữ liệu liên quan và công khai phần giữ lại hợp lệ. [ICO](https://ico.org.uk/for-the-public/your-right-to-get-your-data-deleted) là hướng dẫn UK về erasure/identity/retention, không phải luật mặc định cho pilot chưa chọn quốc gia. Đây là lý do yêu cầu acceptance rõ, **không phải legal sign-off cho AFTERVIA**.

### 11. Evidence register và kế hoạch đóng theo dependency

| Evidence | Nội dung |
|---|---|
| evidence/report-intake.txt | Toàn bộ bản dán gốc, hash/bytes nêu ở receipt |
| evidence/local-baseline.json | 366 file local đã chụp hash; hai dirty report và evidence cũ được phân biệt |
| evidence/remote-source-receipt.json; source-6bf240d.tar.gz | Exact remote checkout, file hashes và archive committed source |
| evidence/remote/pr.json; comment-6547639475.json; runs-head.json; ci-jobs.json | Primary GitHub receipt đọc-only |
| evidence/remote/ci-log.zip; ci-verify.raw.log | Log thô đúng run/SHA, không có E2E browser job trong đó |
| evidence/remote/npm-audit-current.json; npm-audit-receipt.json | Đọc advisory metadata với lockfile không đổi, exit 1 |
| evidence/logs/; local-command-receipts.json | Decide/status/validate/bundle/18 loop tests, exact argv/time/exit/hash |
| evidence/harness-probes.mjs; harness-probes.json | 6 probes logic nguồn, có control và mismatch; không phải E2E replay |
| evidence/bundle-negative-control.json | Hash fault làm gate đỏ trên copy riêng |
| evidence/CLAIMS.csv; source-lines.json | Đủ 33 mục, primary refs và file/dòng findings |
| evidence/market-comparison.json; policy-source-notes.json | Nguồn sơ cấp/ngày/giới hạn, không có provider benchmark |
| review-receipt.json; MANIFEST.sha256 | Post-write preservation, hash report và seal artifact |

Ba ưu tiên theo thứ tự:

1. **Dependency/CI:** Founder chỉ chọn đường remediation; dev làm diff có version/pins và bundle compatibility; reviewer tái kiểm high+ và CI mới. Bỏ dependency mobile nếu chọn phương án 4 vẫn phải giữ trạng thái mobile chưa đạt, không xóa gate để làm xanh giả.
2. **Delete/auth/retention:** ghi từng Q1–Q6 với scope/country/owner/expiry và recent-auth; tách builder đã ghi với IP receipt; không treo sole-owner vô thời hạn. Duyệt policy không tự hoàn tất migration/erasure/restore.
3. **Download/retry/test:** chuẩn hóa contract export và semantics mã truy cập; thêm replay tests của items/grant, fault test cho cổng E2E; rồi mới nghiệm thu luồng người dùng nhận được artifact. Không mở sync/chia sẻ thật từ test client giữ khóa hoặc từ thông báo “Đã xong”.

Ngân sách thêm vòng được xem sau khi có task nhỏ, dependency và acceptance cụ thể; tăng +10 không phải prerequisite duy nhất, cũng không chữa blocker. Đề nghị team chuẩn bị bảng storage/scanner theo ownership/region/DPA/scan-before-read/delete/cost trước khi xin quyết định vendor, không để một câu “chọn dịch vụ nào” thay packet có thể duyệt.

### 12. Release/maturity và approval

Đây không phải một RC để xét GO. Trạng thái HOLD của release tiếp tục vì P1 cùng các gate chưa có evidence. Không nâng `ENGINEERING_ACCEPTED`, không promote maturity và không tự nhận chức danh reviewer được bổ nhiệm của DEC05 chỉ vì đã thực hiện đợt audit này.

| Gate FPOS | Kết quả trong scope |
|---|---|
| RG0 | Source đã pin hai snapshot; local và remote mới khác 14 commit; không có deployment artifact để đối chiếu |
| RG1–RG2 | Decisions/product/architecture còn scoped proposals; chưa có toàn bộ owner acceptance |
| RG3 | AI chất lượng/eval/model chưa kiểm, provider mặc định tắt |
| RG4–RG5 | Provider/staging chưa kiểm; CI job failure, dù verify success |
| RG6 | Có report/receipt; còn contract và decision provenance gaps |
| RG7–RG8 | Source/CI tests có evidence; chưa đầy đủ export/delete/real auth/device/security acceptance |
| RG9 | Chưa staging/rehearsal/restore phù hợp |
| RG10–RG11 | Production authorization và post-deploy/live verification chưa có |
| RG12–RG13 | Cleanup/handoff/Founder domain sign-off chưa có evidence đủ |

Lịch `send_later` thuộc một hệ thống ngoài repo; STOP_STUCK là quyết định từ backlog, không tự chứng minh lịch đã pause/không còn trigger trên dịch vụ. Bản dán không cấp quyền reviewer xem/sửa lịch hay gửi tin; không thực hiện những hành động đó.

### 13. Phạm vi ghi và kết luận dành cho team

Phần audit này được append trực tiếp vào **report canonical `docs/plan/05_AUTONOMY_STATUS.md`** ở checkout chính của AFTERVIA. Mọi đoạn cũ và các report/evidence của reviewer trước được bảo toàn. Hai snapshot nguồn remote 6bf240d/e3d55e0 nằm trong evidence; HEAD local vẫn là 9a76185, không được cập nhật theo remote.

Chỉ một file cũ được append; thêm thư mục evidence `independent-decision-review-2026-11-04/`. Không đổi code, spec immutable, backlog/iteration budget, matrix, queue/Founder decisions, WO status, `.git`, provider, memory hay scheduler; không commit/push/deploy hoặc gửi comment PR. Receipt kết thúc kiểm 365 file baseline khác không đổi và prefix báo cáo cũ còn nguyên.

**Bản dán phù hợp với baseline kỹ thuật ban đầu. HEAD mới đã ghi hồ sơ ủy quyền và thêm một task khiến STOP_STUCK đổi sang START-ready, nhưng chưa đổi code hoặc đóng P1.** Team cần đồng bộ decisions/WO/queue, pin authority và acceptance cho auth/export/erasure trước khi coi hồ sơ quyết định là đủ triển khai. Reviewer giữ nguyên mọi quyết định và trạng thái của nguồn; không suy ra quyền phát hành từ audit.
