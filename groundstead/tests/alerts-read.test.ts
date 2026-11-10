import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSnapshot, statusesAt } from '../lib/alerts/snapshot.ts';

// G-09: a snapshot keeps each source's state as it was when the job ran. A reader decides the state again, from the last
// good update and the time of reading, so an old "ok" does not look current.

test('G-09 an ok source read 45 minutes later is stale, not ok', () => {
  const built = buildSnapshot(
    [{ source: 'usgs', ok: true, fetchedAt: '2026-11-06T10:00:00.000Z', alerts: [] }],
    new Date('2026-11-06T10:00:00.000Z'),
    null,
  );
  assert.equal(built.sources[0]?.state, 'ok');
  assert.equal(statusesAt(built, new Date('2026-11-06T10:45:00.000Z'))[0]?.state, 'stale');
});

test('G-09 an ok source read soon after is still ok', () => {
  const built = buildSnapshot(
    [{ source: 'usgs', ok: true, fetchedAt: '2026-11-06T10:00:00.000Z', alerts: [] }],
    new Date('2026-11-06T10:00:00.000Z'),
    null,
  );
  assert.equal(statusesAt(built, new Date('2026-11-06T10:10:00.000Z'))[0]?.state, 'ok');
});

test('G-09 reading keeps the last good time and never moves it forward', () => {
  const built = buildSnapshot(
    [{ source: 'usgs', ok: true, fetchedAt: '2026-11-06T10:00:00.000Z', alerts: [] }],
    new Date('2026-11-06T10:00:00.000Z'),
    null,
  );
  assert.equal(statusesAt(built, new Date('2026-11-06T10:45:00.000Z'))[0]?.lastUpdated, '2026-11-06T10:00:00.000Z');
});

test('G-09 a source whose last run failed stays failed when read later', () => {
  const built = buildSnapshot(
    [{ source: 'gdacs', ok: false, fetchedAt: null, alerts: [] }],
    new Date('2026-11-06T10:00:00.000Z'),
    null,
  );
  assert.equal(statusesAt(built, new Date('2026-11-06T12:00:00.000Z'))[0]?.state, 'failed');
});
