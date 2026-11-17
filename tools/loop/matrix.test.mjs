import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLUMNS, applyReport, parseCsv, stringifyCsv, statusesFromReport, toRecords, fromRecords } from './matrix.mjs';

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
          { title: 'T04 cross-tenant read is denied', status: 'passed' },
          { title: 'T04 second path', status: 'failed' },
          { title: 'T05 org isolation holds', status: 'passed' },
          { title: 'helper without an id', status: 'passed' },
          { title: 'T06 role escalation is refused', status: 'skipped' },
        ],
      },
    ],
  };
  const map = statusesFromReport(report);
  assert.equal(map.get('T04'), 'FAIL');
  assert.equal(map.get('T05'), 'PASS');
  // A skipped test is not evidence: the latest run reports NOT_RUN, which overwrites any older PASS.
  assert.equal(map.get('T06'), 'NOT_RUN');
});

test('applyReport updates derived statuses and never overwrites manual results', () => {
  const records = toRecords('test_id,domain,severity,title,automation_class,coverage,mapped_tasks,test_status,last_run,note\n' +
    'T04,Auth,CRITICAL,"Khách A đọc item B",AUTO,PARTIAL,WO04-03,NOT_RUN,,\n' +
    'T34,Mobile,HIGH,"Release build iOS",DEVICE,NONE,DEV-01,MANUAL_PENDING,,\n');
  const report = { testResults: [{ assertionResults: [{ title: 'T04 denied', status: 'passed' }, { title: 'T34 fake', status: 'passed' }] }] };
  const changes = applyReport(records, report, '2026-10-31');
  assert.deepEqual(changes, ['T04: NOT_RUN -> PASS']);
  assert.equal(records[0].test_status, 'PASS');
  assert.equal(records[0].last_run, '2026-10-31');
  assert.equal(records[1].test_status, 'MANUAL_PENDING');
  assert.match(fromRecords(records), /Khách A đọc item B/);
});

// Cột `evidence` được thêm vào CSV sau khi matrix.mjs được viết. Trước bản sửa này, from-report ghi lại
// bảng chỉ với COLUMNS, nên cột đó biến mất khỏi cả 46 dòng mà không có lời báo nào.
test('fromRecords keeps a column the tool does not know about', () => {
  const text = `${COLUMNS.join(',')},evidence\nT99,G0,HIGH,Thử,AUTO,PARTIAL,WO99,NOT_RUN,,ghi chú,docs/plan/evidence/WO99.md\n`;
  const records = toRecords(text);
  assert.equal(records[0].evidence, 'docs/plan/evidence/WO99.md');
  const written = fromRecords(records);
  assert.match(written.split('\n')[0], /,evidence$/);
  assert.match(written, /docs\/plan\/evidence\/WO99\.md/);
  // Vòng đi vòng về không làm mất gì.
  assert.deepEqual(toRecords(written), records);
});

test('applyReport then fromRecords still carries the evidence column', () => {
  const text = `${COLUMNS.join(',')},evidence\nT27,Billing,CRITICAL,Webhook giả,AUTO,PARTIAL,WO12-01,NOT_RUN,,,docs/plan/evidence/WO12-01.md\n`;
  const records = toRecords(text);
  const report = { testResults: [{ assertionResults: [{ title: 'T27 a forged webhook is refused', status: 'passed' }] }] };
  applyReport(records, report, '2026-11-10');
  const written = fromRecords(records);
  assert.match(written, /T27,Billing,CRITICAL,Webhook giả,AUTO,PARTIAL,WO12-01,PASS,2026-11-10,,docs\/plan\/evidence\/WO12-01\.md/);
});
