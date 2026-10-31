// Gửi một bản nháp món đồ lên máy chủ (WO10-02). Nhận hàm fetch qua tham số để kiểm thử được trên Node.
// Ánh xạ kết quả theo SendOutcome: 2xx có mã là ok; 401 và 403 là deferred (chưa xác thực);
// 408, 429 và 5xx là unknown (có thể đã được xử lý); 4xx khác là rejected; lỗi mạng là unknown.
// Ghi chú: máy chủ hiện chưa khử trùng theo Idempotency-Key cho POST /v1/items (sai khác đã ghi trong WO09-03).
import type { OutboxEntry, SendOutcome } from './outbox';

export const CREATE_ITEM_PATH = '/v1/items';

function serverIdOf(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('id' in value)) return null;
  const id = value.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export function makeItemSender(
  fetchImpl: typeof fetch,
  base: string,
  token: string | null,
): (entry: OutboxEntry) => Promise<SendOutcome> {
  return async (entry) => {
    if (token === null) return { kind: 'deferred' };
    const body = {
      title: entry.draft.title,
      brand: entry.draft.brand,
      model: entry.draft.model,
      purchased_on: entry.draft.purchasedOn,
      currency: entry.draft.currency,
    };
    let response: Response;
    try {
      // Gọi qua biến, không gọi như thuộc tính của đối tượng khác: fetch của trình duyệt không chấp nhận this lạ.
      const send = fetchImpl;
      response = await send(`${base}${CREATE_ITEM_PATH}`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'idempotency-key': entry.idempotencyKey,
        },
        body: JSON.stringify(body),
      });
    } catch {
      return { kind: 'unknown' };
    }
    const status = response.status;
    if (status === 401 || status === 403) return { kind: 'deferred' };
    if (status === 408 || status === 429 || status >= 500) return { kind: 'unknown' };
    if (status >= 400) return { kind: 'rejected' };
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return { kind: 'unknown' };
    }
    const serverId = serverIdOf(json);
    return serverId === null ? { kind: 'unknown' } : { kind: 'ok', serverId };
  };
}
