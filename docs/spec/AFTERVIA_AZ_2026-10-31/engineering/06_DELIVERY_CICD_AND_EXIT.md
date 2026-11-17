# Delivery, CI/CD và thoát nhà cung cấp
## Repository
Protected main, feature branch mỗi work order, PR review độc lập. Lockfile, README, .env.example không secret; schema migration có số phiên bản; test data synthetic; CI lint/typecheck/unit/integration/E2E/security/license scan.
Manifest dự kiến nằm ở `10_REPO_FILE_MANIFEST.csv`; các đường dẫn đó chưa phải code tồn tại.

## Build
Pin framework/dependencies sau kiểm version chính thức tại thời điểm triển khai, không hardcode “latest”. Mobile cần development/release builds phù hợp, không chỉ Expo Go [S28]. CI phải ghi commit SHA, version, dependency lock, build logs và artifact checksum.
Secrets do người có quyền cấp trong secret store, không gửi vào chat. App signing và store accounts của pháp nhân sở hữu.

## Migration/release
Migration staging → backup → rehearsal → release approval → production canary → health checks → mở rộng. Destructive migration cần phương án phục hồi và owner duyệt.
Feature flags tách AI, sharing, billing và country. Rollback app không đủ nếu DB đã biến đổi; giữ compatibility trong ít nhất một chu kỳ release.

## Exit test bắt buộc trước dữ liệu thật
Export code, dependencies/licenses, migrations, media/data schema, legal terms; clone clean; install từ lock; run tests; build web/mobile; deploy staging độc lập; restore DB/storage; so số lượng và hash.
Không làm được bước export source thì prototype không được gọi tài sản công nghệ độc lập. Data export chỉ là dữ liệu, không thay source export.

## Receipt sau mỗi task
work_order, branch/commit, changed_files, migrations, tests_run, result, screenshot/log evidence, known_limitations, rollback, cost_used, approvals_needed. Chưa chạy ghi NOT_RUN; không suy PASS từ việc code compile.
