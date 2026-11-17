# AFTERVIA — INDEPENDENT READ-ONLY AUDIT

Không viết mã, tạo commit/push, thay đổi backlog, PR, schedule hoặc secrets. Trên nhánh development đang triển khai:
1. Kiểm SHA hiện tại, tree, PR #1, CI đúng SHA, các runs và test reports thực.
2. So sánh P0 core, API, schema, RLS, session, data persistence, mobile/web flows với PRD và 46 test IDs; đánh dấu Verified / Partial / Not Run / Blocked cho từng tiêu chí.
3. Tái hiện lỗi trong bản sao cô lập bằng DB synthetic; dùng quyền application thực cho multi-tenant tests; tuyệt đối không dùng thông tin thật.
4. Tìm vấn đề bắt buộc: privilege escalation, insecure SECURITY DEFINER/search_path, unchecked JWT trust boundaries, RLS bypass, prompt injection, IDOR, unsafe upload, leaked secrets, missing validation, webhook idempotency, migration risk, CI gaps, non-reproducible build.
5. Chỉ báo findings có file:line, test command, expected/actual, impact và cách sửa có thể kiểm chứng. Phân biệt phát hiện thực và giả thuyết; review tự động không thay kiểm toán độc lập theo luật/chuẩn.
6. Đưa kết luận GO/HOLD cho test/staging release; KHÔNG kết luận GO production nếu có blocker thủ tục, pháp lý, bảo mật hoặc approval chưa có.
