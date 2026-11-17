// Lịch nhắc theo múi giờ IANA đã xác nhận (WO07-02). Thuần túy: không đọc đồng hồ, không đọc múi giờ của máy chủ.
// Ngày nhắc là ngày theo lịch đã xác nhận (date-only). Giờ nhắc là giờ treo tường tại múi giờ đã xác nhận,
// được đổi sang UTC theo lịch của chính múi giờ đó, kể cả khi có giờ mùa hè.
// Giờ không tồn tại (đồng hồ nhảy tới): dời về thời điểm sau khoảng trống, ví dụ 02:30 thành 03:30.
// Giờ lặp lại (đồng hồ lùi lại): chọn lần xuất hiện đầu tiên.

import { isDateOnly } from './items';

export interface ConfirmedTimeZone {
  name: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
}

export type ReminderRefusal = 'invalid_date' | 'invalid_time' | 'invalid_timezone' | 'timezone_not_confirmed';
export type WallTimeResolution = 'exact' | 'gap_forward' | 'overlap_earlier';

export type ReminderResult =
  | { ok: true; utc: string; localDate: string; resolution: WallTimeResolution }
  | { ok: false; reason: ReminderRefusal };

const LOCAL_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const CONFIRMED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Chỉ cache các múi giờ đã được kiểm hợp lệ, nên bộ nhớ bị giới hạn bởi số múi giờ thật.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function partOf(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const found = parts.find((part) => part.type === type);
  if (!found) throw new Error(`timezone_part_missing:${type}`);
  return Number(found.value);
}

// Độ lệch (phút, dương về phía đông UTC) của múi giờ tại thời điểm utcMs (bội của 60 000 ms).
function offsetMinutes(timeZone: string, utcMs: number): number {
  const parts = formatterFor(timeZone).formatToParts(new Date(utcMs));
  const asUtc = Date.UTC(
    partOf(parts, 'year'),
    partOf(parts, 'month') - 1,
    partOf(parts, 'day'),
    partOf(parts, 'hour'),
    partOf(parts, 'minute'),
    partOf(parts, 'second'),
  );
  return (asUtc - utcMs) / MINUTE_MS;
}

function localDateOf(timeZone: string, utcMs: number): string {
  const parts = formatterFor(timeZone).formatToParts(new Date(utcMs));
  const year = String(partOf(parts, 'year')).padStart(4, '0');
  const month = String(partOf(parts, 'month')).padStart(2, '0');
  const day = String(partOf(parts, 'day')).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Kiểm tên IANA bằng chính ICU của runtime. Tên không hợp lệ bị từ chối, không ném lỗi.
export function isValidTimeZone(name: string): boolean {
  if (typeof name !== 'string' || name.length === 0 || name.length > 64) return false;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: name }).resolvedOptions().timeZone.length > 0;
  } catch {
    return false;
  }
}

function isConfirmed(zone: ConfirmedTimeZone): boolean {
  return (
    typeof zone.confirmedBy === 'string' &&
    zone.confirmedBy.trim().length > 0 &&
    typeof zone.confirmedAt === 'string' &&
    CONFIRMED_AT.test(zone.confirmedAt) &&
    !Number.isNaN(Date.parse(zone.confirmedAt))
  );
}

function resultAt(timeZone: string, utcMs: number, resolution: WallTimeResolution): ReminderResult {
  return {
    ok: true,
    utc: new Date(utcMs).toISOString(),
    localDate: localDateOf(timeZone, utcMs),
    resolution,
  };
}

export function scheduleReminder(input: {
  confirmedDate: string;
  localTime: string;
  timeZone: ConfirmedTimeZone;
}): ReminderResult {
  if (typeof input.confirmedDate !== 'string' || !isDateOnly(input.confirmedDate)) {
    return { ok: false, reason: 'invalid_date' };
  }
  const time = typeof input.localTime === 'string' ? LOCAL_TIME.exec(input.localTime) : null;
  if (!time) return { ok: false, reason: 'invalid_time' };
  if (!isConfirmed(input.timeZone)) return { ok: false, reason: 'timezone_not_confirmed' };
  const name = input.timeZone.name;
  if (!isValidTimeZone(name)) return { ok: false, reason: 'invalid_timezone' };

  const [year, month, day] = input.confirmedDate.split('-').map(Number) as [number, number, number];
  const wall = Date.UTC(year, month - 1, day, Number(time[1]), Number(time[2]));

  // Độ lệch trước và sau thời điểm treo tường. Một lần chuyển giờ nằm trong khoảng ±24 giờ.
  const before = offsetMinutes(name, wall - DAY_MS);
  const after = offsetMinutes(name, wall + DAY_MS);
  const candidates = Array.from(new Set([before, after]))
    .map((offset) => ({ offset, utcMs: wall - offset * MINUTE_MS }))
    .filter((candidate) => offsetMinutes(name, candidate.utcMs) === candidate.offset)
    .map((candidate) => candidate.utcMs)
    .sort((a, b) => a - b);

  const earliest = candidates[0];
  if (earliest === undefined) {
    // Giờ không tồn tại: đồng hồ nhảy tới, dời về sau khoảng trống.
    return resultAt(name, wall - before * MINUTE_MS, 'gap_forward');
  }
  return resultAt(name, earliest, candidates.length === 1 ? 'exact' : 'overlap_earlier');
}
