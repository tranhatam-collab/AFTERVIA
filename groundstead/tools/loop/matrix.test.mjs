import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyReport, parseCsv, stringifyCsv, statusesFromReport, toRecords, fromRecords } from './matrix.mjs';

test('parseCsv handles BOM, quoted commas, escaped quotes and CRLF', () => {
  const text = '﻿a,b,c\r\n1,"x, y","say ""hi"""\r\n';
  assert.deepEqual(parseCsv(text), [
    ['a', 'b', 'c'],
    ['1', 'x, y', 'say "hi"'],
  ]);
});

test('stringifyCsv round-trips values that need quoting', () => {
  const rows = [['a', 'b'], ['x,y', 'q"r'], ['multi\nline', '']];
  assert.deepEqual(parseCsv(stringifyCsv(rows)), rows);
});

test('statuses come only from T-id test titles and FAIL wins over PASS', () => {
  const report = {
    testResults: [
      {
        assertionResults: [
          { title: 'GT04 cross-tenant read is denied', status: 'passed' },
          { title: 'GT04 second path', status: 'failed' },
          { title: 'GT05 org isolation holds', status: 'passed' },
          { title: 'helper without an id', status: 'passed' },
          { title: 'GT06 role escalation is refused', status: 'skipped' },
        ],
      },
    ],
  };
  const map = statusesFromReport(report);
  assert.equal(map.get('GT04'), 'FAIL');
  assert.equal(map.get('GT05'), 'PASS');
  // A skipped test is not evidence: the latest run reports NOT_RUN, which overwrites any older PASS.
  assert.equal(map.get('GT06'), 'NOT_RUN');
});

test('applyReport updates derived statuses and never overwrites manual results', () => {
  const records = toRecords('test_id,domain,severity,title,automation_class,coverage,mapped_tasks,test_status,last_run,note\n' +
    'GT04,Auth,CRITICAL,"Khách A đọc item B",AUTO,PARTIAL,WO04-03,NOT_RUN,,\n' +
    'GT34,Mobile,HIGH,"Release build iOS",DEVICE,NONE,DEV-01,MANUAL_PENDING,,\n');
  const report = { testResults: [{ assertionResults: [{ title: 'GT04 denied', status: 'passed' }, { title: 'GT34 fake', status: 'passed' }] }] };
  const changes = applyReport(records, report, '2026-10-31');
  assert.deepEqual(changes, ['GT04: NOT_RUN -> PASS']);
  assert.equal(records[0].test_status, 'PASS');
  assert.equal(records[0].last_run, '2026-10-31');
  assert.equal(records[1].test_status, 'MANUAL_PENDING');
  assert.match(fromRecords(records), /Khách A đọc item B/);
});
