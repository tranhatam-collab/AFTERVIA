// Gói xuất dữ liệu (WO11-01): JSON, CSV và manifest SHA-256 cho năm tệp. Chỉ chạy ở máy chủ (dùng node:crypto).
// Không đưa vào @aftervia/domain: miền dữ liệu dùng chung với ứng dụng di động, không được kéo node:crypto vào.
// Phạm vi do cơ sở dữ liệu kiểm khi lưu (store_export); module này chỉ dựng nội dung và băm.
import { createHash } from 'node:crypto';

export const EXPORT_SCHEMA_VERSION = 1;

export interface ExportItem {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  purchased_on: string | null;
  currency: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface GrantedDocument {
  grant_id: string;
  case_id: string;
  document_id: string;
  declared_mime: string;
  size_bytes: number;
  scan_status: string;
  can_download: boolean;
  expires_at: string;
}

export interface BundleFile {
  path: string;
  content_type: string;
  body: string;
  sha256: string;
  size_bytes: number;
}

const ITEM_HEADERS = ['id', 'title', 'brand', 'model', 'purchased_on', 'currency', 'version', 'created_at', 'updated_at'] as const;
const GRANT_HEADERS = ['grant_id', 'case_id', 'document_id', 'declared_mime', 'size_bytes', 'scan_status', 'can_download', 'expires_at'] as const;

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

// Ô CSV theo RFC 4180, và chống tiêm công thức: ô bắt đầu bằng = + - @ hoặc tab, CR được thêm dấu nháy đơn trước.
export function csvCell(value: string | number | boolean | null): string {
  if (value === null) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: readonly string[], rows: ReadonlyArray<ReadonlyArray<string | number | boolean | null>>): string {
  const lines = [headers.map((h) => csvCell(h)).join(','), ...rows.map((row) => row.map((cell) => csvCell(cell)).join(','))];
  return `${lines.join('\r\n')}\r\n`;
}

function file(path: string, contentType: string, body: string): BundleFile {
  return { path, content_type: contentType, body, sha256: sha256Hex(body), size_bytes: Buffer.byteLength(body, 'utf8') };
}

// Dựng năm tệp. Thời điểm xuất được truyền vào để kết quả xác định được khi kiểm thử.
export function buildExportBundle(input: { items: ExportItem[]; grants: GrantedDocument[]; exportedAt: string }): BundleFile[] {
  const header = { version: EXPORT_SCHEMA_VERSION, exported_at: input.exportedAt };
  const itemsJson = `${JSON.stringify({ schema: 'aftervia.export.items', ...header, items: input.items }, null, 2)}\n`;
  const itemsCsv = toCsv(
    ITEM_HEADERS,
    input.items.map((i) => [i.id, i.title, i.brand, i.model, i.purchased_on, i.currency, i.version, i.created_at, i.updated_at]),
  );
  const grantsJson = `${JSON.stringify({ schema: 'aftervia.export.granted_documents', ...header, documents: input.grants }, null, 2)}\n`;
  const grantsCsv = toCsv(
    GRANT_HEADERS,
    input.grants.map((g) => [g.grant_id, g.case_id, g.document_id, g.declared_mime, g.size_bytes, g.scan_status, g.can_download, g.expires_at]),
  );
  const files = [
    file('items.json', 'application/json', itemsJson),
    file('items.csv', 'text/csv; charset=utf-8', itemsCsv),
    file('granted_documents.json', 'application/json', grantsJson),
    file('granted_documents.csv', 'text/csv; charset=utf-8', grantsCsv),
  ];
  const manifestJson = `${JSON.stringify(
    {
      schema: 'aftervia.export.manifest',
      ...header,
      hash: 'sha256',
      note: 'Manifest kiểm toàn vẹn của các tệp trong gói; không chứng minh nguồn gốc.',
      files: files.map((f) => ({ path: f.path, sha256: f.sha256, size_bytes: f.size_bytes })),
    },
    null,
    2,
  )}\n`;
  return [...files, file('manifest.json', 'application/json', manifestJson)];
}
