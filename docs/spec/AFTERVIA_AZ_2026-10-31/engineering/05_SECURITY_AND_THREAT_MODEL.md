# Threat model và tiêu chuẩn an toàn
Không phải chứng nhận an ninh hoặc tuyên bố “bank-grade”.

| Đe dọa | Biện pháp bắt buộc | Bằng chứng |
|---|---|---|
| Truy cập chéo tenant/IDOR | Server auth, membership, RLS, storage authorization | Negative tests mọi resource |
| Grant tài liệu vượt quyền | Case participant + per-document grant | Test grant/revoke/download |
| Secret lộ client | Server secret manager, secret scan, rotation | Bundle scan và log |
| Prompt injection | Document untrusted, tool allowlist, no arbitrary URL/tools | Adversarial evaluation |
| File độc/zip bomb | MIME sniffing, size/page limits, quarantine, scanner | Upload malicious fixtures |
| SSRF từ URL tài liệu | Không fetch arbitrary URL ở MVP; allowlist nếu thêm | Network tests |
| XSS/HTML email | Escape/sanitize, CSP phù hợp framework | Stored/reflected payload tests |
| Webhook giả/lặp | Signature, timestamp, event ledger, idempotency | Replay tests |
| Account takeover | MFA admin, session revocation, rate limit | Auth tests |
| Sửa/xóa audit | Append-only app policy, DB rights, backups | Privilege tests |
| Xuất dữ liệu vượt quyền | Export cùng policy với API; kiểm từng object | Export negative tests |
| Support misuse | Just-in-time access, approval, reason, expiry | Audit support access |

## Phân loại dữ liệu
Public marketing; internal operations; confidential records; restricted secrets/identity. Hóa đơn có thể chứa địa chỉ, điện thoại và thông tin thanh toán; redaction trước AI nếu không cần. Không thu toàn bộ số thẻ, mật khẩu, giấy tờ định danh trong MVP.

## Encryption
TLS truyền tải, encryption at rest nhà cung cấp và key management kiểm chứng theo service. Không gọi E2EE nếu server hoặc AI đọc nội dung. Backup, exports, logs và crash dumps cũng nằm trong phạm vi review.
Log chỉ dùng object IDs, state và error codes; tránh raw receipt, prompt, token hoặc thông tin liên hệ.

## Release security gate
Không critical/high unresolved; kiểm RLS/storage/search/export/webhooks; dependency/SBOM/license scan; independent review; backup restore; kill switch AI/sharing; incident contact. Lỗi medium có owner/deadline/risk acceptance bằng văn bản.
Không tự khai SOC2/ISO27001 từ việc dùng cloud có chứng nhận.

## Incident
Khóa đường rò, thu hồi credentials, giữ chứng cứ cần thiết, phân loại ảnh hưởng, thông báo owner, counsel đánh giá nghĩa vụ thông báo theo nơi áp dụng. Không có một thời hạn pháp lý chung cho mọi quốc gia trong tài liệu này.
