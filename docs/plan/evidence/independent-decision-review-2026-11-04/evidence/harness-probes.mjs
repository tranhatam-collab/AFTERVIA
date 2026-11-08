import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const auditRoot = dirname(fileURLToPath(import.meta.url));
const sourceRoot = join(auditRoot, 'head-6bf240d');
const source = readFileSync(join(sourceRoot, 'tools/e2e/web-e2e.mjs'), 'utf8');
const results = [];
const summarize = source.slice(source.indexOf('    summary.ok = '), source.indexOf('  } finally {', source.indexOf('    summary.ok = ')));
if (!summarize.includes('if (!summary.ok) throw')) throw new Error('source gate boundary changed');

for (const [id, summary, expectedThrow] of [
  ['GATE-clean', { pageErrors: [], consoleErrors: [] }, false],
  ['GATE-page-error', { pageErrors: ['synthetic page error'], consoleErrors: [] }, true],
  ['GATE-console-error', { pageErrors: [], consoleErrors: ['synthetic console.error'] }, true],
]) {
  let threw = false;
  try { vm.runInNewContext(summarize, { summary }); } catch { threw = true; }
  results.push({ id, expectedThrow, actualThrow: threw, matched: threw === expectedThrow, summary, method: 'execute exact final-gate source excerpt in VM; no browser/DB' });
}

const apiFunction = source.slice(source.indexOf('async function apiJson('), source.indexOf('\nasync function signIn('));
if (!apiFunction.includes('if (!response.ok) throw')) throw new Error('API source boundary changed');
let apiThrew = false;
try {
  await vm.runInNewContext(`const API = 'https://synthetic.invalid'; ${apiFunction}; apiJson('POST', '/probe', null, {});`, {
    fetch: async () => ({ ok: false, status: 500, text: async () => '{"error":"synthetic"}' }),
  });
} catch { apiThrew = true; }
results.push({ id: 'GATE-api-500', expectedThrow: true, actualThrow: apiThrew, matched: apiThrew, method: 'execute actual apiJson function with local fetch stub; no network' });

const caseGate = source.slice(source.indexOf("    if (caseRow.status !== 'closed'"), source.indexOf("    log(`cơ sở dữ liệu:", source.indexOf("    if (caseRow.status !== 'closed'")));
if (!caseGate.includes('caseRow.outcome')) throw new Error('case gate boundary changed');
for (const [id, caseRow, expectedThrow] of [
  ['GATE-case-wrong-status', { status: 'submitted', outcome: 'repaired', version: 6 }, true],
  ['GATE-case-wrong-version', { status: 'closed', outcome: 'repaired', version: 99 }, true],
]) {
  let threw = false;
  try { vm.runInNewContext(caseGate, { caseRow }); } catch { threw = true; }
  results.push({ id, expectedThrow, actualThrow: threw, matched: threw === expectedThrow, method: 'execute exact final case assertion; version=6 is the declared fixture expectation, not a production invariant' });
}

const out = { scope: 'SOURCE_LOGIC_PROBES_ONLY; not a browser E2E replay or product benchmark', cases: results.length, results };
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
