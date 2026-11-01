# Hòa giải bộ v2 (AFTERVIA_COMPLETION_MASTER_V2_2026-11-01) với backlog thật

**Nguồn:** ZIP giải nén tại thư mục scratch ngoài project (không ghi vào repo), đối chiếu trực tiếp với `docs/plan/backlog.json` và `docs/plan/02_ACCEPTANCE_MATRIX.csv` hiện có trong repo tại HEAD `bd4b480`.

**Verdict:** Bảng `audit/05_ORIGINAL_46_TEST_MAPPING.csv` trong gói v2 có lỗi mapping **nhiều hơn** audit Devin đã chỉ ra. Devin tìm 7 dòng trống + 6 nhóm sai (T11–T16/T45, T34–T35, T38, T41, T43). Đối chiếu trực tiếp với cột `domain`/`mapped_tasks` thật trong `02_ACCEPTANCE_MATRIX.csv` (bằng chứng độc lập, không dựa vào audit Devin) cho thấy thêm: T01, T23, T25, T27, T28, T29, T36, T44 cũng sai hoặc thiếu gói chính. Tổng cộng **29/46 dòng cần sửa hoặc bổ sung**, không phải 13/46. Không có dòng nào trong số đã sửa đổi làm thay đổi trạng thái PASS/NOT_RUN thật của tiêu chí — chỉ sửa gói v2 nào sẽ "sở hữu" phần hoàn thiện tiếp theo.

## (a) Bảng mapping đã hiệu chỉnh — T01–T46

Cột `v2 gốc` = giá trị trong ZIP. Cột `v2 đã sửa` = kết luận sau khi đối chiếu `domain` + `mapped_tasks` thật. Cột `vì sao` chỉ nguồn xác minh.

| ID | domain thật | mapped_tasks thật | v2 gốc | v2 đã sửa | Vì sao |
|---|---|---|---|---|---|
| T01 | G0 | HUM-G0-01 | W03 | **W01** | W03="khắc phục dependency", không liên quan quyền/baseline source |
| T02 | G0 | HUM-G0-01;HUM-WO18-02 | *(trống)* | **W02;W28** | hòa giải gate/DEC (W02) + pháp lý/IP (W28) |
| T03 | G0 | WO03-03;WO04-01 | W06 | **W01;W06** | WO03-03 là baseline/migration (W01), WO04-01 là permission (W06) |
| T04–T09 | Auth/Sharing/Storage | WO04-09 | W06/W09/W16 | giữ nguyên | khớp domain; W16 (QR) là phụ, không sai |
| T10 | Storage | WO05-03 | W08;**W18** | **W08** (bỏ W18) | "upload trùng/retry" là cơ chế chung; W18 chỉ 1 đối tác POS cụ thể, không phải nơi sở hữu cơ chế |
| **T11–T16** | **AI** | WO06-01..05 | **W23** | **W24** | domain=AI khớp đúng W24 ("AI evidence"); W23 là billing/xóa tài khoản — xác nhận lỗi Devin |
| T17–T20 | Cases | WO08-01/02 | W13 | giữ nguyên | hợp lý, case flow lộ qua E2E |
| T21 | Notifications | WO07-03;DEV-01 | *(trống)* | **W19** | W19 = "thông báo và lời mời có quyền" đúng domain |
| T22 | Dates | WO07-02 | *(trống)* | **W13;W14** | hiển thị ở cả web và mobile |
| T23 | Offline | WO10-02;DEV-01 | W13 | **W13;W14** | WO10-02 là mobile shell, không phải web; thiếu W14 |
| T24 | Export | WO11-01 | W12;W13;W36 | giữ nguyên | hợp lý |
| T25 | Deletion | WO11-02;WO11-03 | W12;W13 | **W10;W11;W20** | gói đúng là policy engine xóa (W10), ledger xóa (W11), UI quyền riêng tư (W20); W12/W13 chỉ liên quan gián tiếp |
| T26 | Deletion | WO11-02;WO16-01 | W12 | giữ nguyên | khớp đúng tên gói |
| T27 | Billing | WO12-01 | W18;**W23** | **W21** | WO12-01 = sổ sự kiện billing = đúng W21; W18 (1 POS) và W23 (đối soát, downstream) không phải chủ sở hữu |
| T28 | Billing | WO12-01 | W18;W23 | **W21** | như T27 |
| T29 | Billing | WO12-02 | W23 | **W22** | WO12-02 = entitlement state machine = đúng W22; W23 là đối soát, downstream |
| T30 | Billing | WO12-03 | W23 | giữ nguyên | khớp đúng ("đối soát") |
| T31 | Family | WO13-01 | *(trống)* | **W42** | W42 tên gói có "Family" |
| T32 | Localization | WO07-04;WO10-01 | *(trống)* | **W15** | W15 deliverable ghi rõ "VI/EN" |
| T33 | Accessibility | WO15-01;DEV-01 | *(trống)* | **W15** | W15 deliverable ghi rõ "keyboard/screen reader" |
| **T34–T35** | Mobile | DEV-01 | **W26** | **W14** | W26 là load/monitoring/SRE, không phải mobile build — xác nhận lỗi Devin |
| T36 | Web | WO10-03;DEV-02 | W26 | **W15** | W15 deliverable ghi rõ "browser matrix"; W26 không liên quan |
| T37 | Security | WO03-01/04;WO16-03 | W03;W09;W26 | giữ nguyên (W09 là phụ, chấp nhận được) | đa phần khớp |
| **T38** | Security | WO05-01;WO09-02;WO10-01 | **W16** | **W06;W08;W09;W13** | XSS/SSRF là bề mặt rộng (SQL/API, quarantine, download-authz, web E2E), không chỉ QR — xác nhận lỗi Devin, mở rộng cụ thể |
| T39 | Recovery | WO16-01;INF-01 | W12;W26 | giữ nguyên | khớp |
| T40 | Performance | WO15-02;HUM-WO19-02 | W26 | giữ nguyên | khớp |
| **T41** | Legal | WO16-04;HUM-WO18-02 | **W31** | **W28** | W31 là chạy pilot (downstream), gói pháp lý/country đúng là W28 — xác nhận lỗi Devin |
| T42 | Support | WO16-02 | *(trống)* | **W42** | tên gói W42 có "break-glass" |
| **T43** | Analytics | WO14-01 | **W18** | **W35** | W18 là 1 adapter POS, không liên quan metric; W35 là "phân tích chất lượng/denominators" — xác nhận lỗi Devin, không có gói nào "sở hữu" KPI vận hành đúng nghĩa, W35 là gần nhất |
| T44 | Release | WO03-02;WO20-01;INF-01 | W26 | **W38** | W38 tên gói có "rollback" |
| **T45** | Privacy/AI | WO06-02 | **W23** | **W24** | cùng lỗi T11–T16 |
| T46 | Billing | WO12-02;HUM-WO18-02 | W23 | **W23;W28** | giữ W23, thêm W28 vì có phần legal/store |

**Không có mapping nào trong bảng trên được dùng để đổi `02_ACCEPTANCE_MATRIX.csv` hay `backlog.json`.** Đây là tài liệu đối chiếu, ghi riêng.

## (b) Việc mới thật sự cần thêm vào backlog (không phải việc đã DONE bị lặp lại)

Legacy_map của 44 gói v2 cho thấy phần lớn chỉ là lớp tổ chức lại 64 task hiện có (đúng như `audit/04_SPEC_CONFLICTS_AND_SUPERSESSION.md` tự ghi: "không cộng máy móc thành 108 task"). Quét toàn bộ cột `legacy_map`, có 3 việc không nằm trong 64 task hiện tại:

1. **Công cụ split/edit cho `tools/loop/backlog.mjs`** (tương ứng AV2-W37 "Split-task và loop có kiểm soát", legacy_map tự ghi `WO03;LOOP`). Xác nhận độc lập: CLI hiện tại chỉ có `validate|decide|next|status|start|done|block|unblock`, không có lệnh tách task — đây là lý do thật khiến WO10-03 bị BLOCKED với lý do "công cụ không tách được task". Đề xuất: task mới **WO23-01**, kind `AUTO`, không phụ thuộc gì, nghiệm thu bằng test `backlog.test.mjs` mới cho lệnh split.
2. **SBOM / dependency-path / pin CI action** (AV2-W43, legacy_map `WO03;HUM-G0-01`). WO03 đã DONE nhưng không bao gồm sinh SBOM hay pin action theo SHA. Đề xuất: task mới **WO24-01**, kind `AUTO`, phụ thuộc WO03-01.
3. **CI theo từng thành phần (web/mobile/backend) + required check tổng hợp** (AV2-W04, legacy_map `WO03`). Chưa xác nhận được cấu hình CI hiện tại có tách job theo thành phần hay không trong phạm vi đọc của lượt này — ghi `NOT_CHECKED`, cần đọc `.github/workflows/` trước khi quyết có phải việc mới hay chỉ là tinh chỉnh WO04.

Mọi gói v2 khác đều trỏ về task đã có trong `backlog.json` (DONE, BLOCKED, TODO hoặc WAITING_HUMAN) — không tạo task trùng cho các gói đó.

## (c) Đối chiếu hai hệ mã gate

| Mã v2 (G0–G5 chuẩn theo A–Z) | Mã đang dùng trong `docs/plan/00_EXECUTION_PLAN.md` của repo này |
|---|---|
| G0 — công cụ/tài sản | G0 — Quyền, công cụ, tài sản |
| G1 — nhu cầu | G1 — Nhu cầu |
| G2 — kỹ thuật (chất lượng/an toàn) | **P0 + P1** (kỹ thuật AUTO/AUTO_PREP) **+ G2** (kỹ thuật độc lập: reviewer, build thật, staging) — repo tách kỹ thuật thành 3 giai đoạn, v2 gộp vào 1 mã G2 |
| G3 — thương mại/pháp lý | G3 — Pháp lý và thương mại |
| G4 — phát hành | G4 — Phát hành |
| G5 — mở rộng | G5 — Tăng trưởng |

Không đổi mã nào trong `00_EXECUTION_PLAN.md`; bảng trên chỉ để tra chéo khi đọc tài liệu v2.

## (d) Tình trạng sai lệch

- 7 dòng trống (T02, T21, T22, T31, T32, T33, T42): **đã sửa, có gói đề xuất**, chưa ghi vào `backlog.json`.
- 6 nhóm Devin chỉ ra (T11–T16, T34–T35, T38, T41, T43, T45): **xác nhận đúng, đã sửa**.
- Phát hiện thêm ngoài audit Devin: T01, T10 (nhẹ), T23, T25, T27, T28, T29, T36, T44, T46 (nhẹ) — **đã sửa trong bảng (a)**.
- `audit/04_SPEC_CONFLICTS_AND_SUPERSESSION.md` của chính gói v2 có một điểm đã lỗi thời: ghi "WO16-03 được dẫn làm dependency nhưng chưa được mô tả". Thực tế `WO16-03` đã tồn tại và **DONE** trong `backlog.json` (nhật ký có cấu trúc, T37). Không cần resolve thêm.
- Chưa đối chiếu `audit/03_LEGACY_25_TASK_MAP.csv` và `execution/02_DEPENDENCIES.json` trong lượt này — để lại cho vòng sau nếu cần.
