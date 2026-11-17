import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanText } from '../../tools/checks/secret-scan.mjs';

const root = resolve(__dirname, '..', '..');

// Fixture values are assembled at runtime so this source file does not itself trip the scanner.
const awsLike = ['AKIA', 'IOSFODNN7EXAMPLE'].join('');
const pemHeader = ['-----BEGIN ', 'RSA PRIVATE KEY-----'].join('');

describe('T37 secret and log leak guard', () => {
  it('T37 the tracked repository contains no secret-like literal', () => {
    const out = execFileSync('node', ['tools/checks/secret-scan.mjs'], { cwd: root, encoding: 'utf8' });
    expect(out).toMatch(/secret scan OK/);
  });

  it('T37 flags a private key block, an AWS key id and an assigned secret literal', () => {
    const text = [`const k = "${pemHeader}"`, `const id = "${awsLike}"`, `SERVICE_ROLE_KEY = "${'a'.repeat(20)}"`].join('\n');
    const rules = scanText('fixture.ts', text).map((f) => f.rule).sort();
    expect(rules).toEqual(['assigned-secret-literal', 'aws-access-key-id', 'private-key-block']);
  });

  it('T37 reports rule names and locations but never the matched value', () => {
    const dir = mkdtempSync(join(tmpdir(), 'aftervia-scan-'));
    const file = join(dir, 'leak.env');
    const secret = 'x'.repeat(24);
    writeFileSync(file, `API_KEY="${secret}"\n`);
    let output = '';
    try {
      execFileSync('node', ['tools/checks/secret-scan.mjs', '--files', file], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      output = String((error as { stderr?: string }).stderr ?? '');
    }
    expect(output).toMatch(/assigned-secret-literal/);
    expect(output).not.toContain(secret);
  });

  it('T37 a NUL byte does not hide a private key block', () => {
    expect(scanText('fixture.bin', `\u0000${pemHeader}`).map((f) => f.rule)).toEqual(['private-key-block']);
  });

  it('T37 flags underscore-prefixed assigned secrets such as JWT_SECRET and DB_PASSWORD', () => {
    const text = [`JWT_SECRET = "${'b'.repeat(20)}"`, `DB_PASSWORD="${'c'.repeat(16)}"`].join('\n');
    expect(scanText('fixture.env', text).map((f) => f.rule)).toEqual(['assigned-secret-literal', 'assigned-secret-literal']);
  });

  it('T37 a longer identifier that only ends in a keyword is not an assigned secret', () => {
    expect(scanText('clean.ts', `const tokenizer = "${'d'.repeat(20)}"`)).toEqual([]);
  });

  it('T37 a clean fixture passes', () => {
    expect(scanText('clean.ts', 'const name = "AFTERVIA";\nconst count = 3;')).toEqual([]);
  });
});
