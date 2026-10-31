// Phân mức sự cố theo engineering/12 (WO16-03). Hàm thuần: cùng sự kiện cho cùng mức, không phụ thuộc người phân loại.
// Severity1: rò dữ liệu, hỏng dữ liệu hoặc thu tiền trùng. Dừng chức năng liên quan và gọi người trực đã phân công.
// Severity2: luồng chính không dùng được; phải có cách làm thay thế và lịch cập nhật.
// Severity3: giao diện hoặc phần không thiết yếu.
// Mức cao nhất thắng: một sự cố vừa có rò dữ liệu vừa làm gián đoạn luồng chính là Severity1.

export type Severity = 'SEV1' | 'SEV2' | 'SEV3';

export interface IncidentFacts {
  dataLeakOrCorruption: boolean;
  billingDoubleCharge: boolean;
  mainFlowUnavailable: boolean;
}

export function classifyIncident(facts: IncidentFacts): Severity {
  if (facts.dataLeakOrCorruption || facts.billingDoubleCharge) return 'SEV1';
  if (facts.mainFlowUnavailable) return 'SEV2';
  return 'SEV3';
}
