// Render HTML tĩnh cho landing AFTERVIA. Hàm thuần: không I/O, không phụ thuộc bên ngoài.
// Mọi giá trị động đi qua escapeHtml. Trang không có script, không có form và không có style inline.
import { SITE } from './content.mjs';

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
}

export function formatDate(isoDate, dateLocale) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(dateLocale, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

// Cụm từ brand cấm (brand/01_BRAND_PLATFORM_VI_EN.md, mục Tính cách) và cụm từ thương mại ép mua.
export const BANNED_PHRASES = [
  /đòi tiền tự động/i,
  /bảo vệ tuyệt đối/i,
  /ai luật sư/i,
  /bảo hành trọn đời/i,
  /số một thế giới/i,
  /khách hàng tin dùng/i,
  /được chứng nhận/i,
  /mua ngay/i,
  /đăng ký ngay/i,
  /automatically demand payment/i,
  /absolute protection/i,
  /\bAI lawyer\b/i,
  /lifetime warranty/i,
  /number one in the world/i,
  /trusted by/i,
  /\bcertified\b/i,
  /\bISO\b/,
  /buy now/i,
  /sign up now/i,
];

// Chuỗi được phép giống hệt nhau giữa hai ngôn ngữ (tên sản phẩm, gói, đơn vị).
const ALLOWED_SAME = new Set([
  'AFTERVIA',
  'AFTERVIA Personal',
  'AFTERVIA Desk',
  'AFTERVIA Partner',
  'Personal Basic',
  'Family',
  'Desk Starter',
  'Desk Growth',
  'Desk Scale',
  'USD',
]);
const NUMERIC_LIKE = /^[\d\s.,]+$/;

function collectShape(value, path = '', out = new Map()) {
  if (Array.isArray(value)) {
    out.set(path, `array:${value.length}`);
    value.forEach((item, index) => collectShape(item, `${path}[${index}]`, out));
  } else if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) collectShape(value[key], path ? `${path}.${key}` : key, out);
  } else {
    out.set(path, typeof value);
  }
  return out;
}

function collectStrings(value, path = '', out = []) {
  if (typeof value === 'string') {
    out.push([path, value]);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, out));
  } else if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) collectStrings(value[key], path ? `${path}.${key}` : key, out);
  }
  return out;
}

// Trả về danh sách lỗi. Danh sách rỗng nghĩa là nội dung đủ điều kiện build.
export function validateContent(content) {
  const problems = [];
  const vi = content?.vi;
  const en = content?.en;
  if (!vi || !en) return ['thiếu nội dung vi hoặc en'];

  const shapeVi = collectShape(vi);
  const shapeEn = collectShape(en);
  for (const path of shapeVi.keys()) if (!shapeEn.has(path)) problems.push(`en thiếu khóa: ${path}`);
  for (const path of shapeEn.keys()) if (!shapeVi.has(path)) problems.push(`vi thiếu khóa: ${path}`);
  for (const [path, kind] of shapeVi) {
    if (shapeEn.has(path) && shapeEn.get(path) !== kind) {
      problems.push(`khác cấu trúc tại ${path}: ${kind} và ${shapeEn.get(path)}`);
    }
  }

  const stringsVi = new Map(collectStrings(vi));
  const stringsEn = new Map(collectStrings(en));
  for (const [path, text] of [...stringsVi, ...stringsEn]) {
    if (text.length === 0 || text.trim() !== text) problems.push(`chuỗi rỗng hoặc thừa khoảng trắng: ${path}`);
    if (text.includes('%')) problems.push(`có ký tự %, không công bố số liệu chưa kiểm chứng: ${path}`);
    if (/@|https?:/i.test(text)) problems.push(`chứa email hoặc URL trong nội dung: ${path}`);
    for (const pattern of BANNED_PHRASES) {
      if (pattern.test(text)) problems.push(`cụm từ cấm theo brand: ${path}`);
    }
  }
  for (const [path, text] of stringsVi) {
    if (stringsEn.get(path) === text && !ALLOWED_SAME.has(text) && !NUMERIC_LIKE.test(text)) {
      problems.push(`giống hệt giữa hai ngôn ngữ, có thể chưa dịch: ${path}`);
    }
  }
  if (vi.path !== '/' || en.path !== '/en/') problems.push('đường dẫn của vi hoặc en không đúng');
  if (vi.lang !== 'vi' || en.lang !== 'en') problems.push('thuộc tính lang không đúng');
  if (vi.switch?.path !== en.path || en.switch?.path !== vi.path) {
    problems.push('nút đổi ngôn ngữ không trỏ đúng trang');
  }
  return problems;
}

function renderHead(locale, env) {
  const t = locale;
  const canonical = `${SITE.origin}${locale.path}`;
  const robots = env === 'production' ? 'index,follow' : 'noindex,nofollow';
  const image = `${SITE.origin}${SITE.ogImage.path}`;
  const title = escapeHtml(t.meta.title);
  const description = escapeHtml(t.meta.description);
  return [
    '<!doctype html>',
    `<html lang="${locale.lang}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<meta name="robots" content="${robots}">`,
    '<meta name="color-scheme" content="light dark">',
    '<meta name="theme-color" content="#F6F8FA" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="#0D1B22" media="(prefers-color-scheme: dark)">',
    `<link rel="canonical" href="${canonical}">`,
    `<link rel="alternate" hreflang="vi" href="${SITE.origin}/">`,
    `<link rel="alternate" hreflang="en" href="${SITE.origin}/en/">`,
    `<link rel="alternate" hreflang="x-default" href="${SITE.origin}/">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${SITE.name}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:locale" content="${locale.ogLocale}">`,
    `<meta property="og:locale:alternate" content="${locale.ogLocaleAlternate}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:width" content="${SITE.ogImage.width}">`,
    `<meta property="og:image:height" content="${SITE.ogImage.height}">`,
    `<meta property="og:image:alt" content="${escapeHtml(t.meta.ogImageAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="manifest" href="/site.webmanifest">',
    '<link rel="stylesheet" href="/styles.css">',
    '</head>',
  ].join('\n');
}

function renderHeader(locale) {
  const t = locale;
  return [
    `<a class="skip-link" href="#main">${escapeHtml(t.meta.skip)}</a>`,
    '<header class="site-header">',
    '<div class="container header-row">',
    `<a class="wordmark" href="${locale.path}">${SITE.name}</a>`,
    `<nav class="primary-nav" aria-label="${escapeHtml(t.header.navLabel)}">`,
    '<ul>',
    `<li><a href="#products">${escapeHtml(t.header.nav.products)}</a></li>`,
    `<li><a href="#process">${escapeHtml(t.header.nav.process)}</a></li>`,
    `<li><a href="#pricing">${escapeHtml(t.header.nav.pricing)}</a></li>`,
    `<li><a href="#status">${escapeHtml(t.header.nav.status)}</a></li>`,
    '</ul>',
    '</nav>',
    `<nav class="lang-switch" aria-label="${escapeHtml(t.header.langLabel)}">`,
    `<a href="${locale.switch.path}" lang="${locale.switch.lang}" hreflang="${locale.switch.lang}">${escapeHtml(locale.switch.text)}</a>`,
    '</nav>',
    '</div>',
    '</header>',
  ].join('\n');
}

function renderHero(locale) {
  const t = locale.hero;
  return [
    '<section class="hero" aria-labelledby="hero-title">',
    '<div class="container hero-grid">',
    '<div class="hero-copy">',
    `<p class="status-pill">${escapeHtml(t.status)}</p>`,
    `<h1 id="hero-title">${escapeHtml(t.h1)}</h1>`,
    `<p class="lead">${escapeHtml(t.lead)}</p>`,
    '<div class="actions">',
    `<a class="button" href="#status">${escapeHtml(t.ctaStatus)}</a>`,
    `<a class="button button-secondary" href="#pricing">${escapeHtml(t.ctaPricing)}</a>`,
    '</div>',
    '</div>',
    '<svg class="hero-mark" viewBox="0 0 360 200" aria-hidden="true" focusable="false">',
    '<path class="track" d="M30 150 C 110 150, 120 60, 190 100 S 290 150, 330 50"/>',
    '<circle class="node" cx="30" cy="150" r="14"/>',
    '<circle class="node-hollow" cx="190" cy="100" r="14"/>',
    '<circle class="node-ink" cx="330" cy="50" r="14"/>',
    '</svg>',
    '</div>',
    '</section>',
  ].join('\n');
}

function renderProblem(locale) {
  const t = locale.problem;
  const items = t.items.map((item) => `<li class="card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></li>`);
  return [
    '<section id="problem" class="section" aria-labelledby="problem-title">',
    '<div class="container">',
    `<h2 id="problem-title">${escapeHtml(t.h2)}</h2>`,
    `<ul class="cards cards-3">${items.join('')}</ul>`,
    '</div>',
    '</section>',
  ].join('\n');
}

function renderProducts(locale) {
  const t = locale.products;
  const items = t.items.map(
    (item) =>
      `<li class="card"><p class="eyebrow">${escapeHtml(item.audience)}</p><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.text)}</p></li>`,
  );
  return [
    '<section id="products" class="section" aria-labelledby="products-title">',
    '<div class="container">',
    `<h2 id="products-title">${escapeHtml(t.h2)}</h2>`,
    `<p class="section-lead">${escapeHtml(t.lead)}</p>`,
    `<ul class="cards cards-3">${items.join('')}</ul>`,
    `<p class="note"><strong>${escapeHtml(t.outOfScope.label)}:</strong> ${escapeHtml(t.outOfScope.text)}</p>`,
    '</div>',
    '</section>',
  ].join('\n');
}

function renderProcess(locale) {
  const t = locale.process;
  const steps = t.steps.map(
    (step, index) =>
      `<li class="step"><span class="step-no" aria-hidden="true">${index + 1}</span><div><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text)}</p></div></li>`,
  );
  return [
    '<section id="process" class="section" aria-labelledby="process-title">',
    '<div class="container">',
    `<h2 id="process-title">${escapeHtml(t.h2)}</h2>`,
    `<p class="section-lead">${escapeHtml(t.lead)}</p>`,
    `<ol class="steps">${steps.join('')}</ol>`,
    '</div>',
    '</section>',
  ].join('\n');
}

function renderPricing(locale) {
  const t = locale.pricing;
  const cards = t.cards.map(
    (card) =>
      [
        '<li class="price-card">',
        `<p class="tag">${escapeHtml(card.tag)}</p>`,
        `<h3>${escapeHtml(card.name)}</h3>`,
        `<p class="price"><span class="amount">${escapeHtml(card.price)}</span> <span class="unit">${escapeHtml(card.unit)}</span></p>`,
        `<p class="scope">${escapeHtml(card.scope)}</p>`,
        '</li>',
      ].join(''),
  );
  return [
    '<section id="pricing" class="section" aria-labelledby="pricing-title">',
    '<div class="container">',
    `<h2 id="pricing-title">${escapeHtml(t.h2)}</h2>`,
    `<p class="section-lead">${escapeHtml(t.lead)}</p>`,
    `<ul class="price-grid">${cards.join('')}</ul>`,
    `<p class="note">${escapeHtml(t.note)}</p>`,
    '</div>',
    '</section>',
  ].join('\n');
}

function renderPrinciples(locale) {
  const t = locale.principles;
  const items = t.items.map((item) => `<li class="card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></li>`);
  return [
    '<section id="principles" class="section" aria-labelledby="principles-title">',
    '<div class="container">',
    `<h2 id="principles-title">${escapeHtml(t.h2)}</h2>`,
    `<ul class="cards">${items.join('')}</ul>`,
    '</div>',
    '</section>',
  ].join('\n');
}

function renderStatus(locale) {
  const t = locale.status;
  const groups = ['has', 'testing', 'planned'].map((key) => {
    const group = t.groups[key];
    const headingId = `status-${key}`;
    const items = group.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    return [
      `<section class="status-col" aria-labelledby="${headingId}">`,
      `<h3 id="${headingId}">${escapeHtml(group.label)}</h3>`,
      `<p class="sub">${escapeHtml(group.sub)}</p>`,
      `<ul>${items}</ul>`,
      '</section>',
    ].join('');
  });
  return [
    '<section id="status" class="section" aria-labelledby="status-title">',
    '<div class="container">',
    `<h2 id="status-title">${escapeHtml(t.h2)}</h2>`,
    `<p class="section-lead">${escapeHtml(t.lead)}</p>`,
    `<div class="status-grid">${groups.join('')}</div>`,
    `<p class="closing">${escapeHtml(t.closing)}</p>`,
    '</div>',
    '</section>',
  ].join('\n');
}

function renderFooter(locale) {
  const t = locale.footer;
  return [
    '<footer class="site-footer">',
    '<div class="container">',
    `<p>${escapeHtml(t.workingName)}</p>`,
    `<p>${escapeHtml(t.contact)}</p>`,
    `<p>${escapeHtml(t.legal)}</p>`,
    `<p>${escapeHtml(t.updatedLabel)} <time datetime="${SITE.lastReviewed}">${escapeHtml(formatDate(SITE.lastReviewed, locale.dateLocale))}</time></p>`,
    `<p>${escapeHtml(t.copyright)}</p>`,
    '</div>',
    '</footer>',
  ].join('\n');
}

export function renderLocalePage(locale, env) {
  return [
    renderHead(locale, env),
    '<body>',
    renderHeader(locale),
    '<main id="main" tabindex="-1">',
    renderHero(locale),
    renderProblem(locale),
    renderProducts(locale),
    renderProcess(locale),
    renderPricing(locale),
    renderPrinciples(locale),
    renderStatus(locale),
    '</main>',
    renderFooter(locale),
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

export function renderNotFound(content) {
  const vi = content.vi.notFound;
  const en = content.en.notFound;
  return [
    '<!doctype html>',
    '<html lang="vi">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(vi.title)}</title>`,
    '<meta name="robots" content="noindex,nofollow">',
    '<meta name="color-scheme" content="light dark">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="stylesheet" href="/styles.css">',
    '</head>',
    '<body>',
    '<main id="main" class="container not-found">',
    `<h1>${escapeHtml(vi.h1)}</h1>`,
    `<p>${escapeHtml(vi.text)}</p>`,
    `<p><a href="/">${escapeHtml(vi.back)}</a></p>`,
    `<p lang="en">${escapeHtml(en.text)}</p>`,
    `<p lang="en"><a href="/en/" hreflang="en">${escapeHtml(en.back)}</a></p>`,
    '</main>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

export function renderRobots(env) {
  if (env === 'production') {
    return `User-agent: *\nAllow: /\n\nSitemap: ${SITE.origin}/sitemap.xml\n`;
  }
  return 'User-agent: *\nDisallow: /\n';
}

export function renderSitemap(content) {
  const alternates = [
    `    <xhtml:link rel="alternate" hreflang="vi" href="${SITE.origin}/"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${SITE.origin}/en/"/>`,
  ].join('\n');
  const entries = [content.vi.path, content.en.path].map(
    (path) => `  <url>\n    <loc>${SITE.origin}${path}</loc>\n    <lastmod>${SITE.lastReviewed}</lastmod>\n${alternates}\n  </url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}
