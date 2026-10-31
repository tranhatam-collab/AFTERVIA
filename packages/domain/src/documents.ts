// Quy tắc ticket tải lên (WO05-01). Chỉ kiểm khai báo MIME và kích thước.
// Kiểm chữ ký nhị phân thật và quét mã độc thuộc WO05-02 và WO05-03.

export const UPLOAD_LIMITS = { maxBytes: 10 * 1024 * 1024 } as const; // 10 MB theo PRD mục 7
export const ALLOWED_DECLARED_MIME = ['image/jpeg', 'image/png', 'application/pdf'] as const;

export type UploadTicketResult =
  | { ok: true; value: { declaredMime: string; sizeBytes: number } }
  | { ok: false; field: 'declared_mime' | 'size_bytes' };

export function normalizeUploadTicket(raw: Record<string, unknown>): UploadTicketResult {
  const mime = raw.declared_mime;
  if (typeof mime !== 'string' || !(ALLOWED_DECLARED_MIME as readonly string[]).includes(mime)) {
    return { ok: false, field: 'declared_mime' };
  }
  const size = raw.size_bytes;
  if (typeof size !== 'number' || !Number.isInteger(size) || size < 1 || size > UPLOAD_LIMITS.maxBytes) {
    return { ok: false, field: 'size_bytes' };
  }
  return { ok: true, value: { declaredMime: mime, sizeBytes: size } };
}
