// G-23 browser check on the built site (out/). The server applies the header rules in groundstead/vercel.json to
// every response, the way Vercel does, so each page is loaded with the policy it will get in production. A page
// passes only when it carries the headers and logs no Content-Security-Policy violation.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = resolve(ROOT, 'out');
const VERCEL_JSON = resolve(ROOT, 'vercel.json');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

// Header rules as Vercel reads them. A missing vercel.json means no headers, so the checks below fail.
function headerRules() {
  if (!existsSync(VERCEL_JSON)) return [];
  return JSON.parse(readFileSync(VERCEL_JSON, 'utf8')).headers ?? [];
}

// Turns a Vercel source such as "/(.*)" into a regular expression. Only the (.*) wildcard is special; every
// other character is literal, so an unsupported pattern matches nothing and the checks fail rather than pass.
function sourcePattern(source) {
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${source.split('(.*)').map(escape).join('.*')}$`);
}

function headersFor(path) {
  const headers = {};
  for (const rule of headerRules()) {
    if (!sourcePattern(rule.source).test(path)) continue;
    for (const { key, value } of rule.headers) headers[key.toLowerCase()] = value;
  }
  return headers;
}

function startServer() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    let file = resolve(OUT, `.${path}`);
    if (!file.startsWith(OUT)) {
      res.writeHead(403).end();
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      const type = TYPES[extname(file)] ?? 'application/octet-stream';
      res.writeHead(200, { 'content-type': type, ...headersFor(path) }).end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain', ...headersFor(path) }).end('not found');
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
}

// out/en/help/index.html is served at /en/help/; out/404.html is served at /404.html.
function routeOf(file) {
  const rel = relative(OUT, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

let server;
let browser;
let base;
let routes;

before(async () => {
  server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
  routes = (await htmlFiles(OUT)).map(routeOf).sort();
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
});

test('G-23 every built page is served the CSP, frame-ancestors and Referrer-Policy headers', async () => {
  const missing = [];
  for (const path of routes) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      const response = await page.goto(`${base}${path}`, { waitUntil: 'load' });
      const headers = response?.headers() ?? {};
      const csp = headers['content-security-policy'] ?? '';
      if (!csp.includes("frame-ancestors 'none'")) missing.push(`${path}: CSP without frame-ancestors 'none'`);
      if (!headers['referrer-policy']) missing.push(`${path}: Referrer-Policy missing`);
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(missing, [], 'every page carries the headers');
});

test('G-23 no Content-Security-Policy violation is logged on any built page, main pages and the 404 page alike', async () => {
  assert.ok(routes.includes('/en/') && routes.includes('/vi/'), 'the English and Vietnamese home pages are checked');
  assert.ok(routes.length >= 14, `the main pages are all checked, found ${routes.length} pages`);

  const violations = [];
  for (const path of routes) {
    const context = await browser.newContext();
    try {
      // The init script records every securitypolicyviolation event from the first byte of the document,
      // so violations raised while the page is still parsing are kept too.
      await context.addInitScript(() => {
        window.__cspViolations = [];
        document.addEventListener('securitypolicyviolation', (event) => {
          window.__cspViolations.push(`${event.violatedDirective} blocked ${event.blockedURI || 'inline'}`);
        });
      });
      const page = await context.newPage();
      page.on('console', (msg) => {
        if (/Content Security Policy|violates the following/i.test(msg.text())) violations.push(`${path}: ${msg.text()}`);
      });
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
      const recorded = (await page.evaluate(() => window.__cspViolations)) ?? [];
      for (const entry of recorded) violations.push(`${path}: ${entry}`);
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(violations, [], 'no page logs a CSP violation');
});
