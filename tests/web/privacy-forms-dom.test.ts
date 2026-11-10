// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivacyForms } from '../../apps/web/src/PrivacyForms';

// WO11-03 (T25): màn Quyền riêng tư trong DOM thật với fetch giả. Dữ liệu tổng hợp, không có tài khoản thật.
// Điều được khóa ở đây: phải gõ chữ xác nhận; 401 đọc là "đăng nhập lại", không phải "không có quyền";
// và biên nhận không bao giờ được hiển thị như "đã xóa xong" — các bước còn lại phải hiện ra.
const BASE = 'https://desk.test.invalid';

// Biên nhận thật của migration 0020.
const RECEIPT = {
  request_id: 'erase-0001-test',
  status: 'PENDING_POLICY',
  access_revoked: { grants: 2, participants: 1, memberships: 0 },
  pending: [
    'primary_data_erasure',
    'retention_policy',
    'append_only_erasure',
    'session_revocation',
    'identity_verification',
    'tombstone_registry_outside_backup',
  ],
};

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

async function render(options: { locale?: 'vi' | 'en'; token?: string | null } = {}): Promise<void> {
  await act(async () => {
    root.render(
      createElement(PrivacyForms, {
        locale: options.locale ?? 'vi',
        base: BASE,
        token: options.token === undefined ? 'token-ok' : options.token,
        activeCase: null,
      }),
    );
  });
}

function field(name: string): HTMLInputElement {
  const el = container.querySelector(`[name="${name}"]`);
  if (el === null) throw new Error(`missing field ${name}`);
  return el as HTMLInputElement;
}

async function fill(values: Record<string, string>): Promise<void> {
  await act(async () => {
    for (const [name, value] of Object.entries(values)) {
      const el = field(name);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
}

// Biểu mẫu xóa là biểu mẫu cuối của màn (sau các biểu mẫu chia sẻ và xuất).
function deletionForm(): HTMLFormElement {
  const forms = container.querySelectorAll('form');
  const el = forms[forms.length - 1];
  if (!(el instanceof HTMLFormElement)) throw new Error('missing deletion form');
  return el;
}

async function submitDeletion(): Promise<void> {
  const el = deletionForm();
  await act(async () => {
    el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

describe('WO11-03 the privacy screen holds export, sharing and deletion together', () => {
  it('T25 shows all three areas, and says the deletion catalogue is still with the lawyers', async () => {
    await render();
    expect(container.textContent).toContain('Quyền riêng tư');
    expect(container.textContent).toContain('Xuất dữ liệu');
    expect(container.textContent).toContain('Chia tài liệu');
    expect(container.textContent).toContain('Xóa tài khoản');
    // OD-08 / HUM-LEGAL-DEL-01: không được hứa danh mục xóa là bản cuối.
    expect(container.textContent).toContain('đang chờ luật sư duyệt');
    // Thao tác xóa nói rõ yêu cầu phiên mới, trước khi người dùng bấm.
    expect(container.textContent).toContain('5 phút');
  });

  it('T25 reads in English when the locale is English', async () => {
    await render({ locale: 'en' });
    expect(container.textContent).toContain('Privacy');
    expect(container.textContent).toContain('Delete account');
    expect(container.textContent).toContain('still with the lawyers');
  });
});

describe('WO11-03 nothing is sent until the confirmation word is right', () => {
  it('T25 refuses an empty confirmation and sends no request', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, RECEIPT)));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await submitDeletion();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Cần gõ đúng chữ xác nhận');
  });

  it('T25 refuses a request id shorter than the server allows, and sends no request', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, RECEIPT)));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await fill({ deletionRequestId: 'short', deletionConfirm: 'XÓA' });
    await submitDeletion();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('8 đến 128 ký tự');
  });

  it('T25 accepts the confirmation word typed in lower case', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, RECEIPT)));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await fill({ deletionRequestId: RECEIPT.request_id, deletionConfirm: ' xóa ' });
    await submitDeletion();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('WO11-03 what the server answers is reported as it is', () => {
  it('T25 sends one POST to the deletion path with the request id and no idempotency header', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(200, RECEIPT)));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await fill({ deletionRequestId: RECEIPT.request_id, deletionConfirm: 'XÓA' });
    await submitDeletion();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(`${BASE}/v1/account/deletion`);
    const init = call?.[1] as RequestInit | undefined;
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ request_id: RECEIPT.request_id });
    // Mã yêu cầu chính là khóa khử trùng; không gửi thêm Idempotency-Key.
    expect((init?.headers as Record<string, string> | undefined)?.['idempotency-key']).toBeUndefined();
  });

  it('T25 a receipt lists every outstanding step instead of reporting the account as erased', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(200, RECEIPT))));
    await render();
    await fill({ deletionRequestId: RECEIPT.request_id, deletionConfirm: 'XÓA' });
    await submitDeletion();
    expect(container.textContent).toContain('Đã ghi nhận yêu cầu xóa');
    expect(container.textContent).toContain('PENDING_POLICY');
    expect(container.textContent).toContain('Chưa hoàn tất');
    expect(container.querySelectorAll('li').length).toBe(6);
    expect(container.textContent).toContain('Xóa dữ liệu chính');
    expect(container.textContent).toContain('Thu hồi phiên trên mọi thiết bị');
    // Mã yêu cầu được giữ nguyên để gửi lại trả về cùng biên nhận.
    expect(field('deletionRequestId').value).toBe(RECEIPT.request_id);
    expect(field('deletionConfirm').value).toBe('');
  });

  it('T25 a 401 on this route reads as "sign in again", not as "no permission"', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(401, { code: 'unauthenticated' }))));
    await render();
    await fill({ deletionRequestId: RECEIPT.request_id, deletionConfirm: 'XÓA' });
    await submitDeletion();
    expect(container.textContent).toContain('Đăng nhập lại rồi gửi yêu cầu trong 5 phút');
    expect(container.textContent).not.toContain('Bạn không có quyền thực hiện thao tác này');
  });

  it('T25 a 409 names the sole-owner reason the server refused for', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(409, { code: 'invalid_state' }))));
    await render();
    await fill({ deletionRequestId: RECEIPT.request_id, deletionConfirm: 'XÓA' });
    await submitDeletion();
    expect(container.textContent).toContain('chủ sở hữu duy nhất');
  });

  it('T25 a 200 that is missing the receipt fields is never reported as recorded', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(200, { status: 'PENDING_POLICY' }))));
    await render();
    await fill({ deletionRequestId: RECEIPT.request_id, deletionConfirm: 'XÓA' });
    await submitDeletion();
    expect(container.textContent).not.toContain('Đã ghi nhận yêu cầu xóa');
    expect(container.textContent).toContain('Chưa xác nhận được kết quả');
  });

  it('T25 without a session on this client nothing is sent at all', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, RECEIPT)));
    vi.stubGlobal('fetch', fetchMock);
    await render({ token: null });
    await fill({ deletionRequestId: RECEIPT.request_id, deletionConfirm: 'XÓA' });
    await submitDeletion();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('chưa đăng nhập');
  });

  it('T25 the screen builds no links or images from what the server sent', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(200, RECEIPT))));
    await render();
    await fill({ deletionRequestId: RECEIPT.request_id, deletionConfirm: 'XÓA' });
    await submitDeletion();
    expect(container.querySelector('a[href]')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});
