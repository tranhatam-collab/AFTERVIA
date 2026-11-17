// Kiểm tra tệp theo chữ ký nhị phân (WO05-02). Hàm thuần: không đọc đĩa, không gọi mạng.
// Chỉ phân loại. Không bao giờ trả về CLEAN: quét mã độc cần scanner đã duyệt (INFRA, WO05-03).
// Tệp đúng định dạng nhận SCANNER_UNAVAILABLE và bị chặn cho upload thật.
import { ALLOWED_DECLARED_MIME, UPLOAD_LIMITS } from './documents';

export type DetectedMime = 'image/jpeg' | 'image/png' | 'application/pdf';
export type InspectionStatus = 'QUARANTINED' | 'REJECTED' | 'SCANNER_UNAVAILABLE';
export type InspectionReason =
  | 'declared_mime_not_allowed'
  | 'size_out_of_range'
  | 'unknown_signature'
  | 'mime_mismatch'
  | 'scanner_unavailable';

export interface InspectionVerdict {
  scanStatus: InspectionStatus;
  detectedMime: DetectedMime | null;
  reason: InspectionReason;
}

// Chữ ký đầu tệp: JPEG (FF D8 FF), PNG (8 byte đầu), PDF ("%PDF-").
const SIGNATURES: ReadonlyArray<{ mime: DetectedMime; bytes: readonly number[] }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
];

// head là các byte đầu của tệp. Thiếu byte thì không đoán: trả về null.
export function detectSignature(head: Uint8Array): DetectedMime | null {
  for (const { mime, bytes } of SIGNATURES) {
    if (head.length >= bytes.length && bytes.every((byte, index) => head[index] === byte)) {
      return mime;
    }
  }
  return null;
}

export function inspectUpload(input: { declaredMime: string; sizeBytes: number; head: Uint8Array }): InspectionVerdict {
  if (!(ALLOWED_DECLARED_MIME as readonly string[]).includes(input.declaredMime)) {
    return { scanStatus: 'REJECTED', detectedMime: null, reason: 'declared_mime_not_allowed' };
  }
  const { sizeBytes } = input;
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > UPLOAD_LIMITS.maxBytes) {
    return { scanStatus: 'REJECTED', detectedMime: null, reason: 'size_out_of_range' };
  }
  const detected = detectSignature(input.head);
  if (detected === null) {
    return { scanStatus: 'QUARANTINED', detectedMime: null, reason: 'unknown_signature' };
  }
  if (detected !== input.declaredMime) {
    return { scanStatus: 'QUARANTINED', detectedMime: detected, reason: 'mime_mismatch' };
  }
  return { scanStatus: 'SCANNER_UNAVAILABLE', detectedMime: detected, reason: 'scanner_unavailable' };
}
