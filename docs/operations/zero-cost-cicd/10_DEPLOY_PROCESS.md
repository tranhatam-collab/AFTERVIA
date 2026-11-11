# 10 — Quy trình triển khai landing (giai đoạn H)

**Trạng thái: CHƯA THỰC HIỆN.** Tài liệu mô tả quy trình khi đủ điều kiện (xem `09_CONTROLLED_SWITCH.md`).

Phạm vi: chỉ `apps/landing` (tĩnh). API và web app không thuộc quy trình này.

## Thông số build (đã kiểm cục bộ)

| Thông số | Giá trị | Nhãn |
|---|---|---|
| Lệnh build | `node apps/landing/build.mjs` (script gốc `build:landing`) | [V] |
| Thư mục đầu ra | `apps/landing/dist` | [V] |
| Số tệp đầu ra (lần build này) | 13 | [V] |
| Tệp `_headers` | có trong đầu ra | [R] lượt trước |
| Biến `AFTERVIA_SITE_ENV` | `production` hoặc `preview`. Không đặt thì mặc định `preview`. Giá trị khác sẽ làm build lỗi | [V] (`build.mjs` dòng 16–18) |
| Robots | `preview`: `noindex,nofollow`, `Disallow: /`. `production`: `index,follow` | [V] (`render.mjs` dòng 123) |
| Phiên bản Node | `NODE_VERSION=22`, khớp `.nvmrc` | [R] (`apps/landing/README.md` dòng 56) |
| Nhánh production | chưa chọn. Không đặt nhánh `ccr-*` làm production khi chưa có phê duyệt | [R] (README dòng 57) |

Cấu hình Pages đề xuất, theo `apps/landing/README.md`:

- Build command: `node apps/landing/build.mjs`
- Output directory: `apps/landing/dist`
- Biến Preview: `NODE_VERSION=22`, `AFTERVIA_SITE_ENV=preview`
- Biến Production: `NODE_VERSION=22`, `AFTERVIA_SITE_ENV=production`, chỉ khi đã được duyệt [P]

## Giới hạn gói Pages (tra cứu web, 2026-11-11)

Gói Free: 500 build mỗi tháng; 1 build chạy đồng thời; mỗi build tối đa 20 phút. [R]

Số liệu băng thông và số request của gói Free được các trang tổng hợp ghi là không giới hạn, nhưng văn bản chính thức đã xem không xác nhận điều này. [U]

Nguồn để đối chiếu: trang giới hạn của Cloudflare Pages (developers.cloudflare.com/pages/platform/limits).

## Quy trình

1. **Tạo project** (chủ dự án). Kết nối repo hoặc chọn cách tải thủ công. Đặt biến như trên. Không đặt token trong repo.
2. **Preview:** mỗi nhánh được build thành một preview. Kiểm tra: build xong, `_headers` có mặt, robots là `noindex`, không có nội dung chưa duyệt.
3. **Duyệt nội dung** (HUM-WEB-03). [P]
4. **Merge vào `main`** là việc của chủ dự án. Không merge trong lệnh này.
5. **Production:** chỉ sau khi có phê duyệt. Đặt `AFTERVIA_SITE_ENV=production` và build từ nhánh production đã chọn.
6. **Ghi nhật ký:** deployment ID, commit SHA, thời điểm, người duyệt.

## Kiểm soát

- Token API: phạm vi tối thiểu cho Pages, lưu trong secret của Cloudflare hoặc GitHub. Không đưa vào repo, không gửi qua chat. [R]
- Không dùng tên miền production cho preview.
- Quy trình này bị khóa bởi HUM-WEB-03 (nội dung) và D14/WEB-02 (hosting, DNS). [R]
