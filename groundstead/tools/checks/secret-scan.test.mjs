import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanText } from './secret-scan.mjs';

// Patterns are assembled at runtime so this file never contains a literal secret-shaped string.
const pemHeader = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
const stripeLike = ['sk', 'live', 'A'.repeat(24)].join('_');
const assigned = ['const api', 'Key = "', 'abcdefghijklmnop', '";'].join('');

test('GT01 secret scan flags a private key block and reports only file, line and rule', () => {
  const findings = scanText('x.txt', `ok\n${pemHeader}\n`);
  assert.deepEqual(findings, [{ file: 'x.txt', line: 2, rule: 'private-key-block' }]);
  assert.ok(!JSON.stringify(findings).includes('PRIVATE KEY-----'));
});

test('GT01 secret scan flags live payment keys and assigned secret literals', () => {
  const rules = scanText('c.ts', `const k = '${stripeLike}';\n${assigned}\n`).map((f) => f.rule);
  assert.ok(rules.includes('stripe-live-key'));
  assert.ok(rules.includes('assigned-secret-literal'));
});

test('GT01 secret scan accepts clean text and binary content', () => {
  assert.deepEqual(scanText('a.md', 'Đặt khóa qua biến môi trường, không ghi vào repo.\n'), []);
  assert.deepEqual(scanText('b.bin', `\u0000${pemHeader}`), []);
});
