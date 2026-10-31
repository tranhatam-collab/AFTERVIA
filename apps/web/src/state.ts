// Logic thuần của Web Desk (WO10-01): phân loại phản hồi và kiểm dữ liệu trước khi hiển thị.
// Không đọc DOM và không đọc môi trường. Dữ liệu từ máy chủ được coi là không tin cậy:
// chỉ hiển thị khi đúng hình dạng, và luôn hiển thị dạng chữ (xem view.tsx).

export interface Item {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  purchased_on: string | null;
  currency: string | null;
  version: number;
}

export type ListResult =
  | { kind: 'loading' }
  | { kind: 'success'; items: Item[] }
  | { kind: 'denied' }
  | { kind: 'error' }
  | { kind: 'offline'; cached: Item[] | null };

export type HttpOutcome = 'success' | 'denied' | 'error';

// Đường dẫn cố định. Không có chỗ nào để dữ liệu từ máy chủ đi vào URL (chống SSRF).
export const ITEMS_PATH = '/v1/items';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 401, 403 và 404 cùng là "không có quyền xem": không cho biết đối tượng có tồn tại hay không.
export function classifyStatus(status: number): HttpOutcome {
  if (status >= 200 && status < 300) return 'success';
  if (status === 401 || status === 403 || status === 404) return 'denied';
  return 'error';
}

// Lỗi mạng là ngoại tuyến khi trình duyệt báo mất kết nối; ngược lại là lỗi thật.
export function networkFailure(online: boolean): 'offline' | 'error' {
  return online ? 'error' : 'offline';
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parseItem(raw: unknown): Item | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const { id, title, brand, model, purchased_on, currency, version } = r;
  if (typeof id !== 'string' || !UUID.test(id)) return null;
  if (typeof title !== 'string') return null;
  if (!nullableString(brand) || !nullableString(model) || !nullableString(purchased_on) || !nullableString(currency)) return null;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return null;
  return { id, title, brand, model, purchased_on, currency, version };
}

// Trả về danh sách món đồ khi đúng hình dạng; nếu có bất kỳ phần tử nào sai thì trả về null (không hiển thị gì).
export function parseItems(body: unknown): Item[] | null {
  if (typeof body !== 'object' || body === null || !('items' in body) || !Array.isArray(body.items)) return null;
  const items: Item[] = [];
  for (const raw of body.items as unknown[]) {
    const item = parseItem(raw);
    if (item === null) return null;
    items.push(item);
  }
  return items;
}

export interface LoadOptions {
  fetchImpl: typeof fetch;
  base: string;
  token: string | null;
  online: boolean;
}

// Tải danh sách. Không có token thì không gọi mạng nào và trả về denied.
export async function loadItems(options: LoadOptions): Promise<ListResult> {
  if (options.token === null) return { kind: 'denied' };
  let response: Response;
  try {
    // Gọi qua biến, không gọi như thuộc tính của options: fetch của trình duyệt không chấp nhận this khác window.
    const send = options.fetchImpl;
    response = await send(`${options.base}${ITEMS_PATH}`, {
      headers: { accept: 'application/json', authorization: `Bearer ${options.token}` },
    });
  } catch {
    return networkFailure(options.online) === 'offline' ? { kind: 'offline', cached: null } : { kind: 'error' };
  }
  const outcome = classifyStatus(response.status);
  if (outcome === 'denied') return { kind: 'denied' };
  if (outcome === 'error') return { kind: 'error' };
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { kind: 'error' };
  }
  const items = parseItems(body);
  return items === null ? { kind: 'error' } : { kind: 'success', items };
}
