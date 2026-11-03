// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaseSummary } from '../../apps/web/src/actions';
import { SharingForms } from '../../apps/web/src/SharingForms';
import { localInput } from '../../apps/web/src/sharing-forms';

// WO10-03f: chia tài liệu, thu hồi và tạo gói xuất trong DOM thật với fetch giả (T32, T38). Dữ liệu tổng hợp.
const BASE = 'https://desk.test.invalid';
const CASE = '0000000c-0000-4000-8000-000000000003';
const GRANT = '0000000d-0000-4000-8000-000000000004';
const DOC = '0000000e-0000-4000-8000-000000000005';
const PARTNER = '0000000f-0000-4000-8000-000000000006';
const JOB = '00000010-0000-4000-8000-000000000007';
const DAY = 86_400_000;

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

const ACTIVE: CaseSummary = { id: CASE, status: 'in_progress', version: 4, outcome: null };

async function render(options: { locale?: 'vi' | 'en'; activeCase?: CaseSummary | null } = {}): Promise<void> {
  await act(async () => {
    root.render(
      createElement(SharingForms, {
        locale: options.locale ?? 'vi',
        base: BASE,
        token: 'token-ok',
        activeCase: options.activeCase === undefined ? ACTIVE : options.activeCase,
      }),
    );
  });
}

function field(name: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const el = container.querySelector(`[name="${name}"]`);
  if (el === null) throw new Error(`missing field ${name}`);
  return el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
}

// Gán giá trị qua setter gốc của trình duyệt rồi phát sự kiện, để React nhận đúng giá trị.
async function fill(values: Record<string, string>): Promise<void> {
  await act(async () => {
    for (const [name, value] of Object.entries(values)) {
      const el = field(name) as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
}

async function clickCheckbox(name: string): Promise<void> {
  await act(async () => {
    (field(name) as HTMLInputElement).click();
  });
}

async function submit(form: number): Promise<void> {
  const el = container.querySelectorAll('form')[form];
  if (el === undefined) throw new Error(`missing form ${form}`);
  await act(async () => {
    el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

function submitButton(form: number): HTMLButtonElement {
  const button = container.querySelectorAll('form')[form]?.querySelector('button[type="submit"]');
  if (!(button instanceof HTMLButtonElement)) throw new Error(`missing submit button ${form}`);
  return button;
}

// Đọc một tiêu đề từ lần gọi fetch đã ghi lại (đối số thứ hai là init).
function headerOf(call: readonly unknown[] | undefined, name: string): string | undefined {
  const init = call?.[1] as RequestInit | undefined;
  return (init?.headers as Record<string, string> | undefined)?.[name];
}

describe('WO10-03f Web Desk sharing forms in a DOM: one request per submit, locked while sending, and the forms report what the server answered', () => {
  it('T38 a grant is sent once to the grant path with the case, document, recipient, UTC expiry and key, and the grant ID is reported', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(200, { id: GRANT, status: 'active' })));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await fill({ documentId: DOC, recipientId: PARTNER });
    await clickCheckbox('canDownload');
    await submit(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(`${BASE}/v1/cases/${CASE}/grants`);
    expect(call?.[1]?.method).toBe('POST');
    expect((call?.[1]?.headers as Record<string, string>)['idempotency-key']).toBeDefined();
    const body = JSON.parse(String(call?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ document_id: DOC, recipient_id: PARTNER, can_download: true });
    expect(new Date(String(body.expires_at)).toISOString()).toBe(body.expires_at);
    expect(container.textContent).toContain(`Đã chia tài liệu. Mã quyền: ${GRANT}.`);
    expect((field('documentId') as HTMLInputElement).value).toBe('');
  });

  it('T38 while a grant is being sent its button is locked, and a second press sends nothing', async () => {
    let release: (response: Response) => void = () => {};
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => new Promise<Response>((resolve) => {
      release = resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await fill({ documentId: DOC, recipientId: PARTNER });
    await submit(0);
    expect(submitButton(0).disabled).toBe(true);
    await submit(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      release(jsonResponse(200, { id: GRANT, status: 'active' }));
    });
    expect(submitButton(0).disabled).toBe(false);
  });

  it('T32 an expiry more than 30 days away is refused with its message, and nothing is sent', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(200, {})));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await fill({ documentId: DOC, recipientId: PARTNER, expiresAt: localInput(new Date(Date.now() + 31 * DAY)) });
    await submit(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Hạn truy cập phải sau thời điểm hiện tại và không quá 30 ngày.');
  });

  it('T38 a revocation is a DELETE to the grant path with no body, and the revoked grant is reported', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(200, { id: GRANT, status: 'revoked' })));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await fill({ grantId: GRANT });
    await submit(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(`${BASE}/v1/cases/${CASE}/grants/${GRANT}`);
    expect(call?.[1]?.method).toBe('DELETE');
    expect(call?.[1]?.body).toBeUndefined();
    expect(container.textContent).toContain(`Đã thu hồi quyền ${GRANT}.`);
  });

  it('T38 an export is a POST with a key and an empty body, and the job is reported', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(200, { id: JOB, status: 'succeeded' })));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await submit(2);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(`${BASE}/v1/exports`);
    expect(call?.[1]?.method).toBe('POST');
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({});
    expect(headerOf(call, 'idempotency-key')).toBeDefined();
    expect(container.textContent).toContain(`Đã tạo gói xuất ${JOB}. Trạng thái: Đã xong.`);
  });

  it('T38 an export retried after a failure reuses its key, and the press after a success gets a new key', async () => {
    let calls = 0;
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => {
      calls += 1;
      return Promise.resolve(calls === 1 ? jsonResponse(503, { code: 'internal_error' }) : jsonResponse(200, { id: JOB, status: 'succeeded' }));
    });
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await submit(2);
    await submit(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = headerOf(fetchMock.mock.calls[0], 'idempotency-key');
    expect(headerOf(fetchMock.mock.calls[1], 'idempotency-key')).toBe(first);
    expect(container.textContent).toContain(`Đã tạo gói xuất ${JOB}. Trạng thái: Đã xong.`);
    await submit(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(headerOf(fetchMock.mock.calls[2], 'idempotency-key')).not.toBe(first);
  });

  it('T38 a grant retried with the same content after a failure reuses its key, and a changed grant gets a new key', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(503, { code: 'internal_error' })));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await fill({ documentId: DOC, recipientId: PARTNER });
    await submit(0);
    await submit(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = headerOf(fetchMock.mock.calls[0], 'idempotency-key');
    expect(headerOf(fetchMock.mock.calls[1], 'idempotency-key')).toBe(first);
    expect(container.textContent).toContain('Chưa xác nhận được kết quả.');
    await clickCheckbox('canDownload');
    await submit(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(headerOf(fetchMock.mock.calls[2], 'idempotency-key')).not.toBe(first);
  });

  it('T38 a revocation with a bad grant ID shows the message and sends nothing', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(200, {})));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await fill({ grantId: 'x' });
    await submit(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Mã phải đúng dạng UUID.');
  });

  it('T38 markup typed into a field is refused as a bad ID, and no image or link is rendered', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(200, {})));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await fill({ documentId: '<img src=x onerror="alert(1)">', recipientId: PARTNER });
    await submit(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Mã phải đúng dạng UUID.');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a[href]')).toBeNull();
  });

  it('T32 the sharing forms read in English when the locale is English', async () => {
    await render({ locale: 'en' });
    expect(container.textContent).toContain('Share a document');
    expect(container.textContent).toContain('Revoke document access');
    expect(container.textContent).toContain('Export data');
  });
});
