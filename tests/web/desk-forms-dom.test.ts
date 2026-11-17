// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeskForms, type DeskFormsProps } from '../../apps/web/src/DeskForms';

// WO10-03e: biểu mẫu chạy trong DOM thật (jsdom) với fetch giả. Khóa nút khi đang gửi, một yêu cầu mỗi lần bấm,
// khóa idempotency giữ cho lần gửi lại đúng nội dung cũ (T32 và T38). Dữ liệu tổng hợp.
const BASE = 'https://desk.test.invalid';
const ITEM = '0000000a-0000-4000-8000-000000000001';
const ORG = '0000000b-0000-4000-8000-000000000002';
const CASE = '0000000c-0000-4000-8000-000000000003';

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

async function render(overrides: Partial<DeskFormsProps> = {}): Promise<void> {
  const props: DeskFormsProps = {
    locale: 'vi',
    base: BASE,
    token: 'token-ok',
    activeCase: null,
    onItemAdded: () => {},
    onCaseChanged: () => {},
    ...overrides,
  };
  await act(async () => {
    root.render(createElement(DeskForms, props));
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
      const el = field(name);
      const proto =
        el instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : el instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
      el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    }
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

describe('WO10-03e Web Desk forms in a DOM: one request per submit, locked while sending, and the list reloads on success', () => {
  it('T38 the item form sends an Idempotency-Key, keeps it for the same content after a failure, and changes it when the content changes', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(503, { code: 'internal_error' })));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await fill({ title: 'Máy giặt có khóa' });
    await submit(0);
    await submit(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = headerOf(fetchMock.mock.calls[0], 'idempotency-key');
    expect(first).toBeDefined();
    expect(headerOf(fetchMock.mock.calls[1], 'idempotency-key')).toBe(first);
    await fill({ title: 'Máy giặt có khóa mới' });
    await submit(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(headerOf(fetchMock.mock.calls[2], 'idempotency-key')).not.toBe(first);
  });

  it('T32 the item form shows the field error and sends nothing when the title is empty', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(201, { id: ITEM })));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await submit(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Tên món đồ cần từ 1 đến 200 ký tự.');
  });

  it('T38 a valid item is sent once to the items path, the button is locked while sending, and a second press sends nothing', async () => {
    let release: (response: Response) => void = () => {};
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => new Promise<Response>((resolve) => {
      release = resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);
    const onItemAdded = vi.fn();
    await render({ onItemAdded });
    await fill({ title: 'Máy giặt' });
    await submit(0);
    expect(submitButton(0).disabled).toBe(true);
    await submit(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(`${BASE}/v1/items`);
    expect(call?.[1]?.method).toBe('POST');
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ title: 'Máy giặt', currency: 'VND' });
    await act(async () => {
      release(jsonResponse(201, { id: ITEM }));
    });
    expect(onItemAdded).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Đã thêm món đồ.');
    expect(submitButton(0).disabled).toBe(false);
    expect((field('title') as HTMLInputElement).value).toBe('');
  });

  it('T32 the open-case form sends both IDs and the description with an Idempotency-Key, and reports the case', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(jsonResponse(200, { id: CASE, status: 'draft', version: 1, outcome: null })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onCaseChanged = vi.fn();
    await render({ onCaseChanged });
    await fill({ itemId: ITEM, organizationId: ORG, description: 'Máy không lên nguồn' });
    await submit(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(`${BASE}/v1/cases`);
    expect(headerOf(call, 'idempotency-key')).toBeDefined();
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      item_id: ITEM,
      organization_id: ORG,
      description: 'Máy không lên nguồn',
      shared_document_ids: [],
    });
    expect(onCaseChanged).toHaveBeenCalledWith({ id: CASE, status: 'draft', version: 1, outcome: null });
    expect(container.textContent).toContain(`Đã mở case ${CASE}. Trạng thái: Nháp. Phiên bản: 1.`);
  });

  it('T38 a retry of the same content after a failure reuses the key, and changed content gets a new key', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(503, { code: 'internal_error' })));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await fill({ itemId: ITEM, organizationId: ORG, description: 'Máy không lên nguồn' });
    await submit(1);
    await submit(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = headerOf(fetchMock.mock.calls[0], 'idempotency-key');
    expect(headerOf(fetchMock.mock.calls[1], 'idempotency-key')).toBe(first);
    expect(container.textContent).toContain('Chưa xác nhận được kết quả.');
    await fill({ description: 'Máy kêu to' });
    await submit(1);
    expect(headerOf(fetchMock.mock.calls[2], 'idempotency-key')).not.toBe(first);
  });

  it('T32 the transition form is filled from the selected case, refuses a resolve without an outcome before any request, and sends the outcome when given', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(jsonResponse(200, { id: CASE, status: 'resolved', version: 5, outcome: 'replaced' })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onCaseChanged = vi.fn();
    await render({ onCaseChanged, activeCase: { id: CASE, status: 'in_progress', version: 4, outcome: null } });
    expect((field('caseId') as HTMLInputElement).value).toBe(CASE);
    expect((field('expectedVersion') as HTMLInputElement).value).toBe('4');
    await fill({ nextState: 'resolved', reason: 'Đã sửa xong', outcome: '' });
    await submit(2);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Cần chọn kết quả khi chuyển sang Đã giải quyết.');
    await fill({ outcome: 'replaced' });
    await submit(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(`${BASE}/v1/cases/${CASE}/transitions`);
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      next_state: 'resolved',
      reason: 'Đã sửa xong',
      expected_version: 4,
      outcome: 'replaced',
    });
    expect(onCaseChanged).toHaveBeenCalledWith({ id: CASE, status: 'resolved', version: 5, outcome: 'replaced' });
    expect((field('expectedVersion') as HTMLInputElement).value).toBe('5');
  });

  it('T38 user text is sent as data and never rendered as markup, and no link is rendered', async () => {
    const typed = '<img src=x onerror="alert(1)"><a href="javascript:alert(2)">x</a>';
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(201, { id: ITEM })));
    vi.stubGlobal('fetch', fetchMock);
    await render();
    await fill({ title: typed });
    await submit(0);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { title: string };
    expect(body.title).toBe(typed);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a[href]')).toBeNull();
  });

  it('T32 the forms read in English when the locale is English', async () => {
    await render({ locale: 'en' });
    expect(container.textContent).toContain('Add item');
    expect(container.textContent).toContain('Open case');
    expect(container.textContent).toContain('Move case status');
    expect(container.textContent).not.toContain('Thêm món');
  });
});
