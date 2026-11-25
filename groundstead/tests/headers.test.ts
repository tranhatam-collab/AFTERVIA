import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, elements, readOut } from './helpers.ts';

// G-23 (OWN-G-05): the static site sends its security headers from groundstead/vercel.json, the hosting config
// of the Vercel project (rootDirectory groundstead). `next export` ignores headers() in next.config, and
// frame-ancestors only works as an HTTP header, not as a meta tag. Each directive is asserted here, so changing
// the policy is a deliberate edit to this file.

const CONFIG = join(ROOT, 'vercel.json');

// The exact policy. script-src and style-src allow 'unsafe-inline' because the static export has no nonces:
// Next puts inline bootstrap scripts on every page, and its built-in 404 page has an inline <style> and style
// attributes. Nothing else is widened. No eval, no wildcard, no broad scheme source.
const CSP: Record<string, string> = {
  'default-src': "'none'",
  'script-src': "'self' 'unsafe-inline'",
  'style-src': "'self' 'unsafe-inline'",
  'connect-src': "'self'",
  'img-src': "'self'",
  'worker-src': "'self'",
  'base-uri': "'none'",
  'form-action': "'none'",
  'object-src': "'none'",
  'frame-ancestors': "'none'",
};

type Rule = { source: string; headers: { key: string; value: string }[] };

function everyPathHeaders(): Map<string, string> {
  assert.ok(existsSync(CONFIG), 'groundstead/vercel.json exists: without it the site sends no security headers');
  const config = JSON.parse(readFileSync(CONFIG, 'utf8')) as { headers?: Rule[] };
  const rules = (config.headers ?? []).filter((rule) => rule.source === '/(.*)');
  assert.equal(rules.length, 1, 'exactly one header rule covers every path, source "/(.*)"');
  const rule = rules[0] as Rule;
  const headers = new Map<string, string>();
  for (const { key, value } of rule.headers) {
    const name = key.toLowerCase();
    assert.ok(!headers.has(name), `${key} is set once for every path`);
    headers.set(name, value);
  }
  return headers;
}

function parseCsp(policy: string): Record<string, string> {
  const directives: Record<string, string> = {};
  for (const part of policy.split(';').map((p) => p.trim()).filter(Boolean)) {
    const [name = '', ...sources] = part.split(/\s+/);
    assert.ok(!Object.hasOwn(directives, name), `${name} appears once: a browser ignores a repeated directive`);
    directives[name] = sources.join(' ');
  }
  return directives;
}

test('G-23 vercel.json sets Content-Security-Policy and Referrer-Policy on every path', () => {
  const headers = everyPathHeaders();
  assert.ok(headers.has('content-security-policy'), 'Content-Security-Policy is set');
  assert.ok(headers.has('referrer-policy'), 'Referrer-Policy is set');
});

test('G-23 each CSP directive matches the policy exactly, frame-ancestors included', () => {
  const csp = parseCsp(everyPathHeaders().get('content-security-policy') ?? '');
  assert.deepEqual(csp, CSP);
  assert.equal(csp['frame-ancestors'], "'none'", 'the site cannot be framed by any origin');
});

test('G-23 the policy has no eval, wildcard, or broad scheme source', () => {
  const policy = everyPathHeaders().get('content-security-policy') ?? '';
  const tokens = policy.split(/[\s;]+/);
  for (const banned of ["'unsafe-eval'", "'unsafe-hashes'", '*', 'http:', 'https:', 'data:', 'blob:', 'filesystem:']) {
    assert.ok(!tokens.includes(banned), `${banned} is not allowed`);
  }
});

test('G-23 unsafe-inline appears only in script-src and style-src, the two directives the static export needs', () => {
  const csp = parseCsp(everyPathHeaders().get('content-security-policy') ?? '');
  const widened = Object.keys(csp).filter((name) => (csp[name] ?? '').includes("'unsafe-inline'"));
  assert.deepEqual(widened.sort(), ['script-src', 'style-src']);
});

test('G-23 Referrer-Policy is strict-origin-when-cross-origin, the same choice as the other static sites in this repo', () => {
  assert.equal(everyPathHeaders().get('referrer-policy'), 'strict-origin-when-cross-origin');
});

test('G-23 built pages carry no CSP meta tag, so frame-ancestors is read only from the HTTP header', () => {
  for (const rel of ['index.html', 'en/index.html', 'vi/index.html', 'en/readiness/index.html']) {
    const policies = elements(readOut(rel), 'meta').filter(
      (meta) => (meta['http-equiv'] ?? '').toLowerCase() === 'content-security-policy',
    );
    assert.deepEqual(policies, [], `${rel} has no http-equiv Content-Security-Policy meta tag`);
  }
});
