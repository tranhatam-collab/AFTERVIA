# OWN-A-02 và OD-03, OD-08: đổi ngân sách và phụ thuộc qua công cụ

- Ngày 10/11/2026. Căn cứ: chủ dự án duyệt trong chat ("TÔI DUYỆT HẾT") cho **OD-03** và **OD-08**.

## Vì sao phải thêm lệnh trước khi đổi

Phát hiện A-15 của bản audit: `iteration_budget` từng được sửa **tay** trong `backlog.json`, bên trong
một commit về migration (`2b4bc01`), và `05_AUTONOMY_STATUS.md` ghi sai ngày. Công cụ vòng lặp lúc đó
không có lệnh nào đổi ngân sách, nên không có đường hợp lệ và cũng không có dấu vết.

Vì vậy lượt này **không** sửa tay. Thêm hai lệnh vào `tools/loop/backlog.mjs`:

| Lệnh | Việc |
|---|---|
| `budget <n> --reason "…"` | Đổi `meta.iteration_budget`, ghi `meta.budget_history` gồm thời điểm, từ, đến, lý do |
| `deps <id> --deps a,b,c --reason "…"` | Thay danh sách phụ thuộc, ghi `meta.deps_history` gồm thời điểm, task, từ, đến, lý do |

Cả hai **đòi lý do**, từ chối lý do rỗng hoặc chỉ có khoảng trắng. `budget` từ chối số không nguyên
dương, từ chối giá trị thấp hơn số lượt đã dùng, và từ chối thay đổi không đổi gì. `deps` từ chối task
không tồn tại, phụ thuộc không tồn tại, và tự phụ thuộc; nó cũng bỏ trùng. Sau mỗi lệnh, công cụ vẫn
chạy `validateBacklog` và **từ chối ghi** nếu backlog không hợp lệ.

7 kiểm thử mới trong `tools/loop/backlog.test.mjs`, nâng `npm run test:loop` từ 18 lên **25**.

## OD-03: ngân sách 65 → 126

```
$ node tools/loop/backlog.mjs budget 126 --reason "OD-03: chủ dự án duyệt trong chat 10/11/2026 (…)"
budget 65 -> 126
```

`meta.budget_history` nay có bản ghi đầu tiên. Lần nâng trước (60 → 65) không có bản ghi vì nó được
sửa tay; điều đó đã ghi trong `09_AUDIT_2026-11-10.md` (A-15) và không truy ngược được.

## OD-08: cổng pháp lý chuyển về task phát hành

Trước đây WO11-03, WO12-01 và WO16-01b phụ thuộc `WO11-02d`, `WO11-02e`, `WO11-02f`, `WO11-02g` — bốn
task **HUMAN** chờ luật sư duyệt danh mục xóa. Vì thế ba task AUTO đó không bao giờ mở được, kể cả khi
có ngân sách.

Thay đổi:

1. Thêm task HUMAN **`HUM-LEGAL-DEL-01`**: luật sư xác nhận danh mục xóa và giữ lại dữ liệu
   (`legal/04`) trước khi phát hành.
2. `WO20-01` (checklist phát hành G4) nay phụ thuộc `HUM-LEGAL-DEL-01`. **Cổng pháp lý vẫn còn, chỉ
   dịch tới điểm phát hành.**
3. WO11-03, WO12-01, WO16-01b nay phụ thuộc các lát AUTO **đã DONE**: `WO11-02a`, `WO11-02b`,
   `WO11-02c`, `WO11-02e-EXP`, `WO11-02e-CONF`, `WO11-02e-CASE`, `WO11-02f-SESS`, `WO11-02g-MEM`.
4. Bốn task HUMAN cha **giữ nguyên trạng thái mở**. Không task nào bị đóng.
5. Mã liên quan tới danh mục xóa sẽ gắn cờ `LEGAL_PENDING` khi viết (WO11-03 trở đi).

Sau khi áp: `decide` trả `START` cho `WO11-03`, `next` trả `["WO11-03","WO12-01","WO16-01b"]`.

## Giới hạn

- OD-08 **nới một cổng pháp lý ở tầng dev**. Nó chỉ an toàn vì ba điều: cổng vẫn chặn phát hành qua
  `HUM-LEGAL-DEL-01`, các task HUMAN cha vẫn mở, và mã bị gắn cờ. Nếu `HUM-LEGAL-DEL-01` bị đóng mà
  luật sư chưa duyệt thì cổng mất tác dụng.
- Lịch sử `budget_history` chỉ ghi từ lượt này. Các thay đổi trước đó không có dấu vết.
- `deps` thay cả danh sách, không có chế độ thêm hoặc bớt từng phần tử; cố ý giữ đơn giản để mỗi lần
  đổi đều ghi rõ trạng thái trước và sau.
