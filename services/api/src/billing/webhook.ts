// WO12-01: xác minh chữ ký và timestamp của webhook thanh toán (T27). CHỈ SANDBOX.
//
// Không có khóa live trong repo và chưa chốt nhà cung cấp (engineering/11). Bí mật đọc từ biến môi trường
// của bên gọi, không bao giờ nằm trong mã. Cơ chế ở đây là cơ chế phổ biến của webhook thanh toán:
// tiêu đề mang mốc thời gian và chữ ký HMAC-SHA256 trên chuỗi `${timestamp}.${rawBody}`.
//
// Ba điều được ép ở đây, vì cả ba đều là cách webhook giả đi lọt:
//   1. Thiếu chữ ký, sai dạng, hoặc sai thuật toán -> từ chối. Không có đường "bỏ qua kiểm tra".
//   2. Chữ ký so bằng timingSafeEqual, không bằng ===.
//   3. Mốc thời gian ngoài cửa sổ cho phép -> từ chối, kể cả khi chữ ký đúng (chống phát lại bản ghi cũ).
// Thân (rawBody) phải là ĐÚNG chuỗi byte đã nhận. JSON.parse rồi stringify lại sẽ làm chữ ký sai.
import { createHmac, timingSafeEqual } from 'node:crypto';

// Cùng ngưỡng với xác thực lại trước khi xóa (0028): 5 phút.
export const WEBHOOK_TOLERANCE_SECONDS = 300;
// HMAC-SHA256 nhận khóa rỗng nên độ dài phải tự kiểm, như MIN_JWT_SECRET_LENGTH.
export const MIN_WEBHOOK_SECRET_LENGTH = 32;

export type WebhookRejection =
  | 'missing_signature'
  | 'malformed_signature'
  | 'bad_timestamp'
  | 'timestamp_outside_window'
  | 'bad_signature'
  | 'weak_secret';

export type WebhookVerification = { ok: true; timestamp: number } | { ok: false; reason: WebhookRejection };

interface ParsedHeader {
  timestamp: number;
  signatures: string[];
}

const HEX_64 = /^[0-9a-f]{64}$/;

// Dạng tiêu đề: `t=<unix giây>,v1=<hex 64>` và có thể có nhiều v1 trong kỳ xoay khóa.
function parseHeader(header: string): ParsedHeader | null {
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq <= 0) return null;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') {
      if (timestamp !== null) return null;
      if (!/^\d{1,12}$/.test(value)) return null;
      timestamp = Number(value);
    } else if (key === 'v1') {
      // Chữ hoa không được chấp nhận: một dạng duy nhất thì không có chỗ cho so sánh lỏng tay.
      if (!HEX_64.test(value)) return null;
      signatures.push(value);
    }
    // Khóa lạ (phiên bản sau) bị bỏ qua, nhưng không bao giờ được coi là chữ ký hợp lệ.
  }
  if (timestamp === null || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function sameSignature(expected: string, candidate: string): boolean {
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(candidate, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signWebhook(secret: string, rawBody: string, timestamp: number): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

export function verifyWebhook(
  secret: string,
  rawBody: string,
  header: string | undefined | null,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = WEBHOOK_TOLERANCE_SECONDS,
): WebhookVerification {
  if (secret.length < MIN_WEBHOOK_SECRET_LENGTH) return { ok: false, reason: 'weak_secret' };
  if (header === undefined || header === null || header.trim().length === 0) return { ok: false, reason: 'missing_signature' };
  const parsed = parseHeader(header);
  if (parsed === null) return { ok: false, reason: 'malformed_signature' };
  if (!Number.isSafeInteger(parsed.timestamp) || parsed.timestamp <= 0) return { ok: false, reason: 'bad_timestamp' };
  // Quá cũ VÀ quá tương lai đều bị từ chối: đồng hồ lệch nhiều cũng là dấu hiệu đáng nghi.
  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) return { ok: false, reason: 'timestamp_outside_window' };
  const expected = signWebhook(secret, rawBody, parsed.timestamp);
  if (!parsed.signatures.some((candidate) => sameSignature(expected, candidate))) return { ok: false, reason: 'bad_signature' };
  return { ok: true, timestamp: parsed.timestamp };
}
