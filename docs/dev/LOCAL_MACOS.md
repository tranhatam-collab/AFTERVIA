# Chạy AFTERVIA trên máy macOS (dev local)

Tài liệu này dành cho chủ dự án, để chạy và kiểm thử AFTERVIA trên máy macOS của mình. Mỗi lệnh ghi ở đây đã được chạy; mục 11 nói rõ phần nào chưa kiểm trên macOS.

**Trạng thái:** WO26-01 và WO26-02, cập nhật 03/11/2026. Đã kiểm trên container Linux với Node 22.23.4, npm 10.9.9 và PostgreSQL 16.15. Chưa kiểm trên macOS.

## 1. Yêu cầu

- macOS.
- Node.js 22, bản 22.12 trở lên. Repo ghi `22` trong `.nvmrc`, và `package.json` yêu cầu `>=22.12 <23`.
- PostgreSQL 16. CI của repo dùng `postgres:16`. Dùng đúng bản 16 để khớp CI; bản 17 chưa được kiểm trong repo này.
- Git.

## 2. Cài công cụ

Các lệnh dưới đây là ví dụ cho macOS, chưa kiểm trên máy thật.

**Node 22.** Dùng nvm hoặc fnm để cài Node 22 (repo đọc `.nvmrc`), hoặc dùng Homebrew:

```bash
brew install node@22
node -v   # phải ra v22.x, không thấp hơn 22.12
```

**PostgreSQL 16.** Chọn một cách:

- Postgres.app: tải bản dành cho PostgreSQL 16 và khởi động ứng dụng. Nếu máy đã có Postgres.app bản 17, vẫn cài thêm bản 16 và đặt PATH trỏ tới bản 16 khi làm việc với repo này.
- Homebrew:

```bash
brew install postgresql@16
brew services start postgresql@16
psql --version   # phải ra 16.x
```

## 3. Lấy mã và cài thư viện

```bash
git clone <địa chỉ repo của chủ dự án> AFTERVIA
cd AFTERVIA
npm ci
```

`npm ci` cài đúng phiên bản trong `package-lock.json` và áp dụng `.npmrc` của repo (`legacy-peer-deps=true`). Không dùng `npm install` để cài theo lockfile.

## 4. Cơ sở dữ liệu `_test`

Quy tắc: tên DB phải kết thúc bằng `_test`. Công cụ migration (`tools/db/migrate.mjs`) và bộ kiểm thử từ chối mọi tên khác.

Tạo DB. Nếu `createdb` không có trong PATH, dùng `psql` và chạy `create database aftervia_test;`:

```bash
createdb aftervia_test
```

Đặt biến môi trường. Giá trị đặt trên máy của chủ dự án, không dán vào chat, không commit:

```bash
export TEST_DATABASE_URL="postgres://<tên-người-dùng>@localhost:5432/aftervia_test"
```

- Nếu cụm PostgreSQL có mật khẩu, mật khẩu chỉ nằm trong URL trên máy này.
- Repo không tự nạp tệp môi trường. Nếu muốn giữ biến trong `.env.local` ở gốc repo, nạp bằng `set -a; source .env.local; set +a` trước khi chạy lệnh. `.env` và `.env.*` đã bị `.gitignore` bỏ qua; tệp đó không được commit.

Áp dụng migration lên DB `_test`:

```bash
npm run db:migrate -- --with-shim
```

- `--with-shim` nạp `tests/support/local-auth-shim.sql`, giả lập schema `auth` của Supabase trên PostgreSQL cục bộ. Chỉ dùng cho DB `_test` trên máy phát triển. Không bao giờ chạy có shim trên Supabase hoặc trên DB thật.
- Đã kiểm: trên DB `_test` mới, lệnh cho kết quả `applied 19, already applied 0`.

> **Cảnh báo.** Mỗi file kiểm thử cơ sở dữ liệu gọi `resetTestDatabase()`. Hàm này XÓA và tạo lại các schema `public`, `auth` và `aftervia_meta` của DB được trỏ tới. Chỉ trỏ `TEST_DATABASE_URL` vào DB `_test` dành riêng cho kiểm thử. Không trỏ vào DB có dữ liệu cần giữ.

## 5. Kiểm tra cả bộ: `npm run verify`

```bash
npm run verify
```

Lệnh này chạy theo thứ tự: kiểm bundle (các tệp khớp `04_SHA256SUMS.txt`), quét bí mật, typecheck gốc và mobile, build landing và Desk, toàn bộ Vitest, và kiểm thử của công cụ vòng lặp. Cần `TEST_DATABASE_URL` đã được đặt trong shell.

Kết quả tại thời điểm viết (03/11/2026): exit 0; bundle 69/69; quét bí mật 279 tệp, 5 luật; Vitest 53 tệp pass và 1 tệp bỏ qua, 395 kiểm thử pass và 1 bỏ qua; test:loop 18/18. Số liệu này thay đổi khi repo thay đổi; chạy lại để có kết quả hiện tại.

## 6. Chạy Desk (giao diện web)

```bash
npx vite --config apps/web/vite.config.ts --port 5173 --strictPort
```

Mở `http://localhost:5173/`. Đã kiểm: máy chủ phát triển (Vite 8.3.5) trả HTTP 200 và trang có phần tử `root`.

- Trong chế độ dev, Desk gọi `/v1` cùng gốc và Vite chuyển tiếp tới `AFTERVIA_LOCAL_API_URL` (mặc định `http://127.0.0.1:8787`). Nhờ vậy không cần CORS và không cần đặt `VITE_API_BASE`. Chạy API cục bộ (mục 7) trước khi mở Desk.
- `VITE_API_BASE` chỉ dùng khi build trỏ Desk tới một API khác. API chưa có CORS, nên cách đó chưa dùng được trong trình duyệt.
- Token phát triển: chỉ trong chế độ dev, Desk đọc token từ `sessionStorage` với khóa `aftervia.dev.token`. Đặt token bằng công cụ dành cho nhà phát triển của trình duyệt. Không dán token vào chat hay commit.

## 7. Chạy API cục bộ

Đặt hai biến trong shell. Giá trị chỉ nằm trên máy này, không dán vào chat, không commit:

```bash
export AFTERVIA_LOCAL_DATABASE_URL="$TEST_DATABASE_URL"
export AFTERVIA_LOCAL_JWT_SECRET="$(openssl rand -hex 32)"
npm run api:local
```

- API nghe tại `http://127.0.0.1:8787`. Đổi cổng bằng `AFTERVIA_LOCAL_PORT` (từ 1024 đến 65535).
- Kiểm nhanh: `curl -s http://127.0.0.1:8787/healthz` trả `{"ok":true}`.
- Dừng bằng Ctrl+C, hoặc `kill -TERM <pid>` nếu chạy nền.
- Chế độ luôn là kiểm thử: đăng nhập giả lập (`POST /v1/dev/sign-in`, cần `user_id` có sẵn trong `auth.users` của DB `_test`) đang bật. `AFTERVIA_LOCAL_APP_ENV` bị từ chối nếu được đặt.
- Không khởi động nếu: tên DB không kết thúc bằng `_test`; URL trỏ tới máy khác; URL có tham số `dbname`; khóa dưới 32 ký tự; cổng ngoài khoảng cho phép. Lỗi được in ra mà không in URL hay khóa.
- Mã nguồn: `services/api/src/local/start-local.ts` (ràng buộc và khởi động) và `tools/dev/api-local.mjs` (trình chạy, dùng trình nạp của Vite, không thêm phụ thuộc).

## 8. Biến môi trường (chỉ tên)

| Tên | Dùng ở đâu | Bắt buộc |
|---|---|---|
| `TEST_DATABASE_URL` | kiểm thử, `npm run db:migrate`, `npm run verify` | Có, khi chạy các lệnh đó. Tên DB phải kết thúc `_test` |
| `AFTERVIA_LOCAL_DATABASE_URL` | `npm run api:local` | Có. Tên DB kết thúc `_test`; máy chủ là máy này |
| `AFTERVIA_LOCAL_JWT_SECRET` | `npm run api:local` | Có. Ít nhất 32 ký tự; không in ra |
| `AFTERVIA_LOCAL_PORT` | `npm run api:local` | Không. Mặc định 8787; từ 1024 đến 65535 |
| `AFTERVIA_LOCAL_API_URL` | Desk khi chạy dev (proxy `/v1`), E2E | Không. Mặc định `http://127.0.0.1:8787` |
| `VITE_API_BASE` | Desk, khi build | Không; để trống khi chạy dev |
| `AFTERVIA_E2E_PLAYWRIGHT` | `npm run e2e:web` | Không. Chỉ cần khi muốn trỏ tới một bản `playwright` khác; repo đã ghim `playwright ^1.65.0` trong `package.json` |
| `EXPO_PUBLIC_API_BASE` | ứng dụng di động (Expo) | Không thuộc phạm vi tài liệu này |

## 9. Không đưa vào repo, chat, hoặc log

- Mật khẩu, khóa dịch vụ, khóa API, JWT secret, token phiên.
- Dữ liệu thật. DB `_test` chỉ chứa dữ liệu tổng hợp.
- `npm run check:secrets` chạy trong `verify`, nhưng không thay thế việc tự giữ bí mật.

## 10. Lỗi thường gặp

- `TEST_DATABASE_URL is required`: chưa export biến trong shell đang chạy lệnh.
- `refusing to use database "...": its name must end with _test`: tên DB không đúng. Tạo DB có hậu tố `_test`.
- `ECONNREFUSED` tới `localhost:5432`: PostgreSQL chưa chạy hoặc chạy ở cổng khác. Kiểm tra cổng và dịch vụ.
- `npm ci` lỗi: kiểm tra `node -v` (phải 22.12 trở lên). Không xóa `package-lock.json` để "sửa".
- Lỗi checksum khi migration: không sửa migration đã áp dụng; báo chủ dự án.
- Bước `Dependency audit` (`npm audit --omit=dev --audit-level=high`) chỉ có trong CI, không nằm trong `verify`. Cổng này **đã hết đỏ** từ head `487d084` (run 42803201074, bước 7 đạt).
- `AFTERVIA_LOCAL_DATABASE_URL is not set`, `AFTERVIA_LOCAL_JWT_SECRET must be at least 32 characters` hoặc `refusing to use database`: cấu hình của `npm run api:local` chưa đúng. Xem mục 7.

## 11. Đã kiểm và chưa kiểm

- Đã kiểm trên container Linux với Node 22.23.4, npm 10.9.9 và PostgreSQL 16.15 (03/11/2026): `npm ci`; `npm run db:migrate -- --with-shim` trên DB `_test` mới (lúc đó 19 migration; nay 34); `npm run verify` (exit 0); máy chủ phát triển Desk trả HTTP 200.
- Đã kiểm WO26-02 trên container Linux (03/11/2026), `npm run api:local` với DB `_test`: thiếu cấu hình và tên DB sai đều bị từ chối (thoát 1); khởi động thật trả `/healthz` 200 và đăng nhập giả lập 200; chỉ nghe trên `127.0.0.1` (kiểm trong `/proc/net/tcp`; địa chỉ không phải loopback bị từ chối); SIGINT và SIGTERM dừng và giải phóng cổng; nhật ký không chứa khóa hay URL. Kiểm tự động: `tests/api/local-start.test.ts`.
- Đã kiểm E2E-WEB-01 trên container Linux (03/11/2026): `npm run e2e:web` chạy trọn luồng, xem mục 12.
- Chưa kiểm: mọi lệnh cài đặt trên macOS (Homebrew, Postgres.app, nvm, fnm); trình duyệt trên macOS; ứng dụng di động; API cục bộ và E2E trên macOS; Safari và Firefox (DEV-02).

## 12. E2E trên Chromium (E2E-WEB-01)

Luồng đầy đủ trên DB `_test` cục bộ: thêm món, mở case, gắn bằng chứng và mời người tham gia (chỉ metadata, qua hàm cơ sở dữ liệu), chia tài liệu, Desk xử lý (gửi, phân loại, xử lý, giải quyết có outcome, đóng), xuất gói (T24), và yêu cầu xóa tài khoản trên màn Quyền riêng tư (T25, thêm 10/11).

Gói `playwright` đã có trong `package.json`, nhưng **trình duyệt thì chưa**: `npm ci` không tải Chromium.
Cài một lần trước khi chạy e2e lần đầu:

```bash
npx playwright install chromium
```

```bash
export TEST_DATABASE_URL="postgres://<tên-người-dùng>@localhost:5432/aftervia_test"
npm run e2e:web
```

Nếu máy đã có sẵn Chromium của Playwright ở nơi khác, đặt `PLAYWRIGHT_BROWSERS_PATH` trỏ tới thư mục đó
thay vì tải lại. Lỗi `Executable doesn't exist ... chromium_headless_shell-<số>` nghĩa là bản `playwright`
đang dùng cần một **revision** trình duyệt khác với bản đã cài; chạy lại `npx playwright install chromium`
cho đúng bản `playwright` của repo.

- Lệnh đặt lại DB `_test` (schema, shim, migration), chạy API cục bộ tại `127.0.0.1:8787` và Desk tại `127.0.0.1:5173`, rồi mở Chromium. Kết quả: `.loop/e2e/summary.json`, ảnh `.loop/e2e/*.png`, nhật ký API `.loop/e2e/api.log`. Thư mục `.loop/` không commit.
- Thoát 0 nếu mọi bước đạt **và** không có lỗi trang **và** không có lỗi console. Thoát 1 và in bước lỗi nếu không.
- Không nằm trong `npm run verify` (cần Chromium cục bộ), nhưng **có chạy trên CI** từ `7c852c9`: job `e2e-web` trong `.github/workflows/ci.yml`. Ma trận T24 và T25 vẫn lấy trạng thái từ Vitest qua `matrix.mjs from-report`; e2e là bằng chứng bổ sung trên trình duyệt thật.
- Giới hạn: chỉ Chromium; Desk chưa có CSS hoàn chỉnh; form mở case chưa gửi mã tài liệu, nên bằng chứng được gắn bằng hàm cơ sở dữ liệu.
