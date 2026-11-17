import { describe, expect, it } from 'vitest';
import { scheduleReminder, type ConfirmedTimeZone } from '@aftervia/domain';

function zone(name: string): ConfirmedTimeZone {
  return { name, confirmedBy: 'owner-1', confirmedAt: '2026-10-31T10:00:00Z' };
}

describe('WO07-02 reminders follow a confirmed IANA time zone', () => {
  it('T22 a reminder at 09:00 in UTC+7 falls at 02:00 UTC on the same day, since UTC+7 has no daylight saving', () => {
    expect(scheduleReminder({ confirmedDate: '2026-04-30', localTime: '09:00', timeZone: zone('Asia/Ho_Chi_Minh') })).toEqual({
      ok: true,
      utc: '2026-04-30T02:00:00.000Z',
      localDate: '2026-04-30',
      resolution: 'exact',
    });
  });

  it('T22 a reminder at 09:00 follows the zone rules in force on that date: UTC-8 in winter, UTC-7 in summer, UTC unchanged', () => {
    expect(scheduleReminder({ confirmedDate: '2026-01-15', localTime: '09:00', timeZone: zone('America/Los_Angeles') })).toMatchObject({
      ok: true,
      utc: '2026-01-15T17:00:00.000Z',
      resolution: 'exact',
    });
    expect(scheduleReminder({ confirmedDate: '2026-04-30', localTime: '09:00', timeZone: zone('America/Los_Angeles') })).toMatchObject({
      ok: true,
      utc: '2026-04-30T16:00:00.000Z',
      resolution: 'exact',
    });
    expect(scheduleReminder({ confirmedDate: '2026-04-30', localTime: '09:00', timeZone: zone('UTC') })).toMatchObject({
      ok: true,
      utc: '2026-04-30T09:00:00.000Z',
    });
  });

  it('T22 the confirmed calendar date does not shift: an early reminder can fall on the previous UTC day but keeps its local date', () => {
    expect(scheduleReminder({ confirmedDate: '2026-04-30', localTime: '06:00', timeZone: zone('Asia/Ho_Chi_Minh') })).toMatchObject({
      ok: true,
      utc: '2026-04-29T23:00:00.000Z',
      localDate: '2026-04-30',
    });
    expect(scheduleReminder({ confirmedDate: '2026-01-15', localTime: '23:30', timeZone: zone('America/Los_Angeles') })).toMatchObject({
      ok: true,
      utc: '2026-01-16T07:30:00.000Z',
      localDate: '2026-01-15',
    });
  });

  it('T22 on both daylight-saving change days, every hour keeps the confirmed local date', () => {
    for (const date of ['2026-03-08', '2026-11-01']) {
      for (let hour = 0; hour < 24; hour += 1) {
        for (const minute of ['00', '30']) {
          const localTime = `${String(hour).padStart(2, '0')}:${minute}`;
          const result = scheduleReminder({ confirmedDate: date, localTime, timeZone: zone('America/Los_Angeles') });
          expect(result).toMatchObject({ ok: true, localDate: date });
        }
      }
    }
  });

  it('T22 a local time that does not exist on the spring-forward day moves to the first valid time after the gap', () => {
    expect(scheduleReminder({ confirmedDate: '2026-03-08', localTime: '02:30', timeZone: zone('America/Los_Angeles') })).toEqual({
      ok: true,
      utc: '2026-03-08T10:30:00.000Z',
      localDate: '2026-03-08',
      resolution: 'gap_forward',
    });
  });

  it('T22 a repeated local time on the fall-back day uses its first occurrence', () => {
    expect(scheduleReminder({ confirmedDate: '2026-11-01', localTime: '01:30', timeZone: zone('America/Los_Angeles') })).toEqual({
      ok: true,
      utc: '2026-11-01T08:30:00.000Z',
      localDate: '2026-11-01',
      resolution: 'overlap_earlier',
    });
  });

  it('T22 a reminder is refused without a confirmed time zone, with an unknown zone, an impossible date or a bad time', () => {
    const base = { confirmedDate: '2026-04-30', localTime: '09:00' };
    expect(
      scheduleReminder({ ...base, timeZone: { name: 'Asia/Ho_Chi_Minh', confirmedBy: null, confirmedAt: '2026-10-31T10:00:00Z' } }),
    ).toEqual({ ok: false, reason: 'timezone_not_confirmed' });
    expect(
      scheduleReminder({ ...base, timeZone: { name: 'Asia/Ho_Chi_Minh', confirmedBy: 'owner-1', confirmedAt: null } }),
    ).toEqual({ ok: false, reason: 'timezone_not_confirmed' });
    expect(
      scheduleReminder({ ...base, timeZone: { name: 'Asia/Ho_Chi_Minh', confirmedBy: 'owner-1', confirmedAt: '2026-10-31 10:00' } }),
    ).toEqual({ ok: false, reason: 'timezone_not_confirmed' });
    expect(scheduleReminder({ ...base, timeZone: zone('Mars/Olympus') })).toEqual({ ok: false, reason: 'invalid_timezone' });
    expect(scheduleReminder({ confirmedDate: '2026-02-31', localTime: '09:00', timeZone: zone('UTC') })).toEqual({
      ok: false,
      reason: 'invalid_date',
    });
    expect(scheduleReminder({ confirmedDate: '2026-04-30', localTime: '24:00', timeZone: zone('UTC') })).toEqual({
      ok: false,
      reason: 'invalid_time',
    });
  });
});
