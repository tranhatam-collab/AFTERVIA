# Bộ nhận diện AFTERVIA: bảng màu, chữ và quy tắc áp dụng

- Nguồn: bảng nhận diện do chủ dự án gửi ngày 31/10/2026 (ảnh tham chiếu). Chưa có tệp thiết kế gốc (SVG, Figma).
- Trạng thái: đã áp dụng cho landing (`apps/landing/`). Dùng làm chuẩn cho ứng dụng web (WO10) khi bắt đầu.

## 1. Bảng màu

| Vai trò | Tên | Mã | Dùng cho |
|---|---|---|---|
| Chính | Forest Green | #0F4D3A | Nút chính, nền biểu tượng, chữ liên kết và viền focus (chế độ sáng) |
| Điểm nhấn | Leaf Green | #22C55E | Lá trong biểu tượng, nút và viền ở chế độ tối. Không dùng làm chữ trên nền sáng |
| Nền sáng | Warm White | #F8FAF7 | Nền trang chế độ sáng, chữ trên nền chính |
| Chữ và nền tối | Charcoal | #1F2937 | Chữ chế độ sáng, nền trang chế độ tối |
| Chữ phụ | Neutral Gray | #6B7280 | Chữ mô tả ở chế độ sáng |

Token trong `apps/landing/src/styles.css`:

| Token | Sáng | Tối |
|---|---|---|
| `--color-paper` | #F8FAF7 | #1F2937 |
| `--color-surface` | #FFFFFF | #273342 |
| `--color-ink` | #1F2937 | #F8FAF7 |
| `--color-ink-muted` | #6B7280 | #A7B0BD |
| `--color-primary` | #0F4D3A | #22C55E |
| `--color-on-primary` | #F8FAF7 | #1F2937 |
| `--color-link` | #0F4D3A | #4ADE80 |
| `--color-accent` | #0F4D3A | #22C55E |
| `--color-leaf` | #22C55E | #22C55E |
| `--color-focus` | #0F4D3A | #4ADE80 |

Các sắc phụ không có trong bảng nhận diện (ví dụ #273342, #A7B0BD, #4ADE80, #173A2A, #BBF7D0, #E4F2E9, #34414F, #DCE3DE, #8A5A0E, #E8B45C) được suy ra để đạt tương phản. Designer cần xác nhận hoặc thay thế.

Tương phản: `tests/web/landing.test.ts` kiểm mọi cặp chữ đạt tối thiểu 4,5:1 và viền focus, điểm nhấn đạt 3:1, ở cả hai chế độ. Cặp sát ngưỡng nhất là Neutral Gray trên Warm White.

## 2. Chữ

- Inter, giấy phép SIL Open Font License 1.1 (kèm trong `apps/landing/public/fonts/LICENSE-Inter.txt`).
- Bản biến thiên (trọng số 100 đến 900), hai subset latin và vietnamese, tự host trong `apps/landing/public/fonts/`.
- Không tải font từ CDN vì CSP của landing là `font-src 'self'` và chính sách không theo dõi người dùng.
- Dự phòng: `system-ui` và các font hệ thống.

## 3. Logo và tagline

- Tên: AFTERVIA, chữ đậm, giãn chữ 0,08em trên landing.
- Biểu tượng: chữ A có lá. Bản trong repo (`apps/landing/public/favicon.svg` và hàm `renderMark()`) là **bản phỏng dựng** từ ảnh tham chiếu, không phải tệp gốc. Thay bằng SVG gốc khi có.
- Tagline: THINGS LIVE LONGER.
- Câu tiếng Việt: "Quản lý hậu mãi để mọi thứ bền lâu."
- Câu tiếng Anh: "Manage aftercare. Make things last longer."
- Tên và tagline chưa đăng ký hoặc kiểm tra nhãn hiệu (D13). Không tuyên bố độc quyền.

## 4. Quy tắc áp dụng

- Không dùng ảnh người hoặc ảnh sản phẩm stock làm bằng chứng.
- Không dùng mockup ứng dụng như thể đã có tính năng. Ảnh mockup trong bảng nhận diện là ý tưởng thiết kế.
- Không đặt huy hiệu, con dấu hay biểu tượng chứng nhận.
- Trang marketing luôn tách rõ đang có, đang thử và dự kiến.
- Chữ trên nền sáng dùng Forest Green hoặc Charcoal. Leaf Green chỉ là điểm nhấn trang trí, hoặc chữ trên nền tối.

## 5. Chưa làm

- Bộ biểu tượng ứng dụng (phiên bản sáng, tối và xanh lá) trong bảng nhận diện chưa được tạo.
- Giao diện web chế độ sáng trong bảng nhận diện chỉ là tham chiếu, chưa triển khai (WO10).
- Chưa có tệp SVG gốc và chưa có kiểm tra nhãn hiệu.
