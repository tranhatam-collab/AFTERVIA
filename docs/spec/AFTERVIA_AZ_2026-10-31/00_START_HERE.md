# AFTERVIA — Bộ hồ sơ A–Z
**Ngày31/10/2026 • 70 tệp bàn giao • Tên làm việc chưa clearance.**

## Bắt đầu ở đâu
Đọc `02_MASTER_PLAN_A_TO_Z.docx` để xem bản thuyết minh12trang, hoặc bản Markdown cùng tên. Đọc `01_EXECUTIVE_DECISION.md` để biết lựa chọn và giới hạn.
Mở `finance/02_24_MONTH_MODEL.xlsx`:8sheet,3kịch bản,24tháng có công thức và chú thích input; đây không phải doanh thu thực tế.
Dùng `handoff/00_WRON_BOOTSTRAP_LT1500.txt` trong Wron sandbox; tiếp theo kiểm Gate0 trước khi giao các prompt xây chức năng. Không upload toàn bộ ZIP và giả định builder hiểu/nhớ hết.

## Sản phẩm được đề xuất
AFTERVIA là nền tảng phối hợp hậu mãi có chứng cứ cho cửa hàng điện tử/đồ gia dụng và khách hàng. Mobile+web dùng chung hồ sơ được cấp quyền. B2B trả tiền chính; B2C cơ bản miễn phí. Không phải chatbot pháp lý, bảo hiểm, ngân hàng hoặc app đòi tiền tự động.

## Trạng thái
Tài liệu đã soạn;32nguồn được ghi phạm vi đọc;23route thiết kế;20user stories;22bảng dữ liệu;13operation API thiết kế;46test chưa chạy;22work orders chưa thực hiện;12prompt dưới1.500ký tự.
Không có app đã lập trình, giao dịch doanh thu, đăng ký IP, tên miền đã mua, ngân sách đã duyệt hoặc quyền production trong gói này.
`engineering/10_REPO_FILE_MANIFEST.csv` liệt kê32đường dẫn source CẦN TẠO, không phải32tệp code đã có.

## Quy tắc sử dụng
Markdown: đặc tả. CSV: sổ quản lý. JSON/YAML: hợp đồng thiết kế. XLSX: mô hình giả định. Python: chương trình kiểm lại phép tính tài chính, không phải app.
Source IDs[S01]–[S32] giải thích trong research. Metadata văn bản pháp luật không thay đọc toàn văn/tư vấn địa phương.
`03_DELIVERY_MANIFEST.csv` và `04_SHA256SUMS.txt` giúp kiểm tra đủ tệp và toàn vẹn. Hash không chứng minh giá trị thương mại hoặc quyền sở hữu pháp lý.

## Danh mục đầy đủ tên tệp
```text
AFTERVIA_AZ_2026-10-31/
  00_START_HERE.md
  01_EXECUTIVE_DECISION.md
  02_MASTER_PLAN_A_TO_Z.docx
  02_MASTER_PLAN_A_TO_Z.md
  03_DELIVERY_MANIFEST.csv
  04_SHA256SUMS.txt
  brand/01_BRAND_PLATFORM_VI_EN.md
  brand/02_NAMING_AND_TRADEMARK_DUE_DILIGENCE.md
  brand/03_DESIGN_SYSTEM_AND_UX.md
  brand/04_LANDING_AND_APP_STORE_COPY.md
  engineering/01_ARCHITECTURE_AND_WRON_FIT.md
  engineering/02_DATA_DICTIONARY.csv
  engineering/03_API_CONTRACT.openapi.yaml
  engineering/03_API_SCOPE_NOTES.md
  engineering/04_AI_RULES_AND_EVALUATION.md
  engineering/05_SECURITY_AND_THREAT_MODEL.md
  engineering/06_DELIVERY_CICD_AND_EXIT.md
  engineering/07_COUNTRY_PACK.schema.json
  engineering/08_EVIDENCE_RECORD.schema.json
  engineering/09_EXTRACTION.schema.json
  engineering/10_REPO_FILE_MANIFEST.csv
  engineering/11_BILLING_AND_ENTITLEMENTS.md
  engineering/12_OBSERVABILITY_AND_RESILIENCE.md
  finance/01_MODEL_GUIDE.md
  finance/02_24_MONTH_MODEL.xlsx
  finance/03_MODEL_INPUTS.json
  finance/04_MODEL_SNAPSHOT.csv
  finance/05_VALUATION_AND_FUNDING.md
  finance/06_RECOMPUTE_MODEL.py
  handoff/00_WRON_BOOTSTRAP_LT1500.txt
  handoff/01_CAPABILITY_PROBE.txt
  handoff/02_ARCHITECTURE_REPO_AUTH.txt
  handoff/03_DOCUMENTS_ITEMS.txt
  handoff/04_AI_EXTRACTION_REVIEW.txt
  handoff/05_CASES_DESK.txt
  handoff/06_SHARING_PARTNER.txt
  handoff/07_REMINDERS_EXPORT_DELETE.txt
  handoff/08_BILLING_SANDBOX.txt
  handoff/09_UX_ACCESSIBILITY_LOCALIZATION.txt
  handoff/10_SECURITY_RECOVERY_QA.txt
  handoff/11_RELEASE_HANDOFF.txt
  handoff/13_MASTER_INSTRUCTIONS.md
  handoff/14_WRON_CAPABILITY_PROBE.md
  legal/01_IP_OWNERSHIP_AND_VENDOR_CHECKLIST.md
  legal/02_GLOBAL_COMPLIANCE_REGISTER.csv
  legal/03_PRIVACY_TERMS_DPA_BRIEF.md
  legal/04_DATA_RETENTION_AND_DELETION.md
  ops/01_OPERATING_MODEL_AND_SUPPORT.md
  ops/02_BACKLOG_WORK_ORDERS.csv
  ops/03_FOUNDER_DECISIONS.md
  product/01_PRD.md
  product/02_SCREEN_AND_ROUTE_MAP.csv
  product/03_USER_STORIES_AND_ACCEPTANCE.csv
  product/04_ROLES_PERMISSIONS_AND_CONSENT.md
  product/05_ROADMAP_90D_24M.md
  research/01_SOURCE_NOTES.md
  research/01_SOURCE_REGISTER.csv
  research/02_MARKET_AND_OPPORTUNITY.md
  research/03_COMPETITOR_MATRIX.csv
  research/04_DEMAND_VALIDATION.md
  research/05_KEYWORD_RESEARCH_PLAN.csv
  strategy/01_PRODUCT_THESIS_AND_MOAT.md
  strategy/02_BUSINESS_MODEL_PRICING.md
  strategy/03_GTM_AND_SALES_PLAYBOOK.md
  strategy/04_GLOBAL_EXPANSION.md
  validation/01_ACCEPTANCE_TESTS.csv
  validation/02_RELEASE_GATES.md
  validation/03_EXPERIMENT_REGISTER.csv
  validation/04_RISK_REGISTER.csv
  validation/05_PACKAGE_QA_REPORT.md
```

## Thứ tự quyết định
Discovery/probe có ngân sách nhỏ và được duyệt → xác minh nhu cầu/IP/công cụ → xây P0 → độc lập test → pilot có phép → live billing/release được duyệt → mở rộng theo cohort và vốn.
Không vượt các cổng này bằng câu trả lời “AI đã làm xong”.
