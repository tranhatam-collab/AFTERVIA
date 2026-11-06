#!/usr/bin/env node
// Acceptance matrix (docs/plan/02_ACCEPTANCE.csv) is updated ONLY from a real test run.
// A test title that starts with a GT-id (for example "GT13 test alerts are never shown as public") is the evidence.
// PASS requires at least one passed test and no failed test for that id. Manual results are never overwritten here.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const COLUMNS = [
  'test_id', 'domain', 'severity', 'title', 'automation_class', 'coverage', 'mapped_tasks', 'test_status', 'last_run', 'note',
];
const MANUAL_PREFIX = 'MANUAL_';

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function stringifyCsv(rows) {
  const esc = (v) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return `${rows.map((r) => r.map((v) => esc(String(v ?? ''))).join(',')).join('\n')}\n`;
}

export function toRecords(text) {
  const [header, ...body] = parseCsv(text);
  return body.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])));
}

export function fromRecords(records) {
  return stringifyCsv([COLUMNS, ...records.map((r) => COLUMNS.map((c) => r[c] ?? ''))]);
}

// Reads a Vitest (or Playwright JSON converted to the same shape) report and returns the derived status per GT-id.
export function statusesFromReport(report) {
  const seen = new Map();
  for (const file of report.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      const match = /^(GT\d{2})\b/.exec(assertion.title ?? '');
      if (!match) continue;
      const entry = seen.get(match[1]) ?? { passed: 0, failed: 0 };
      if (assertion.status === 'passed') entry.passed += 1;
      if (assertion.status === 'failed') entry.failed += 1;
      seen.set(match[1], entry);
    }
  }
  const out = new Map();
  for (const [id, { passed, failed }] of seen) {
    out.set(id, failed > 0 ? 'FAIL' : passed > 0 ? 'PASS' : 'NOT_RUN');
  }
  return out;
}

export function applyReport(records, report, now = new Date().toISOString().slice(0, 10)) {
  const derived = statusesFromReport(report);
  const changes = [];
  for (const record of records) {
    if (record.test_status.startsWith(MANUAL_PREFIX)) continue;
    const next = derived.get(record.test_id);
    if (!next) continue;
    if (record.test_status !== next) changes.push(`${record.test_id}: ${record.test_status} -> ${next}`);
    record.test_status = next;
    record.last_run = now;
  }
  return changes;
}

function summarize(records) {
  const byStatus = {};
  const byCoverage = {};
  for (const r of records) {
    byStatus[r.test_status] = (byStatus[r.test_status] ?? 0) + 1;
    byCoverage[r.coverage] = (byCoverage[r.coverage] ?? 0) + 1;
  }
  return { total: records.length, byStatus, byCoverage };
}

function main(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const path = resolve(root, 'docs/plan/02_ACCEPTANCE.csv');
  const records = toRecords(readFileSync(path, 'utf8'));
  const [command, arg] = argv;
  if (command === 'from-report') {
    const report = JSON.parse(readFileSync(resolve(arg), 'utf8'));
    const changes = applyReport(records, report);
    writeFileSync(path, fromRecords(records), 'utf8');
    console.log(JSON.stringify({ changes, summary: summarize(records) }, null, 2));
    return;
  }
  if (command === 'summary') {
    console.log(JSON.stringify(summarize(records), null, 2));
    return;
  }
  console.error('usage: matrix.mjs <from-report <vitest-json>|summary>');
  process.exit(2);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
