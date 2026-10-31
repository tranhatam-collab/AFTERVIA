import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { formatDateOnly, t, type Locale, type MessageKey } from '@aftervia/i18n';
import { ITEMS_PATH, classifyStatus, loadItems, networkFailure, parseItems, type Item, type ListResult } from '../../apps/web/src/state';
import { ItemsView } from '../../apps/web/src/view';

// Kiểm thử Web Desk (WO10-01). Tên có mã T32 hoặc T38 chỉ kiểm đúng phạm vi của mã đó.
// T32 ở đây: chữ VI và EN của mọi trạng thái, chữ dài không bị cắt, ngày theo ngôn ngữ (dựng HTML trên Node).
// Bố cục mobile và chuyển ngôn ngữ trong trình duyệt được kiểm ngoài repo và ghi trong evidence.
// Thiết bị thật thuộc DEV-01, nên T32 vẫn ở mức PARTIAL.
// T38 ở đây: thoát nội dung, không có liên kết dựng từ dữ liệu, không có HTML thô trong mã nguồn,
// và biên giới yêu cầu mạng (chỉ một đường dẫn cố định, chống SSRF).

const BASE = 'https://api.example.test';
const LOCALES: Locale[] = ['vi', 'en'];
const UUID_A = '00000000-0000-4000-8000-0000000000a1';

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: UUID_A,
    title: 'Máy giặt',
    brand: 'Hãng Y',
    model: null,
    purchased_on: '2026-05-02',
    currency: 'VND',
    version: 1,
    ...overrides,
  };
}

// React thoát các ký tự này khi dựng HTML. Kỳ vọng được thoát theo cùng cách.
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function render(locale: Locale, result: ListResult): string {
  return renderToStaticMarkup(createElement(ItemsView, { locale, result, onRetry: () => undefined }));
}

// Trình giả lập fetch: ghi lại mọi URL được gọi rồi trả về phản hồi đã cho.
function fakeFetch(status: number, body: unknown, calls: string[]): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

describe('WO10-01 Web Desk: states, escaping, and the request boundary', () => {
  it('classifies HTTP statuses: 2xx is a success; 401, 403 and 404 are denied; anything else is an error', () => {
    expect(classifyStatus(200)).toBe('success');
    expect(classifyStatus(204)).toBe('success');
    expect(classifyStatus(401)).toBe('denied');
    expect(classifyStatus(403)).toBe('denied');
    expect(classifyStatus(404)).toBe('denied');
    expect(classifyStatus(409)).toBe('error');
    expect(classifyStatus(500)).toBe('error');
  });

  it('a network failure is offline only when the browser reports no connection, otherwise it is an error', () => {
    expect(networkFailure(false)).toBe('offline');
    expect(networkFailure(true)).toBe('error');
  });

  it('a response that does not match the item shape is an error, and nothing from it is shown', async () => {
    const calls: string[] = [];
    const wrongShape = await loadItems({
      fetchImpl: fakeFetch(200, { items: [{ id: 'not-a-uuid', title: 'x' }] }, calls),
      base: BASE,
      token: 'token',
      online: true,
    });
    expect(wrongShape).toEqual({ kind: 'error' });
    const notJson = (async () => new Response('<html>', { status: 200 })) as typeof fetch;
    expect(await loadItems({ fetchImpl: notJson, base: BASE, token: 'token', online: true })).toEqual({ kind: 'error' });
    expect(parseItems({ items: [item({ version: 0 })] })).toBeNull();
  });

  it('the request function is called without a receiver, as the browser fetch requires', async () => {
    // Hàm giống fetch của trình duyệt: từ chối khi được gọi như thuộc tính của một đối tượng khác.
    const unbound = function (this: unknown): Promise<Response> {
      if (this !== undefined) return Promise.reject(new TypeError('Illegal invocation'));
      return Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'content-type': 'application/json' } }));
    } as unknown as typeof fetch;
    const result = await loadItems({ fetchImpl: unbound, base: BASE, token: 'token', online: true });
    expect(result).toEqual({ kind: 'success', items: [] });
  });

  it('without a token nothing is requested and the result is denied', async () => {
    const calls: string[] = [];
    const result = await loadItems({ fetchImpl: fakeFetch(200, { items: [] }, calls), base: BASE, token: null, online: true });
    expect(result).toEqual({ kind: 'denied' });
    expect(calls).toEqual([]);
  });

  it('T32 every state has a Vietnamese and an English message, and the two languages show different text', () => {
    const cases: Array<{ result: ListResult; keys: MessageKey[] }> = [
      { result: { kind: 'loading' }, keys: ['common.loading'] },
      { result: { kind: 'denied' }, keys: ['common.denied'] },
      { result: { kind: 'error' }, keys: ['common.error', 'common.retry'] },
      { result: { kind: 'offline', cached: null }, keys: ['common.offline'] },
      { result: { kind: 'success', items: [] }, keys: ['common.empty'] },
    ];
    for (const { result, keys } of cases) {
      for (const key of keys) {
        const vi = t('vi', key);
        const en = t('en', key);
        expect(vi).not.toBe(en);
        expect(render('vi', result)).toContain(escapeHtml(vi));
        expect(render('en', result)).toContain(escapeHtml(en));
      }
    }
  });

  it('T32 a long Vietnamese item title is shown whole, with its diacritics, and nothing is cut with an ellipsis', () => {
    const title =
      'Máy giặt cửa trước lồng ngang 9 kg, mua tại cửa hàng ở Quận Bình Thạnh, kèm phụ kiện đầy đủ theo hộp gốc, có phiếu bảo hành điện tử và tài liệu hướng dẫn tiếng Việt';
    for (const locale of LOCALES) {
      const markup = render(locale, { kind: 'success', items: [item({ title })] });
      expect(markup).toContain(escapeHtml(title));
      expect(markup).not.toContain('…');
    }
  });

  it('T32 the same purchase date reads in the chosen language', () => {
    const vi = render('vi', { kind: 'success', items: [item({ purchased_on: '2026-05-02' })] });
    const en = render('en', { kind: 'success', items: [item({ purchased_on: '2026-05-02' })] });
    expect(formatDateOnly('2026-05-02', 'vi')).not.toBe(formatDateOnly('2026-05-02', 'en'));
    expect(vi).toContain(escapeHtml(formatDateOnly('2026-05-02', 'vi')));
    expect(en).toContain(escapeHtml(formatDateOnly('2026-05-02', 'en')));
  });

  it('T38 item text is escaped: markup in a title or a brand is shown as text, never as an element or a link', () => {
    const title = '<img src=x onerror=alert(1)>';
    const brand = '<a href="javascript:alert(1)">bấm</a>';
    const markup = render('en', { kind: 'success', items: [item({ title, brand })] });
    expect(markup).toContain(escapeHtml(title));
    expect(markup).toContain(escapeHtml(brand));
    expect(markup).not.toMatch(/<img/i);
    expect(markup).not.toMatch(/<a\s/i);
    // Chuỗi "href=" có thể xuất hiện như văn bản đã thoát; cái cần cấm là thuộc tính href nằm trong một thẻ.
    expect(markup).not.toMatch(/<[^>]*\bhref\s*=/i);
  });

  it('T38 the page never builds a link from item data: no href attribute in any state and language', () => {
    const states: ListResult[] = [
      { kind: 'loading' },
      { kind: 'denied' },
      { kind: 'error' },
      { kind: 'offline', cached: [item({ brand: 'https://evil.example/x', model: '#' })] },
      { kind: 'success', items: [item({ title: 'https://evil.example/y' })] },
    ];
    for (const locale of LOCALES) {
      for (const result of states) {
        expect(render(locale, result)).not.toMatch(/href\s*=/i);
      }
    }
  });

  it('T38 the list request goes only to the fixed items path, whatever the item data contains', async () => {
    const calls: string[] = [];
    const body = {
      items: [item({ title: 'http://169.254.169.254/latest/meta-data/', brand: 'https://internal.example/admin' })],
    };
    const result = await loadItems({ fetchImpl: fakeFetch(200, body, calls), base: BASE, token: 'token', online: true });
    expect(result.kind).toBe('success');
    expect(calls).toEqual([`${BASE}${ITEMS_PATH}`]);
  });

  it('T38 the web source has no raw HTML sink and no dynamic code evaluation', () => {
    const forbidden = /dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new Function\s*\(/;
    const root = fileURLToPath(new URL('../../apps/web/src', import.meta.url));
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          walk(path);
        } else if (/\.(ts|tsx)$/.test(name) && forbidden.test(readFileSync(path, 'utf8'))) {
          offenders.push(relative(root, path));
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
