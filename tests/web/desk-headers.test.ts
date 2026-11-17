import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// OWN-A-15 (audit 10/11, A-11). The landing has a strict _headers file and a test for it; the Desk had none,
// so a hosted Desk would answer without CSP, frame protection or a referrer policy. The Desk is a Vite SPA:
// its build emits one external module script and one external stylesheet, and no inline script, so
// script-src 'self' is enough. It calls the API on the same origin, so connect-src 'self' is needed.
const SOURCE = fileURLToPath(new URL('../../apps/web/public/_headers', import.meta.url));
const BUILT = fileURLToPath(new URL('../../apps/web/dist/_headers', import.meta.url));
const INDEX = fileURLToPath(new URL('../../apps/web/dist/index.html', import.meta.url));

describe('OWN-A-15 the Desk ships security headers', () => {
  it('A-11 the CSP names every directive the Desk needs and nothing looser', () => {
    const headers = readFileSync(SOURCE, 'utf8');
    const csp = headers.split('\n').find((line) => line.trim().startsWith('Content-Security-Policy:')) ?? '';
    for (const directive of [
      "default-src 'none'",
      "script-src 'self'",
      "style-src 'self'",
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ]) {
      expect(csp).toContain(directive);
    }
    // No unsafe-inline, no unsafe-eval, no wildcard source.
    expect(csp).not.toMatch(/unsafe-/);
    expect(csp).not.toMatch(/\*/);
  });

  it('A-11 the other hardening headers are present, and HSTS does not reach other subdomains', () => {
    const headers = readFileSync(SOURCE, 'utf8');
    expect(headers).toMatch(/X-Content-Type-Options:\s*nosniff/);
    expect(headers).toMatch(/X-Frame-Options:\s*DENY/);
    expect(headers).toMatch(/Referrer-Policy:\s*strict-origin-when-cross-origin/);
    expect(headers).toMatch(/Permissions-Policy:/);
    expect(headers).toMatch(/Cross-Origin-Opener-Policy:\s*same-origin/);
    expect(headers).toMatch(/Strict-Transport-Security:\s*max-age=\d+/);
    expect(headers).not.toMatch(/includeSubDomains/);
  });

  it('A-11 the build carries the file through, and the page it serves needs no inline script', () => {
    // `npm run build:web` runs before the tests in `npm run verify`, so dist is there in a full run.
    if (!existsSync(BUILT)) return;
    expect(readFileSync(BUILT, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
    const html = readFileSync(INDEX, 'utf8');
    // Every script tag in the built page must load from a file, or script-src 'self' would break the app.
    for (const tag of html.match(/<script[^>]*>/g) ?? []) {
      expect(tag).toMatch(/\ssrc=/);
    }
  });
});
