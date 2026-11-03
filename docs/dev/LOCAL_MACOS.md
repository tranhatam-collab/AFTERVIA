# Chạy AFTERVIA trên máy macOS (dev local)

Tài liệu này dành cho chủ dự án, để chạy và kiểm thử AFTERVIA trên máy macOS của mình. Mỗi lệnh ghi ở đây đã được chạy; mục 11 nói rõ phần nào chưa kiểm trên macOS.

**Trạng thái:** WO26-01, cập nhật 03/11/2026. Đã kiểm trên container Linux với Node 22.23.4, npm 10.9.9 và PostgreSQL 16.15. Chưa kiểm trên macOS.

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

- `VITE_API_BASE`: địa chỉ API mà Desk gọi. Đặt khi chạy dev hoặc khi build. Hiện chưa có API chạy độc lập (mục 7), nên Desk chỉ kiểm được giao diện và các trạng thái không có quyền hoặc lỗi.
- Token phát triển: chỉ trong chế độ dev, Desk đọc token từ `sessionStorage` với khóa `aftervia.dev.token`. Đặt token bằng công cụ dành cho nhà phát triển của trình duyệt. Không dán token vào chat hay commit.

## 7. Chạy API: chưa có lệnh

- Repo chưa có tệp khởi động API. `createHttpServer` trong `services/api/src/http/app.ts` là hàm xuất khẩu: nhận `pool`, `jwtSecret` và `appEnv`, trả về `http.Server`. Hiện chỉ bộ kiểm thử trong `tests/api/` gọi hàm này.
- Trong lúc chờ, API được kiểm qua `npm test` và `npm run verify`.
- Việc còn lại: một tệp khởi động cục bộ có ràng buộc, ghi thành WO26-02 trong backlog. Không tự viết tệp khởi động trỏ vào DB thật hoặc dùng khóa thật.

## 8. Biến môi trường (chỉ tên)

| Tên | Dùng ở đâu | Bắt buộc |
|---|---|---|
| `TEST_DATABASE_URL` | kiểm thử, `npm run db:migrate`, `npm run verify` | Có, khi chạy các lệnh đó. Tên DB phải kết thúc `_test` |
| `VITE_API_BASE` | Desk, khi chạy dev hoặc build | Không; cần khi đã có API |
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
- `npm run verify` đỏ ở bước audit: bước `Dependency audit` chỉ có trong CI, không nằm trong `verify`. Xem blocker đã báo trên PR #1.

## 11. Đã kiểm và chưa kiểm

- Đã kiểm trên container Linux với Node 22.23.4, npm 10.9.9 và PostgreSQL 16.15 (03/11/2026): `npm ci`; `npm run db:migrate -- --with-shim` trên DB `_test` mới (19 migration); `npm run verify` (exit 0); máy chủ phát triển Desk trả HTTP 200.
- Chưa kiểm: mọi lệnh cài đặt trên macOS (Homebrew, Postgres.app, nvm, fnm); trình duyệt trên macOS; ứng dụng di động; chạy API độc lập (chưa có lệnh).
