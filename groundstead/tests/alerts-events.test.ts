import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Alert } from '../lib/alerts/model.ts';
import { groupEvents, markPushed, notYetPushed } from '../lib/alerts/dedupe.ts';
import { alertsNear, distanceKm, placeToStore, RADIUS_RANGE_KM, validRadius, type Place } from '../lib/alerts/location.ts';
import { fromGdacs, fromUsgs } from '../lib/alerts/transform.ts';

const RECEIVED = '2026-11-06T10:00:00.000Z';

function one(alerts: Alert[]): Alert {
  const [first] = alerts;
  if (!first) throw new Error('the fixture produced no alert');
  return first;
}

// Hanoi (the city), a quake reported by USGS near it, and the same quake reported by GDACS a little later.
const quakeUsgs = one(
  fromUsgs(
    {
      features: [
        {
          id: 'us1',
          geometry: { coordinates: [105.85, 21.03, 10] },
          properties: {
            title: 'M 4.8 - near Hanoi',
            time: Date.parse('2026-11-06T09:00:00Z'),
            updated: Date.parse('2026-11-06T09:10:00Z'),
          },
        },
      ],
    },
    RECEIVED,
  ),
);
const quakeGdacs = one(
  fromGdacs(
    {
      features: [
        {
          properties: {
            eventtype: 'EQ',
            eventid: 9,
            name: 'Green earthquake alert near Hanoi',
            fromdate: '2026-11-06T09:00:00',
            datemodified: '2026-11-06T09:40:00',
            iscurrent: 'true',
            lat: 21.1,
            lon: 105.9,
          },
        },
      ],
    },
    RECEIVED,
  ),
);
const floodHanoi: Alert = { ...quakeGdacs, id: 'FL7', hazard: 'flood', headline: 'Flood alert near Hanoi' };
const quakeHcmc: Alert = { ...quakeUsgs, id: 'us2', where: { lat: 10.82, lon: 106.63 } };
const quakeNoPlace: Alert = { ...quakeUsgs, id: 'us3', where: undefined };

const HANOI_CITY: Place = { id: 'city', name: 'Hanoi', lat: 21.03, lon: 105.85, radiusKm: 25 };
const HA_LONG_LAND: Place = { id: 'land', name: 'Ha Long', lat: 20.95, lon: 107.08, radiusKm: 5 };

test('GT16 the same quake reported by two sources is one event, shown with both sources and not repeated', () => {
  const events = groupEvents([quakeUsgs, quakeGdacs]);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0]?.sources, ['gdacs', 'usgs']);
  assert.equal(events[0]?.alerts.length, 2);
  assert.equal(events[0]?.hazard, 'earthquake');
});

test('GT16 a different hazard, a far place, or a missing place stays a separate event', () => {
  assert.equal(groupEvents([quakeUsgs, floodHanoi]).length, 2, 'different hazards');
  assert.equal(groupEvents([quakeUsgs, quakeHcmc]).length, 2, 'more than 100 km apart');
  assert.equal(groupEvents([quakeUsgs, quakeNoPlace]).length, 2, 'no place on one side');
});

test('GT16 each event is pushed once: a run that repeats a known event pushes nothing new', () => {
  const first = groupEvents([quakeUsgs]);
  const pushed = markPushed(new Set(), first);
  assert.equal(notYetPushed(groupEvents([quakeUsgs, quakeGdacs]), pushed).length, 0, 'the second source is the same event');
  const later = groupEvents([quakeUsgs, quakeGdacs, quakeHcmc]);
  const fresh = notYetPushed(later, pushed);
  assert.equal(fresh.length, 1, 'only the new event is pushed');
  assert.equal(fresh[0]?.alerts[0]?.id, 'us2');
});

test('GT17 the distance between two places is the great-circle distance, and radii outside 5 to 100 km are refused', () => {
  const hanoi = { lat: 21.03, lon: 105.85 };
  const hcmc = { lat: 10.82, lon: 106.63 };
  const km = distanceKm(hanoi, hcmc);
  assert.ok(km > 1100 && km < 1170, `Hanoi to Ho Chi Minh City is about 1,137 km, got ${km.toFixed(1)}`);
  assert.equal(distanceKm(hanoi, hanoi), 0);
  assert.equal(RADIUS_RANGE_KM.min, 5);
  assert.equal(RADIUS_RANGE_KM.max, 100);
  assert.equal(validRadius(4), null);
  assert.equal(validRadius(5), 5);
  assert.equal(validRadius(100), 100);
  assert.equal(validRadius(101), null);
  assert.equal(validRadius(Number.NaN), null);
});

test('GT17 two places are matched by their own radius, and an alert without a position is never matched', () => {
  assert.deepEqual(alertsNear([quakeUsgs], HANOI_CITY), [quakeUsgs], 'the city matches its own quake');
  assert.deepEqual(alertsNear([quakeUsgs], HA_LONG_LAND), [], 'the land far away does not match');
  assert.deepEqual(alertsNear([quakeNoPlace], HANOI_CITY), [], 'no position, no match');
  assert.deepEqual(alertsNear([quakeUsgs], { ...HANOI_CITY, radiusKm: 4 }), [], 'a radius outside the range matches nothing');
});

test('GT17 a place is stored only when the reader has turned alerts on', () => {
  assert.equal(placeToStore(HANOI_CITY, false), null);
  assert.deepEqual(placeToStore(HANOI_CITY, true), HANOI_CITY);
  assert.equal(placeToStore(null, true), null);
});
