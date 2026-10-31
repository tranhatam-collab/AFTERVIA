# AFTERVIA — FOUNDER MASTER EXECUTION ORDER v1.0
Date: 2026-10-31 | Language: Vietnamese | Intended executor: Claude Code

## MANDATE
Tôi giao Claude Code quyền chủ động điều phối và thực thi TOÀN BỘ công việc kỹ thuật phát triển AFTERVIA nằm trong repository, từ kiến trúc, lập trình mobile/web/backend, quản lý dữ liệu, bảo mật, AI, kiểm thử, CI, tài liệu, đến bản release candidate. Không cần hỏi lại về việc viết/sửa code, tạo test, refactor, chạy lệnh kiểm thử an toàn, mở PR nháp, phân tích lỗi và chuẩn bị hồ sơ nghiệm thu khi các hành động đó nằm trong phạm vi này. Mục đích là hoàn thiện sản phẩm có bằng chứng, không phải hoàn thành checklist trên giấy.

Tự vận hành theo vòng lặp: đọc trạng thái mới nhất -> lựa chọn công việc -> lập kế hoạch ngắn -> thực thi -> kiểm thử -> sửa lỗi -> kiểm tra bảo mật -> cập nhật chứng cứ -> commit/push theo quyền -> chuyển công việc tiếp theo. Khi phiên dừng, giữ checkpoint bền vững để phiên mới tiếp tục. Tuyệt đối không tuyên bố đã tạo một tác vụ chạy nền hoặc đã lên lịch nếu chưa có bằng chứng scheduler trả về.

## 1. NGUỒN SỰ THẬT VÀ BASELINE
- Repository: `tranhatam-collab/AFTERVIA`.
- PR đang mở theo báo cáo gần nhất: `https://github.com/tranhatam-collab/AFTERVIA/pull/1` (draft).
- Working branch trong báo cáo: `ccr-4544c9f7-b1t50m`; `main` được tạo như empty-root để review toàn diff. KHÔNG mặc định `main` chứa ứng dụng.
- Work orders đã báo hoàn tất: WO03-01, WO03-02, WO03-03, WO03-04, WO04-01. Công việc dự kiến tiếp theo: WO04-02, WO04-03, WO07-01. T37/T03/T06 được báo có test con PASS nhưng coverage PARTIAL.
- Nguồn thực tế cao nhất: remote Git refs, nội dung source ở HEAD, CI records theo SHA, migration/test logs; tiếp theo là `docs/plan/backlog.json`, `docs/plan/01_LOOP_PROTOCOL.md`, `docs/plan/02_ACCEPTANCE_MATRIX.csv`, `docs/plan/04_DECISIONS.md`, `docs/plan/00_EXECUTION_PLAN.md`, bộ AFTERVIA đặc tả nguyên gốc, rồi mới đến các báo cáo tóm tắt.
- Vào đầu mỗi phiên, xác minh đầy đủ repo/branch/HEAD/tree/working tree, PR/head CI và các tệp hiện hữu. Nếu khác báo cáo, ưu tiên trạng thái thật và ghi chênh lệch. Không giả định tệp, lệnh hoặc test nào đã có.
- Bảo toàn SHA, checksum và bản đặc tả gốc; bổ sung bản hiệu chỉnh có version và dấu vết thay vì âm thầm viết lại lịch sử.

## 2. QUYỀN ĐƯỢC ỦY QUYỀN VÀ GIỚI HẠN
TỰ CHỦ: thiết kế trong phạm vi chiến lược đã phê duyệt; triển khai source; schema/migration trên DB dev/test; unit/integration/E2E/negative tests; lint/typecheck; CI; tài liệu; security review; review thay đổi; chỉnh sửa backlog có giải trình; commit và push nhanh thông thường lên nhánh development được phép; mở/cập nhật draft PR; sửa lỗi CI và cung cấp bản demo trên sandbox/staging không chứa dữ liệu thật và không phát sinh chi phí mới.
KHÔNG ĐƯỢC TỰ Ý: force-push, rewrite history, merge PR vào `main`, xóa dữ liệu thật, đẩy production, thay đổi tài khoản/thanh toán live, tạo phí hoặc cam kết chi chưa duyệt, vượt hạn mức sử dụng, thu thập dữ liệu cá nhân thật, liên hệ khách hàng/người tham gia ngoài phạm vi đã duyệt, công bố sản phẩm toàn cầu, ký hợp đồng/pháp lý, bật provider AI live khi thiếu quyền, lộ secrets, bỏ qua kiểm soát bảo mật, dùng quyền quản trị để làm test phân quyền. Yêu cầu quyền bổ sung qua Decision Register có lựa chọn, mức ảnh hưởng, phương án an toàn.
Không gọi ``được giao 100%`` là quyền phá các giới hạn trên. Nếu thiếu nguồn lực thật, chuẩn bị hoàn chỉnh phần máy có thể làm và đánh dấu `HUMAN_REQUIRED`, `EXTERNAL_DEPENDENCY`, hoặc `UNVERIFIED` theo đúng thực tế.

## 3. QUY TẮC CHẠY LIÊN TỤC
- Chỉ một writer được push lên một nhánh tại một thời điểm. Áp dụng khóa/lease bền vững nơi môi trường hỗ trợ; không dựa duy nhất vào một file lock trên bản clone tạm. Nếu không thể xác minh độc quyền writer, chỉ phân tích, kiểm thử read-only, hoặc phát triển trên nhánh `claude/*` riêng và tạo PR; không đẩy vào nhánh dùng chung.
- Nếu đã có `send_later`, cron, routine hoặc loop khác, kiểm trạng thái thật và tránh tạo lịch thứ hai cùng sửa branch.
- Mỗi lần chỉ chọn một vertical slice hoặc task độc lập có thể nghiệm thu; chỉ dùng subagent song song cho nghiên cứu/review/test read-only hoặc các worktree độc lập có kiểm soát. Không triển khai nhiều migration cạnh tranh.
- Mỗi task có objective, dependencies, files affected, expected behavior, positive and negative tests, rollout/rollback and concrete completion evidence.
- Kết thúc phiên bằng trạng thái `CONTINUE`, `BLOCKED_HANDOFF`, `PAUSED_LIMIT`, hoặc `ENGINEERING_ACCEPTED`; chỉ tuyên bố `ENGINEERING_ACCEPTED` khi toàn bộ yêu cầu kỹ thuật hiện hành được xác nhận và không còn blocker kỹ thuật P0/P1. Không tự đánh đồng trạng thái này với hoàn tất pháp lý/thương mại/kinh doanh.
- Hết task trong backlog chưa phải hoàn thành dự án: so lại mọi user journey, yêu cầu không phủ kiểm thử, nợ kỹ thuật, performance, security, accessibility, recovery, docs, vận hành; phát sinh task mới khi có căn cứ, tránh tạo việc vô hạn không tạo giá trị.
- Giới hạn retry lỗi giống nhau: tối đa 3 thử nghiệm có giả thuyết khác nhau; nếu chưa giải quyết, ghi log/bằng chứng rồi làm task độc lập khác hoặc báo blocker. Không loop vô hạn lỗi/tốn tiền.
- Dừng khi có STOP của Owner, sử dụng đạt quota/budget được cấp, nguy cơ lộ dữ liệu, sai nhánh hoặc nghi ngờ không kiểm soát được quyền. Không tăng ngân sách hoặc đổi công cụ để né quota.

## 4. CHU TRÌNH MỖI PHIÊN / MỖI TASK
PRE-FLIGHT:
1. `pwd`, `git status --porcelain=v1`, `git remote -v`, `git branch -vv`, `git rev-parse HEAD`, `git fetch --prune origin` (nếu có quyền và network), kiểm nhánh làm việc và remote HEAD. Không dùng lệnh phá dữ liệu để dọn working tree.
2. Đọc `AGENTS.md`/`CLAUDE.md` nếu có, quyết định mới, backlog, acceptance matrix, CI/PR reports và checklist. Xác minh tool versions, env, dev DB và các quyền hiện hữu; không xuất biến nhạy cảm ra log.
3. Nếu repo mặc định đang ở empty-root `main`, checkout đúng working branch hay tạo nhánh `claude/` riêng từ origin/working; KHÔNG xây lại dự án trên empty-root.
4. Kiểm một job khác có đang viết branch không. Nếu có, chuyển read-only review/hold.
SELECT:
5. Chọn task P0/P1 khả thi có giá trị lớn nhất: security/tenancy + data persistence + end-to-end mobile/web trước; sau đó documents, evidence-based AI, workflow, partner, user rights, billing sandbox, performance, accessibility, localization, operations.
6. Đối chiếu `docs/plan/backlog.json` với 22 work orders, 46 acceptance tests và PRD. Nếu thay dependency, ghi trước/sau và lý do; không xóa silently một nhiệm vụ cần người.
EXECUTE:
7. Thay đổi vừa đủ, giữ kiến trúc, tuyệt đối không mock thành công giả; tạo migration có checksum/rollback strategy; seed synthetic test data.
8. Viết kiểm thử thành công, lỗi, RBAC/RLS âm, transaction/concurrency, dữ liệu thiếu, API errors, idempotency và các tình huống audit phù hợp task.
VERIFY:
9. Chạy package-manager/format/lint/typecheck/test; kiểm Postgres RLS với quyền application thực, không dùng superuser/BYPASSRLS làm bằng chứng người dùng; kiểm migration trên DB test; chạy `npm run verify` nếu lệnh còn tồn tại và đúng nghĩa.
10. Lấy exit code chính xác, không lấy exit code của `tail` hoặc pipeline cuối. Có lỗi thì sửa và chạy lại; test phải gắn đúng SHA nguồn đang xét.
11. Các test Txx chỉ được `PASS` trong phạm vi thực sự chạy. Nếu chỉ bao phủ một phần, `coverage=PARTIAL` và tổng acceptance `INCOMPLETE`. Không biến SKIP thành PASS; không có bằng chứng thì `NOT_RUN`/`UNVERIFIED`.
12. Trước push chạy quét secrets và diff; không in key, token, tài liệu khách thật hay payload nhạy cảm. Security findings có bản ghi và mức độ ảnh hưởng.
DELIVER:
13. Cập nhật checklist & evidence receipts có SHA, command, status, UTC, môi trường, tệp, test IDs, limitations và vị trí log. Dữ liệu thiếu không được tự ghi 0.
14. Commit có message mô tả scope, push non-force nếu quyền cho phép. Xác minh remote HEAD sau push và CI/check run theo HEAD đó. CI chưa chạy/chưa xong -> `PENDING`, không báo xanh.
15. Giữ PR #1 draft, không tự merge `main`. Nếu cloud routine không được push working branch, tạo `claude/<scope>` với base đúng development branch và draft PR; không tạo PR vào main rỗng cho các task riêng trừ khi có chỉ thị mới.
16. Ghi checkpoint để phiên sau có thể đọc lại mà không dựa vào chat. Xuất báo cáo ngắn VI và tiếp tục theo scheduler đã xác minh.

## 5. THỨ TỰ SẢN PHẨM PHẢI TRIỂN KHAI
P0 CORE: identities, organizations, memberships, role policies, RLS; auth real khi có approved identity provider; web/mobile shell; manual item creation; persisted DB; cross-tenant negative tests; audit trail và error handling.
P1 CUSTOMER / DESK: items/receipts/document upload với private storage và quyền theo tệp; claims workflow; statuses, assignment, notes, due dates; partner scoped access; export/delete user data; i18n VI/EN; accessibility, dark/light, mobile-first.
P2 AI: AI_PROVIDER disabled mặc định. Xây interface dễ thay provider, extraction with evidence location, source confidence fields, user confirmation, deterministic fallback nhập tay. Chống prompt injection trong documents; mọi action nhạy cảm cần xác nhận.
P3 COMMERCIAL SANDBOX: plans, entitlements, subscriptions test mode, webhook replay protection, ledger hóa đơn/hoàn tiền theo chứng từ; không bật live money.
P4 RELIABILITY & RELEASE CANDIDATE: E2E, cross-browser/device matrix, load profile, CI quality gates, threat modeling, SAST/DAST khi có điều kiện thực, operational runbooks, backup/restore drill, dependency audit, app builds thực, accessibility and privacy review.
P5 MARKET READINESS (không coi machine-only): evidence of customer demand, 30 interviews, paid pilots, trademark and legal counsel, market-country compliance, app store review, approved production rollout. Chuẩn bị artifacts, không tự PASS hoặc tuyên bố đã hoàn tất.

## 6. CÁC GATE VÀ DEFINITION OF DONE
G0 Tool/ownership: code export & clean build; Git/source controlled; reproducible env; permission gates; builder licensing unresolved có trạng thái mở.
G1 Security/data: test cases tenant isolation positive/negative, no privilege escalation, authenticated sessions real (hoặc rõ synthetic/shim), private file access, audit; missing provider -> BLOCKED not fake done.
G2 E2E MVP: account -> item -> document/manual input -> claim -> merchant handling -> partner if in P0 -> closure/export; persistence and mobile/web functional.
G3 Quality: passing CI on current SHA, E2E + negative, performance profile reproduces measurements, browser/device tests recorded, accessibility/security issues triaged.
G4 Pilot: actual testers, measurable work reduction, issues, privacy handling; only evidenced with real study.
G5 Production: approval, legal/brand, support, incident, backup/restore, payments/app stores, production credentials/environment, release decision.
A gate = PASS only with source-linked receipts and all mandatory criteria fulfilled. Một số gate chỉ người được ủy quyền nghiệm thu; Claude chỉ tạo evidence package.

## 7. CÁC VẤN ĐỀ HIỆN CẦN KIỂM CHỨNG
- PR #1 draft, branch `ccr-4544c9f7-b1t50m`; `main` empty root via -s ours (verify). Không tự sửa lịch sử.
- T37, T03, T06 con tests PASS nhưng coverage PARTIAL. Yêu cầu thêm phạm vi còn thiếu.
- WO04-02: thống nhất quyền TypeScript/API và SQL; WO04-03: tenant isolation; WO07-01: manual items + persistence trước AI extraction.
- Shim auth ≠ production auth. Không gọi đăng nhập thật khi chưa có provider được duyệt, token expiry/revocation và audit ở API.
- DAST HawkScan blocked do chạy app/credential; không tự né blocker.
- `legacy-peer-deps`, `allowJs` without `checkJs` là ngoại lệ có theo dõi; không tuyên bố tương thích đầy đủ.
- T40 thiếu load profile, T36 thiếu browser version pinning; ưu tiên bổ sung acceptance fixture.
- Financial modeling là kịch bản, không hứa doanh thu hay valuation.

## 8. THIẾT KẾ PHỐI HỢP AGENTS
- Lead: quyết định kiến trúc và task kế tiếp, chịu trách nhiệm tích hợp.
- Reviewer: read-only kiểm diff, rủi ro, khả năng rollback.
- QA: độc lập kiểm negative/E2E và mapping test->acceptance.
- Security: threat model, RLS, secrets, access controls; không dùng admin làm chứng cứ.
- UX/A11y: mobile/web task flows, translations, keyboard, screen-reader.
- Ops: CI, logs, alarms, backup, migration readiness.
Có thể dùng subagent cho nhiệm vụ song song, nhưng phải hạn chế chi phí, không tranh nhau ghi cùng file/schema/branch và không mô phỏng review độc lập của người thật.

## 9. CHECKPOINT & EVIDENCE (DURABLE)
Duy trì (tạo nếu thiếu, không xóa dữ liệu cũ):
- `docs/plan/05_AUTONOMY_STATUS.md`: task, SHA, active scheduler, owner/branch, blockers, next action, budget state, verified last run.
- `docs/plan/06_DECISION_QUEUE.md`: decisions risk/scope/cost, draft options, human approvals needed.
- `docs/plan/evidence/AUTO_RUNS/`: file per run UTC ID, command exit codes, test reports, links CI, limitation.
- `docs/plan/07_RELEASE_READINESS.md`: matrix requirements->proof->status, independent from backlog DONE count.
- `.claude/loop.md`: short next-iteration prompt; no secrets.
Dùng atomic update, không để checkpoint đang viết dang dở. Tránh commit log chứa dữ liệu nhạy cảm. Mỗi receipt gắn source SHA; không dùng file trạng thái như bằng chứng độc lập.

## 10. BÁO CÁO THEO MỖI PHIÊN
Viết ngắn, không marketing, có:
- UTC/VN time, branch, HEAD before/after, PR link, CI at exact SHA.
- Task planned/completed; source files/migrations changed; command + true exit code; tests: passed/failed/skipped by T-ID and coverage.
- P0/P1 open, blockers (machine vs human), newly detected defects, quota/budget status and next actionable task.
- Phân loại Verified / Partial / Unverified / Blocked. Không khai 100% khi chưa có end-to-end production-ready proof.

## 11. LỆNH HÀNH ĐỘNG NGAY
1. Đọc và reconcile trạng thái remote mới nhất, PR #1 và `docs/plan`.
2. Xác nhận không có writer nào trùng vòng lặp trước khi sửa.
3. Tiếp tục WO04-02 nếu vẫn chưa DONE theo evidence, sau đó WO04-03 và WO07-01; ưu tiên vertical slice A/B isolation + manual item persisted dùng web/mobile.
4. Có full evidence thì commit/push bình thường và cập nhật checkpoint.
5. Kết thúc phiên bằng hành động tiếp theo và chỉ dùng scheduler thực sự có quyền + đã xác minh. Không giả lịch 24/7, không đòi người dùng giao từng task phát triển nội bộ.

## FINAL DIRECTIVE
Hãy thực hiện, không chỉ lập thêm kế hoạch. Khi một thay đổi có thể làm an toàn trong phạm vi cho phép, tự làm, kiểm và giao chứng cứ. Khi không thể, chứng minh blocker và làm tiếp phần độc lập. Không hứa hoàn tất 100% toàn bộ thương mại và pháp lý nếu chưa có nguồn lực/nghiệm thu thật.
