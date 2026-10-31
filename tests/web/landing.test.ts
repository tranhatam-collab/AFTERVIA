import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'parse5';
import { buildLanding } from '../../apps/landing/build.mjs';
import { CONTENT, SITE } from '../../apps/landing/src/content.mjs';
import { BANNED_PHRASES, validateContent } from '../../apps/landing/src/render.mjs';

// Kiểm thử landing tĩnh WEB-01. Tên kiểm thử KHÔNG bắt đầu bằng mã T-xx để không ghi PASS vào ma trận:
// T33 và T32 yêu cầu phạm vi toàn ứng dụng (auth, upload, case, grant, delete), trang này chỉ là tập con.

interface TreeNode {
  nodeName: string;
  tagName?: string;
  attrs?: Array<{ name: string; value: string }>;
  value?: string;
  childNodes?: TreeNode[];
}

interface Entry {
  el: TreeNode;
  ancestors: TreeNode[];
}

interface ParsedPage {
  root: TreeNode;
  elements: Entry[];
  parseErrors: string[];
  htmlLang: string;
}

type Locale = 'vi' | 'en';

const PAGE_FILE: Record<Locale, string> = { vi: 'index.html', en: 'en/index.html' };

function isElement(node: TreeNode): boolean {
  return typeof node.tagName === 'string';
}

function kids(node: TreeNode): TreeNode[] {
  return node.childNodes ?? [];
}

function attr(node: TreeNode, name: string): string | undefined {
  return node.attrs?.find((item) => item.name === name)?.value;
}

function textOf(node: TreeNode): string {
  if (node.nodeName === '#text') return node.value ?? '';
  return kids(node).map(textOf).join('');
}

function collect(node: TreeNode, ancestors: TreeNode[], out: Entry[]): void {
  if (isElement(node)) {
    out.push({ el: node, ancestors });
    for (const child of kids(node)) collect(child, [...ancestors, node], out);
    return;
  }
  for (const child of kids(node)) collect(child, ancestors, out);
}

function textsByLang(node: TreeNode, lang: string, out: Array<{ lang: string; text: string }>): void {
  if (node.nodeName === '#text') {
    out.push({ lang, text: node.value ?? '' });
    return;
  }
  const next = isElement(node) ? (attr(node, 'lang') ?? lang) : lang;
  for (const child of kids(node)) textsByLang(child, next, out);
}

function parsePage(html: string): ParsedPage {
  const parseErrors: string[] = [];
  const root = parse(html, {
    sourceCodeLocationInfo: true,
    onParseError: (error) => {
      parseErrors.push(`${error.code} @${error.startLine}:${error.startCol}`);
    },
  }) as unknown as TreeNode;
  const elements: Entry[] = [];
  collect(root, [], elements);
  const htmlEl = elements.find((entry) => entry.el.tagName === 'html')?.el;
  return { root, elements, parseErrors, htmlLang: htmlEl ? (attr(htmlEl, 'lang') ?? '') : '' };
}

function targetFile(path: string): string {
  const clean = path.split(/[#?]/)[0] ?? '';
  if (clean === '' || clean === '/') return 'index.html';
  return clean.endsWith('/') ? `${clean.slice(1)}index.html` : clean.slice(1);
}

function cssTokens(css: string): { light: Record<string, string>; dark: Record<string, string> } {
  const [lightBlock = '', darkBlock = ''] = css.split('@media (prefers-color-scheme: dark)');
  const read = (block: string): Record<string, string> =>
    Object.fromEntries([...block.matchAll(/--color-([a-z-]+):\s*(#[0-9A-Fa-f]{6});/g)].map((m) => [m[1], m[2]]));
  return { light: read(lightBlock), dark: read(darkBlock) };
}

// Độ chói và tỉ lệ tương phản theo công thức WCAG 2.x.
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

let workdir = '';
let devDist = '';
let prodDist = '';

const readText = (dir: string, rel: string): string => readFileSync(join(dir, rel), 'utf8');
const loadPage = (locale: Locale, dir: string = devDist): ParsedPage => parsePage(readText(dir, PAGE_FILE[locale]));

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), 'aftervia-landing-'));
  devDist = join(workdir, 'preview');
  prodDist = join(workdir, 'production');
  buildLanding({ outDir: devDist, siteEnv: 'preview' });
  buildLanding({ outDir: prodDist, siteEnv: 'production' });
});

afterAll(() => {
  if (workdir) rmSync(workdir, { recursive: true, force: true });
});

describe('landing AFTERVIA (WEB-01)', () => {
  describe('US18: song ngữ, không chuỗi công khai cứng', () => {
    it('US18 landing: hai ngôn ngữ cùng cấu trúc khóa, không chuỗi rỗng, không cụm từ cấm', () => {
      expect(validateContent(CONTENT)).toEqual([]);
    });

    it('US18 landing: lang, hreflang, canonical và og:locale của mỗi trang khớp ngôn ngữ', () => {
      for (const locale of ['vi', 'en'] as const) {
        const { elements, htmlLang } = loadPage(locale);
        const expected = CONTENT[locale];
        expect(htmlLang).toBe(expected.lang);
        const link = (rel: string, hreflang?: string): TreeNode | undefined =>
          elements.find(
            ({ el }) =>
              el.tagName === 'link' &&
              attr(el, 'rel') === rel &&
              (hreflang === undefined || attr(el, 'hreflang') === hreflang),
          )?.el;
        const meta = (property: string): TreeNode | undefined =>
          elements.find(({ el }) => el.tagName === 'meta' && attr(el, 'property') === property)?.el;
        expect(attr(link('canonical') as TreeNode, 'href')).toBe(`${SITE.origin}${expected.path}`);
        expect(attr(link('alternate', 'vi') as TreeNode, 'href')).toBe(`${SITE.origin}/`);
        expect(attr(link('alternate', 'en') as TreeNode, 'href')).toBe(`${SITE.origin}/en/`);
        expect(attr(link('alternate', 'x-default') as TreeNode, 'href')).toBe(`${SITE.origin}/`);
        expect(attr(meta('og:locale') as TreeNode, 'content')).toBe(expected.ogLocale);
        expect(attr(meta('og:locale:alternate') as TreeNode, 'content')).toBe(expected.ogLocaleAlternate);
      }
    });

    it('US18 landing: trang en không có chữ tiếng Việt ngoài phần đánh dấu lang="vi"', () => {
      const { root, htmlLang } = loadPage('en');
      const texts: Array<{ lang: string; text: string }> = [];
      textsByLang(root, htmlLang, texts);
      const vietnamese = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
      const leaks = texts.filter((item) => item.lang === 'en' && vietnamese.test(item.text));
      expect(leaks.map((item) => item.text)).toEqual([]);
    });

    it('US18 landing: ngày hiển thị đúng định dạng từng ngôn ngữ', () => {
      const expectedDate: Record<Locale, string> = { vi: '31 tháng 10, 2026', en: 'October 31, 2026' };
      for (const locale of ['vi', 'en'] as const) {
        const time = loadPage(locale).elements.find(({ el }) => el.tagName === 'time')?.el;
        expect(time).toBeDefined();
        expect(textOf(time as TreeNode)).toBe(expectedDate[locale]);
        expect(attr(time as TreeNode, 'datetime')).toBe(SITE.lastReviewed);
      }
    });

    it('US18 landing: build dừng khi thiếu khóa bản dịch hoặc môi trường không hợp lệ', () => {
      const broken = JSON.parse(JSON.stringify(CONTENT)) as Record<string, Record<string, unknown>>;
      const enCopy = broken.en as Record<string, unknown>;
      const hero = { ...(enCopy.hero as Record<string, unknown>) };
      delete hero.h1;
      enCopy.hero = hero;
      expect(() =>
        buildLanding({ outDir: join(workdir, 'broken'), siteEnv: 'preview', content: broken as unknown as typeof CONTENT }),
      ).toThrow(/thiếu khóa/);
      expect(() => buildLanding({ outDir: join(workdir, 'bad-env'), siteEnv: 'staging' })).toThrow(/AFTERVIA_SITE_ENV/);
    });
  });

  describe('WEB-01: cấu trúc, liên kết và tương phản (tập con T33, không ghi vào ma trận)', () => {
    it('WEB-01 a11y: HTML không có lỗi phân tích, có doctype, charset, viewport không khóa zoom', () => {
      for (const locale of ['vi', 'en'] as const) {
        const html = readText(devDist, PAGE_FILE[locale]);
        const parsed = parsePage(html);
        expect(parsed.parseErrors).toEqual([]);
        expect(html.startsWith('<!doctype html>')).toBe(true);
        expect(parsed.elements.some(({ el }) => attr(el, 'charset') === 'utf-8')).toBe(true);
        const viewport = parsed.elements.find(({ el }) => attr(el, 'name') === 'viewport')?.el;
        expect(viewport).toBeDefined();
        expect(/user-scalable=no|maximum-scale=1\b/.test(attr(viewport as TreeNode, 'content') ?? '')).toBe(false);
      }
    });

    it('WEB-01 a11y: một h1, heading không nhảy quá một cấp, có main, header, footer và nav có nhãn', () => {
      for (const locale of ['vi', 'en'] as const) {
        const { elements } = loadPage(locale);
        const levels = elements
          .filter(({ el }) => /^h[1-6]$/.test(el.tagName ?? ''))
          .map(({ el }) => Number((el.tagName ?? '').slice(1)));
        expect(levels.filter((level) => level === 1)).toHaveLength(1);
        for (let i = 1; i < levels.length; i += 1) {
          expect((levels[i] ?? 0) - (levels[i - 1] ?? 0)).toBeLessThanOrEqual(1);
        }
        expect(elements.filter(({ el }) => el.tagName === 'main' && attr(el, 'id') === 'main')).toHaveLength(1);
        expect(elements.some(({ el }) => el.tagName === 'header')).toBe(true);
        expect(elements.some(({ el }) => el.tagName === 'footer')).toBe(true);
        const navs = elements.filter(({ el }) => el.tagName === 'nav');
        expect(navs.length).toBeGreaterThanOrEqual(2);
        for (const { el } of navs) {
          expect((attr(el, 'aria-label') ?? '').length).toBeGreaterThan(0);
        }
      }
    });

    it('WEB-01 a11y: skip link là phần tử focus đầu tiên và trỏ tới #main có thật', () => {
      for (const locale of ['vi', 'en'] as const) {
        const { elements } = loadPage(locale);
        const focusable = elements.filter(
          ({ el }) =>
            (el.tagName === 'a' && attr(el, 'href') !== undefined) ||
            ['button', 'input', 'select', 'textarea'].includes(el.tagName ?? ''),
        );
        const first = (focusable[0] as Entry).el;
        expect(attr(first, 'class')).toBe('skip-link');
        expect(attr(first, 'href')).toBe('#main');
        expect(elements.some(({ el }) => attr(el, 'id') === 'main')).toBe(true);
      }
    });

    it('WEB-01 a11y: mọi liên kết có tên truy cập được, id không trùng, mọi #neo đều có đích', () => {
      for (const locale of ['vi', 'en'] as const) {
        const { elements } = loadPage(locale);
        const ids = elements.map(({ el }) => attr(el, 'id')).filter((id): id is string => id !== undefined);
        expect(new Set(ids).size).toBe(ids.length);
        for (const { el } of elements.filter(({ el }) => el.tagName === 'a')) {
          const name = textOf(el).trim() || attr(el, 'aria-label') || '';
          expect(name.length, `liên kết không có tên: ${attr(el, 'href')}`).toBeGreaterThan(0);
          const href = attr(el, 'href') ?? '';
          if (href.startsWith('#')) expect(ids).toContain(href.slice(1));
        }
      }
    });

    it('WEB-01 links: mọi liên kết và tài nguyên nội bộ trỏ tới tệp có thật; không tham chiếu ngoài origin', () => {
      for (const dir of [devDist, prodDist]) {
        for (const locale of ['vi', 'en'] as const) {
          const { elements } = loadPage(locale, dir);
          const refs = elements
            .filter(({ el }) => el.tagName === 'a' || el.tagName === 'link')
            .map(({ el }) => attr(el, 'href'))
            .filter((href): href is string => href !== undefined);
          expect(refs.length).toBeGreaterThan(0);
          for (const ref of refs) {
            if (ref.startsWith('#')) continue;
            const local = ref.startsWith(SITE.origin) ? ref.slice(SITE.origin.length) : ref;
            expect(local.startsWith('/'), `tham chiếu ngoài origin: ${ref}`).toBe(true);
            expect(existsSync(join(dir, targetFile(local))), `thiếu tệp cho ${ref}`).toBe(true);
          }
        }
      }
    });

    it('WEB-01 contrast: token màu đạt WCAG AA ở chế độ sáng và tối; focus và accent đạt 3:1', () => {
      const { light, dark } = cssTokens(readText(devDist, 'styles.css'));
      const required = ['ink', 'ink-muted', 'paper', 'surface', 'link', 'warning', 'on-primary', 'primary', 'pill-ink', 'pill-bg', 'focus', 'accent'];
      const textPairs: Array<[string, string]> = [
        ['ink', 'paper'],
        ['ink', 'surface'],
        ['ink-muted', 'paper'],
        ['ink-muted', 'surface'],
        ['link', 'paper'],
        ['link', 'surface'],
        ['warning', 'paper'],
        ['warning', 'surface'],
        ['on-primary', 'primary'],
        ['pill-ink', 'pill-bg'],
      ];
      const nonTextPairs: Array<[string, string]> = [
        ['focus', 'paper'],
        ['accent', 'paper'],
      ];
      for (const [mode, tokens] of [
        ['sáng', light],
        ['tối', dark],
      ] as const) {
        for (const name of required) expect(tokens[name], `chế độ ${mode} thiếu token ${name}`).toBeDefined();
        for (const [a, b] of textPairs) {
          expect(contrast(tokens[a] ?? '#000000', tokens[b] ?? '#FFFFFF'), `chế độ ${mode}: ${a} trên ${b}`).toBeGreaterThanOrEqual(4.5);
        }
        for (const [a, b] of nonTextPairs) {
          expect(contrast(tokens[a] ?? '#000000', tokens[b] ?? '#FFFFFF'), `chế độ ${mode}: ${a} trên ${b}`).toBeGreaterThanOrEqual(3);
        }
      }
    });

    it('WEB-01 css: không @import, không url(), không expression(); có :focus-visible và prefers-reduced-motion', () => {
      const css = readText(devDist, 'styles.css');
      expect(css).not.toMatch(/@import/);
      expect(css).not.toMatch(/url\(/);
      expect(css).not.toMatch(/expression\(/i);
      expect(css).toMatch(/:focus-visible/);
      expect(css).toMatch(/prefers-reduced-motion/);
    });

    it('WEB-01 404: trang lỗi có noindex, đúng một h1 và liên kết về trang chủ hai ngôn ngữ', () => {
      const html = readText(devDist, '404.html');
      const parsed = parsePage(html);
      expect(parsed.parseErrors).toEqual([]);
      expect(html).toContain('<meta name="robots" content="noindex,nofollow">');
      expect(parsed.elements.filter(({ el }) => el.tagName === 'h1')).toHaveLength(1);
      expect(html).toContain('href="/"');
      expect(html).toContain('href="/en/"');
    });
  });

  describe('WEB-01: không thu thập dữ liệu và cấu hình an toàn', () => {
    it('WEB-01 privacy: không có form, input, script, iframe, object, embed, media, button, style inline hay on*', () => {
      const forbidden = [
        'form',
        'input',
        'textarea',
        'select',
        'button',
        'script',
        'iframe',
        'frame',
        'frameset',
        'object',
        'embed',
        'video',
        'audio',
        'source',
        'track',
      ];
      for (const locale of ['vi', 'en'] as const) {
        const { elements } = loadPage(locale);
        for (const { el } of elements) {
          expect(forbidden, `thẻ cấm: ${el.tagName}`).not.toContain(el.tagName);
          expect(attr(el, 'style'), `style inline trên ${el.tagName}`).toBeUndefined();
          for (const item of el.attrs ?? []) {
            expect(item.name.startsWith('on'), `thuộc tính sự kiện: ${item.name}`).toBe(false);
          }
        }
      }
    });

    it('WEB-01 privacy: không preconnect, prefetch hay preload; không email; không liên kết tới chính sách chưa công bố', () => {
      for (const locale of ['vi', 'en'] as const) {
        const { elements, root } = loadPage(locale);
        for (const { el } of elements.filter(({ el }) => el.tagName === 'link')) {
          expect(['preconnect', 'dns-prefetch', 'prefetch', 'preload', 'modulepreload']).not.toContain(attr(el, 'rel') ?? '');
        }
        for (const { el } of elements) {
          const href = attr(el, 'href') ?? '';
          expect(/privacy|terms|chinh-sach|dieu-khoan|quyen-rieng-tu|mailto:/i.test(href), `liên kết: ${href}`).toBe(false);
        }
        expect(textOf(root)).not.toContain('@');
      }
    });

    it('WEB-01 csp: _headers có CSP chặn script, form, frame và header bảo mật, không unsafe-inline', () => {
      const headers = readText(devDist, '_headers');
      const csp = headers.split('\n').find((line) => line.trim().startsWith('Content-Security-Policy:')) ?? '';
      for (const directive of [
        "default-src 'none'",
        "script-src 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "object-src 'none'",
      ]) {
        expect(csp).toContain(directive);
      }
      expect(csp).not.toMatch(/unsafe-|\*/);
      expect(headers).toMatch(/X-Content-Type-Options:\s*nosniff/);
      expect(headers).toMatch(/Referrer-Policy:\s*strict-origin-when-cross-origin/);
      expect(headers).toMatch(/Permissions-Policy:/);
      expect(headers).toMatch(/Strict-Transport-Security:\s*max-age=\d+/);
      // Không bật includeSubDomains: tránh ảnh hưởng các subdomain khác của iai.one.
      expect(headers).not.toMatch(/includeSubDomains/);
      for (const line of headers.split('\n')) expect(line.length).toBeLessThan(2000);
    });
  });

  describe('WEB-01: nội dung theo brand và giá đề xuất', () => {
    it('WEB-01 content: không có cụm từ cấm theo brand, không có % và không có số liệu chưa kiểm chứng', () => {
      for (const locale of ['vi', 'en'] as const) {
        const text = textOf(loadPage(locale).root);
        for (const pattern of BANNED_PHRASES) {
          expect(pattern.test(text), `cụm từ cấm: ${String(pattern)}`).toBe(false);
        }
        expect(text).not.toContain('%');
      }
    });

    it('WEB-01 pricing: mọi mức giá có nhãn đề xuất, ghi chưa mở bán, không có nút mua hay thanh toán', () => {
      for (const locale of ['vi', 'en'] as const) {
        const { elements } = loadPage(locale);
        const section = elements.find(({ el }) => attr(el, 'id') === 'pricing')?.el as TreeNode;
        expect(section).toBeDefined();
        const text = textOf(section);
        for (const card of CONTENT[locale].pricing.cards) {
          expect(text).toContain(card.name);
          expect(text).toContain(card.price);
          expect(text).toContain(card.tag);
        }
        expect(text).toContain(CONTENT[locale].pricing.note);
        expect(text.toLowerCase()).toMatch(locale === 'vi' ? /chưa mở bán/ : /not on sale/);
        for (const { el } of elements) {
          expect(/checkout|pay|buy|cart|mua/i.test(attr(el, 'href') ?? '')).toBe(false);
        }
      }
    });

    it('WEB-01 status: ba nhóm đang có, đang thử, dự kiến đều có mục và có ghi chú không phải tính năng mở', () => {
      const labels: Record<Locale, string[]> = {
        vi: ['Đang có', 'Đang thử', 'Dự kiến'],
        en: ['In place', 'Being tested', 'Planned'],
      };
      for (const locale of ['vi', 'en'] as const) {
        const { elements } = loadPage(locale);
        const section = elements.find(({ el }) => attr(el, 'id') === 'status')?.el as TreeNode;
        const headings = elements
          .filter(({ el, ancestors }) => el.tagName === 'h3' && ancestors.includes(section))
          .map(({ el }) => textOf(el));
        expect(headings).toEqual(labels[locale]);
        const lists = elements.filter(({ el, ancestors }) => el.tagName === 'ul' && ancestors.includes(section));
        expect(lists).toHaveLength(3);
        for (const { el } of lists) {
          expect(kids(el).filter((node) => node.nodeName === 'li').length).toBeGreaterThan(0);
        }
        expect(textOf(section).toLowerCase()).toContain(CONTENT[locale].status.closing.toLowerCase());
      }
    });

    it('WEB-01 brand: có ghi chú tên làm việc, trạng thái chưa công bố pháp lý và chưa có kênh liên hệ', () => {
      for (const locale of ['vi', 'en'] as const) {
        const text = textOf(loadPage(locale).root);
        expect(text).toContain(CONTENT[locale].footer.workingName);
        expect(text).toContain(CONTENT[locale].footer.legal);
        expect(text).toContain(CONTENT[locale].footer.contact);
      }
    });
  });

  describe('WEB-01: SEO, robots, sitemap và manifest', () => {
    it('WEB-01 seo: title, description, og:image và kích thước PNG khớp cấu hình', () => {
      for (const locale of ['vi', 'en'] as const) {
        const { elements } = loadPage(locale);
        const title = textOf(elements.find(({ el }) => el.tagName === 'title')?.el as TreeNode);
        expect(title.length).toBeGreaterThanOrEqual(10);
        expect(title.length).toBeLessThanOrEqual(70);
        const description = attr(
          elements.find(({ el }) => el.tagName === 'meta' && attr(el, 'name') === 'description')?.el as TreeNode,
          'content',
        ) ?? '';
        expect(description.length).toBeGreaterThanOrEqual(50);
        expect(description.length).toBeLessThanOrEqual(180);
        const image = attr(elements.find(({ el }) => attr(el, 'property') === 'og:image')?.el as TreeNode, 'content');
        expect(image).toBe(`${SITE.origin}${SITE.ogImage.path}`);
      }
      const png = readFileSync(join(devDist, 'og-image.png'));
      expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(SITE.ogImage.width);
      expect(png.readUInt32BE(20)).toBe(SITE.ogImage.height);
    });

    it('WEB-01 robots: preview là noindex và chặn crawl; production là index và có sitemap', () => {
      const previewRobots = readText(devDist, 'robots.txt');
      expect(previewRobots).toContain('Disallow: /');
      expect(previewRobots).not.toContain('Sitemap:');
      const prodRobots = readText(prodDist, 'robots.txt');
      expect(prodRobots).not.toContain('Disallow: /');
      expect(prodRobots).toContain(`Sitemap: ${SITE.origin}/sitemap.xml`);
      for (const locale of ['vi', 'en'] as const) {
        const previewMeta = loadPage(locale, devDist).elements.find(({ el }) => attr(el, 'name') === 'robots')?.el as TreeNode;
        const prodMeta = loadPage(locale, prodDist).elements.find(({ el }) => attr(el, 'name') === 'robots')?.el as TreeNode;
        expect(attr(previewMeta, 'content')).toBe('noindex,nofollow');
        expect(attr(prodMeta, 'content')).toBe('index,follow');
      }
    });

    it('WEB-01 sitemap: liệt kê đúng hai URL, mỗi URL có hreflang vi và en', () => {
      const xml = readText(prodDist, 'sitemap.xml');
      const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      expect(locs).toEqual([`${SITE.origin}/`, `${SITE.origin}/en/`]);
      expect(xml.match(/hreflang="vi"/g)).toHaveLength(2);
      expect(xml.match(/hreflang="en"/g)).toHaveLength(2);
    });

    it('WEB-01 manifest: site.webmanifest đọc được, icon tồn tại; favicon là SVG hoàn chỉnh', () => {
      const manifest = JSON.parse(readText(devDist, 'site.webmanifest')) as {
        name: string;
        start_url: string;
        icons: Array<{ src: string }>;
      };
      expect(manifest.name).toBe(SITE.name);
      expect(manifest.start_url).toBe('/');
      for (const icon of manifest.icons) {
        expect(existsSync(join(devDist, icon.src.replace(/^\//, '')))).toBe(true);
      }
      const favicon = readText(devDist, 'favicon.svg').trim();
      expect(favicon.startsWith('<svg')).toBe(true);
      expect(favicon.endsWith('</svg>')).toBe(true);
    });
  });
});
