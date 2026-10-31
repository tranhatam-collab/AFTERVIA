import { describe, expect, it } from 'vitest';
import { classifyIncident } from '../../services/api/src/observability/severity';

// WO16-03: phân mức sự cố theo engineering/12. Không có dòng ma trận riêng; tên kiểm thử bắt đầu bằng WO16-03.

const NONE = { dataLeakOrCorruption: false, billingDoubleCharge: false, mainFlowUnavailable: false };

describe('WO16-03 incident severity follows the published levels', () => {
  it('WO16-03 a data leak or a billing double charge is severity 1, even when the main flow is also down', () => {
    expect(classifyIncident({ ...NONE, dataLeakOrCorruption: true })).toBe('SEV1');
    expect(classifyIncident({ ...NONE, billingDoubleCharge: true })).toBe('SEV1');
    expect(classifyIncident({ dataLeakOrCorruption: true, billingDoubleCharge: false, mainFlowUnavailable: true })).toBe('SEV1');
  });

  it('WO16-03 an unavailable main flow is severity 2, and a non-critical problem is severity 3', () => {
    expect(classifyIncident({ ...NONE, mainFlowUnavailable: true })).toBe('SEV2');
    expect(classifyIncident(NONE)).toBe('SEV3');
  });
});
