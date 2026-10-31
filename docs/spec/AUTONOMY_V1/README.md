# Gói tự chủ AFTERVIA v1.0 (bản lưu trữ)

Đây là bản lưu trữ nguyên văn gói `AFTERVIA_CLAUDE_AUTONOMY_V1` do chủ dự án cung cấp ngày 31/10/2026.
Tệp `SHA256SUMS.txt` là bản gốc. Đã kiểm checksum: 8/8 tệp khớp (không tính `loop-prompt.md`).

- `.claude/loop.md` được đổi tên thành `loop-prompt.md` và KHÔNG được kích hoạt trong repo. Lý do: nội dung ưu tiên đã lỗi thời và chưa có quyết định về scheduler (xem `docs/plan/06_DECISION_QUEUE.md`, mục D6). Checksum của `loop-prompt.md` trùng với bản gốc `1c8d754f…`.
- Gói là hướng dẫn, không phải code đã cài. Việc áp dụng thực tế nằm ở `docs/plan/05_AUTONOMY_STATUS.md`, `06_DECISION_QUEUE.md`, `07_RELEASE_READINESS.md` và `docs/plan/evidence/AUTO_RUNS/`.
- Gói không được ghi đè các chính sách hiện có trong `docs/plan/`. Khi mâu thuẫn, `docs/plan/01_LOOP_PROTOCOL.md` và `docs/plan/04_DECISIONS.md` (mục E) được ưu tiên, và mâu thuẫn ghi trong `06_DECISION_QUEUE.md`.
