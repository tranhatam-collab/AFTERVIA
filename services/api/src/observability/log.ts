// Nhật ký có cấu trúc, một dòng JSON mỗi sự kiện (WO16-03). Chỉ các trường trong danh sách cho phép được ghi.
// Trường lạ bị bỏ và chỉ được đếm trong dropped_fields. Giá trị phải là nguyên thủy; đối tượng lồng nhau bị bỏ.
// Chuỗi có dạng bí mật (JWT, khóa kiểu sk_live_, Bearer, khóa riêng) được thay bằng [redacted].
// Không ghi thông điệp lỗi, ngăn xếp, nội dung tài liệu, lời nhắc mô hình hay dữ liệu cá nhân.

const ALLOWED_KEYS = new Set([
  'event',
  'request_id',
  'route',
  'status',
  'latency_ms',
  'count',
  'code',
  'error_class',
  'severity',
  'provider',
  'job',
]);

const MAX_STRING_LENGTH = 200;

const SECRET_SHAPED: RegExp[] = [
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/,
  /\b(?:sk|rk|pk)_(?:live|test)_[0-9A-Za-z]{8,}\b/,
  /\bBearer\s+\S+/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

export type LogValue = string | number | boolean | null;

function sanitizeString(value: string): string {
  if (SECRET_SHAPED.some((re) => re.test(value))) return '[redacted]';
  return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
}

// Dựng dòng nhật ký đã lọc. Hàm thuần, không ghi ra đâu cả, nên kiểm thử được.
export function redactedLine(event: string, fields: Record<string, unknown> = {}): string {
  const out: Record<string, LogValue> = { event: sanitizeString(event) };
  let dropped = 0;
  for (const [key, value] of Object.entries(fields)) {
    if (!ALLOWED_KEYS.has(key)) {
      dropped += 1;
      continue;
    }
    if (value === null || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else if (typeof value === 'string') {
      out[key] = sanitizeString(value);
    } else {
      dropped += 1;
    }
  }
  if (dropped > 0) out.dropped_fields = dropped;
  return JSON.stringify(out);
}

export function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  process.stdout.write(`${redactedLine(event, fields)}\n`);
}
