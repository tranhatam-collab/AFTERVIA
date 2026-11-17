# Các cổng nghiệm thu
| Gate | Điều kiện qua | Bằng chứng | Khi không qua |
|---|---|---|---|
| G0 Công cụ/tài sản | Full source, quyền khai thác, persistence, isolation, clean build | T01–T05; hợp đồng; build logs | Wron chỉ prototype synthetic |
| G1 Nhu cầu | 5 design partners từ tuyển đúng; pain lặp lại | Interview notes/consent/baseline | Đổi segment hoặc dừng |
| G2 Kỹ thuật | P0 end-to-end; critical/high pass; export/delete/restore | 46 test statuses và evidence | Không real production |
| G3 Thương mại/pháp lý | Tên/IP/terms/DPA/country/store/billing được duyệt; pilot có trả tiền sau phép | Approval register, provider evidence | Không mở bán/live billing |
| G4 Release | Reviewer độc lập; monitoring/support/rollback; owner approve | Release receipt/commit/builds | Không phát hành |
| G5 Scale | Retention/unit economics/kênh phân phối lặp lại | Cohort và cash reconciliation | Không tăng quảng cáo/địa bàn |

Mọi gate hiện NOT_PASSED / CHƯA THỰC HIỆN, không suy từ tài liệu đã được viết. Một test không chạy không được coi pass. Critical/high unresolved chặn release. Lỗi medium cần risk acceptance và thời hạn.

## Quality targets để pilot
Mục tiêu thử nghiệm: giảm30% phút intake và20% hỏi lại; contribution margin≥60%; payback CAC<6 tháng; cohort90 ngày có đủ dữ liệu retention. Đây là mục tiêu đề xuất, không thành tích.
Không có cửa sổ đo đủ thì không ngoại suy. Lưu các ngoại lệ và chỉ số chất lượng, không chỉ tốc độ đóng case.

## Approval
Owner duyệt hoạt động, ngân sách, real data, vendor, payments, countries và release riêng biệt. Một approval UI không bao gồm quyền dùng dữ liệu thật. Mọi approval phải có scope, expiry và approver.
