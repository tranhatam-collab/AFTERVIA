import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, type Alert } from '../lib/alerts/model.ts';
import { inForce, isPublic, publicAlerts } from '../lib/alerts/filter.ts';
import { sourceState } from '../lib/alerts/sources.ts';
import { alertFacts, coverageNote, lastUpdatedLine } from '../lib/alerts/render.ts';
import { fromGdacsRss, fromUsgs, toIso } from '../lib/alerts/transform.ts';
import { GDACS_SAMPLE } from './alerts-fixtures.ts';

const RECEIVED = '2026-11-06T10:01:00.000Z';

const base: Alert = {
  source: 'usgs',
  id: 'a1',
  sender: 'USGS',
  status: 'Actual',
  msgType: 'Alert',
  scope: 'Public',
  kind: 'observation',
  headline: 'M 4.8 - test',
  hazard: 'earthquake',
  sent: '2026-11-06T10:00:00.000Z',
  received: RECEIVED,
  effective: '2026-11-06T09:55:00.000Z',
  references: [],
};

test('GT13 test, exercise, draft, system, private, restricted, cancel, ack and error messages are not shown as public alerts', () => {
  const notPublic: Partial<Alert>[] = [
    { status: 'Test' },
    { status: 'Exercise' },
    { status: 'Draft' },
    { status: 'System' },
    { scope: 'Private' },
    { scope: 'Restricted' },
    { msgType: 'Cancel' },
    { msgType: 'Ack' },
    { msgType: 'Error' },
  ];
  for (const change of notPublic) {
    const alert: Alert = { ...base, ...change };
    assert.equal(isPublic(alert), false, JSON.stringify(change));
    assert.deepEqual(publicAlerts([alert]), [], JSON.stringify(change));
  }
  assert.deepEqual(publicAlerts([base]), [base]);
});

test('GT13 a later Cancel or Update names the alert it ends, and a Cancel is never listed itself', () => {
  const cancel: Alert = { ...base, id: 'a2', msgType: 'Cancel', references: ['usgs:a1'] };
  assert.deepEqual(publicAlerts([base, cancel]), []);
  assert.deepEqual(inForce([base, cancel]), []);
  const update: Alert = { ...base, id: 'a3', msgType: 'Update', references: ['usgs:a1'] };
  assert.deepEqual(
    publicAlerts([base, update]).map((a) => a.id),
    ['a3'],
  );
});

test('GT14 a failed, stale or never-updated source is never read as no alerts, so safe; its last update time is shown', () => {
  const now = new Date('2026-11-06T12:00:00.000Z');
  const last = '2026-11-06T11:55:00.000Z';
  assert.equal(sourceState({ lastUpdated: last, failed: false }, now), 'ok');
  assert.equal(sourceState({ lastUpdated: '2026-11-06T11:00:00.000Z', failed: false }, now), 'stale');
  assert.equal(sourceState({ lastUpdated: '2026-11-06T11:59:00.000Z', failed: true }, now), 'failed');
  assert.equal(sourceState({ lastUpdated: null, failed: false }, now), 'never');
  assert.equal(sourceState({ lastUpdated: 'not a time', failed: false }, now), 'never');
  assert.equal(
    sourceState({ lastUpdated: '2026-11-06T13:00:00.000Z', failed: false }, now),
    'stale',
    'a time in the future is not trusted',
  );
  for (const locale of ['en', 'vi'] as const) {
    for (const state of ['ok', 'stale', 'failed', 'never'] as const) {
      const note = coverageNote(state, last, locale);
      if (state === 'ok' || state === 'stale') assert.ok(note.includes(last), `${locale} ${state} shows the time`);
      // Only the "no alert in force" note mentions safety, and only to deny it.
      if (locale === 'en') assert.equal(/\bsafe\b/i.test(note), state === 'ok', `${state} mentions safety only to deny it`);
      if (locale === 'vi' && state !== 'ok') assert.equal(note.includes('an toàn'), false, `${state} never says safe`);
    }
  }
  assert.match(coverageNote('ok', last, 'en'), /not a statement that the area is safe/);
  assert.match(coverageNote('ok', last, 'vi'), /không có nghĩa là khu vực an toàn/);
  assert.match(lastUpdatedLine(last, 'en'), /2026-11-06T11:55:00\.000Z/);
  assert.equal(lastUpdatedLine(null, 'vi'), 'Chưa có cập nhật nào từ nguồn này.');
});

test('GT14 a feed of the wrong shape, or a record with missing fields, gives no alerts and no error', () => {
  assert.deepEqual(fromUsgs('not a feed', RECEIVED), []);
  assert.deepEqual(fromUsgs({ features: 'x' }, RECEIVED), []);
  assert.deepEqual(fromGdacsRss('not xml', RECEIVED), []);
  assert.deepEqual(fromUsgs({ features: [{ id: 'x', properties: { title: 'no times' } }] }, RECEIVED), []);
});

test('GT15 every public alert shows the agency, sent, received and effective times, and its type, in both languages', () => {
  const en = alertFacts({ ...base, kind: 'forecast' }, 'en');
  assert.deepEqual(
    en.map((f) => f.label),
    ['Issued by', 'Sent', 'Received', 'Effective from', 'Type'],
  );
  assert.deepEqual(en.map((f) => f.value), ['USGS', base.sent, RECEIVED, base.effective, 'Forecast']);
  const vi = alertFacts({ ...base, kind: 'order' }, 'vi');
  assert.deepEqual(
    vi.map((f) => f.label),
    ['Cơ quan phát', 'Giờ phát', 'Giờ nhận', 'Hiệu lực từ', 'Loại'],
  );
  assert.equal(vi[4]?.value, 'Lệnh');
  for (const kind of KINDS) assert.ok(alertFacts({ ...base, kind }, 'vi')[4]?.value, kind);
});

test('GT15 the USGS and GDACS samples become alerts that name their agency; an event no longer current is not shown', () => {
  assert.equal(toIso('2026-11-06T06:00:00'), '2026-11-06T06:00:00.000Z');
  assert.equal(toIso('2026-11-06T13:00:00+07:00'), '2026-11-06T06:00:00.000Z');
  assert.equal(toIso('Fri, 06 Nov 2026 06:00:00 GMT'), '2026-11-06T06:00:00.000Z', 'RSS dates carry GMT');
  const usgs = fromUsgs(
    {
      features: [
        {
          id: 'us7000abcd',
          properties: {
            title: 'M 4.8 - 10 km SSW of Example',
            time: Date.parse('2026-11-06T09:00:00Z'),
            updated: Date.parse('2026-11-06T09:20:00Z'),
          },
        },
      ],
    },
    RECEIVED,
  );
  assert.equal(usgs.length, 1);
  assert.equal(usgs[0]?.sender, 'USGS');
  assert.equal(usgs[0]?.kind, 'observation');
  assert.equal(usgs[0]?.sent, '2026-11-06T09:20:00.000Z');
  assert.equal(usgs[0]?.effective, '2026-11-06T09:00:00.000Z');
  const gdacs = fromGdacsRss(GDACS_SAMPLE, RECEIVED);
  assert.equal(gdacs.length, 3, 'the record without an id is skipped; the other three are translated');
  assert.deepEqual(
    publicAlerts(gdacs).map((a) => [a.id, a.sender, a.hazard, a.effective]),
    [['FL1001', 'GDACS', 'flood', '2026-11-06T06:00:00.000Z']],
  );
});

test('GT13 a GDACS item without gdacs:iscurrent is not read as a Cancel; only an explicit "false" ends it (GSL-F05)', () => {
  const noFlag = GDACS_SAMPLE.replace('<gdacs:iscurrent>true</gdacs:iscurrent>\n<gdacs:eventtype>FL', '<gdacs:eventtype>FL');
  assert.notEqual(noFlag, GDACS_SAMPLE, 'the fixture lost its flag');
  const flood = fromGdacsRss(noFlag, RECEIVED).find((a) => a.id === 'FL1001');
  assert.equal(flood?.msgType, 'Alert');
  assert.deepEqual(flood?.references, []);
  assert.deepEqual(publicAlerts(fromGdacsRss(noFlag, RECEIVED)).map((a) => a.id), ['FL1001']);
  const old = fromGdacsRss(GDACS_SAMPLE, RECEIVED).find((a) => a.id === 'EQ77');
  assert.equal(old?.msgType, 'Cancel', 'an explicit false still ends the event');
});
