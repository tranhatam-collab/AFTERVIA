import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { t, type Locale } from '@aftervia/i18n';
import { App } from '../../apps/web/src/App';
import type { Item, ListResult } from '../../apps/web/src/state';
import { ItemsView } from '../../apps/web/src/view';
import { CONTENT } from '../../apps/landing/src/content.mjs';
import { renderLocalePage, renderNotFound } from '../../apps/landing/src/render.mjs';

// Kiểm truy cập tự động (WO15-01, mã T33). axe-core chạy trong jsdom trên HTML của:
// - Web Desk: mọi trạng thái (đang tải, rỗng, có món, bị từ chối, lỗi, ngoại tuyến có và không có dữ liệu cũ), VI và EN;
//   và App thật ở trạng thái đang tải (renderToStaticMarkup, không chạy effect).
// - Landing VI và EN, và trang 404.
// Giới hạn ghi trong evidence WO15-01: axe không thay thế kiểm thử screen reader thật (DEV-01);
// luồng auth, upload, case, grant và delete chưa có màn hình trong web, nên không được kiểm ở đây;
// độ tương phản cần bố cục thật nên kết quả trong jsdom có thể là "incomplete", không phải vi phạm.

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

interface AxeViolation {
  id: string;
  impact?: string | null;
  nodes: Array<{ target: string[] }>;
}

interface JsdomWindow {
  document: unknown;
  eval(code: string): unknown;
  close(): void;
  axe: { run(context: unknown, options: object): Promise<{ violations: AxeViolation[] }> };
}

const { JSDOM } = require('jsdom') as {
  JSDOM: new (html: string, options: { runScripts: 'outside-only'; pretendToBeVisual: boolean }) => { window: JsdomWindow };
};

const RULES = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } };
const BASE = 'https://api.example.test';
const LOCALES: Locale[] = ['vi', 'en'];
const UUID_A = '00000000-0000-4000-8000-0000000000a1';

const ITEM: Item = {
  id: UUID_A,
  title: 'Máy giặt',
  brand: 'Hãng Y',
  model: null,
  purchased_on: '2026-05-02',
  currency: 'VND',
  version: 1,
};

const DESK_STATES: Array<{ name: string; result: ListResult }> = [
  { name: 'loading', result: { kind: 'loading' } },
  { name: 'empty', result: { kind: 'success', items: [] } },
  { name: 'success with items', result: { kind: 'success', items: [ITEM] } },
  { name: 'denied', result: { kind: 'denied' } },
  { name: 'error', result: { kind: 'error' } },
  { name: 'offline without cached data', result: { kind: 'offline', cached: null } },
  { name: 'offline with cached data', result: { kind: 'offline', cached: [ITEM] } },
];

function page(locale: Locale, body: string): string {
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AFTERVIA</title></head><body>${body}</body></html>`;
}

function deskPage(locale: Locale, result: ListResult): string {
  const view = renderToStaticMarkup(createElement(ItemsView, { locale, result, onRetry: () => {} }));
  return page(locale, `<main class="page"><header class="toolbar"><h1>${t(locale, 'app.name')}</h1></header>${view}</main>`);
}

function appLoadingPage(locale: Locale): string {
  return page(locale, renderToStaticMarkup(createElement(App, { base: BASE, token: 'dev-token', initialLocale: locale })));
}

// Trả về danh sách vi phạm dạng chuỗi (mã quy tắc, mức độ, đích), để thông báo lỗi chỉ ra đúng chỗ.
async function violationsOf(html: string): Promise<string[]> {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  try {
    // eval có chủ đích: nạp axe-core đã ghim phiên bản từ node_modules vào cửa sổ jsdom cô lập.
    // runScripts: 'outside-only' nghĩa là script có trong HTML đang kiểm không chạy; chỉ mã của axe được nạp.
    dom.window.eval(AXE_SOURCE);
    const result = await dom.window.axe.run(dom.window.document, RULES);
    return result.violations.map((v) => `${v.id} (${v.impact ?? 'n/a'}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  } finally {
    dom.window.close();
  }
}

describe('WO15-01 automatic accessibility checks (axe-core) on the web desk, the app shell and the landing pages', () => {
  for (const locale of LOCALES) {
    for (const state of DESK_STATES) {
      it(`T33 web desk ${locale}, ${state.name}: axe finds no violation`, async () => {
        expect(await violationsOf(deskPage(locale, state.result))).toEqual([]);
      });
    }

    it(`T33 app shell ${locale}, loading: the real App markup has no axe violation`, async () => {
      expect(await violationsOf(appLoadingPage(locale))).toEqual([]);
    });
  }

  for (const locale of LOCALES) {
    it(`T33 landing ${locale}: axe finds no violation on the public page`, async () => {
      expect(await violationsOf(renderLocalePage(CONTENT[locale], 'production'))).toEqual([]);
    });
  }

  it('T33 the 404 page has no axe violation', async () => {
    expect(await violationsOf(renderNotFound(CONTENT))).toEqual([]);
  });

  it('T33 the error state is announced as an alert and keeps a named retry control', () => {
    const html = deskPage('vi', { kind: 'error' });
    expect(html).toMatch(/<p role="alert">/);
    expect(html).toMatch(/<button type="button">[^<]+<\/button>/);
  });

  it('T33 no page uses a positive tabindex, so the keyboard order follows the document order', () => {
    const pages = [
      deskPage('vi', { kind: 'success', items: [ITEM] }),
      deskPage('en', { kind: 'error' }),
      appLoadingPage('vi'),
      renderLocalePage(CONTENT.vi, 'production'),
      renderLocalePage(CONTENT.en, 'production'),
      renderNotFound(CONTENT),
    ];
    for (const html of pages) {
      expect(html).not.toMatch(/tabindex="[1-9]/);
    }
  });

  it('T33 the landing skip link targets the main landmark that exists on the page', () => {
    for (const locale of LOCALES) {
      const html = renderLocalePage(CONTENT[locale], 'production');
      expect(html).toMatch(/<a class="skip-link" href="#main">/);
      expect(html).toMatch(/<main id="main"/);
    }
  });

  it('T33 the web app entry declares the document language before any script runs', () => {
    const indexHtml = readFileSync(join(HERE, '../../apps/web/index.html'), 'utf8');
    expect(indexHtml).toMatch(/<html lang="vi">/);
    expect(indexHtml).toMatch(/<meta charset="utf-8" \/>/);
  });
});
