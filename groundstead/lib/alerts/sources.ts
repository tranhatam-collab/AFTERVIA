import type { SourceState } from './text.ts';

export type { SourceState } from './text.ts';

// How current a source is (GT14). A failed or old source is never read as "nothing is happening": the state says why
// alerts may be missing. Times in the future or unreadable times count as stale or never.
export function sourceState(input: { lastUpdated: string | null; failed: boolean }, now: Date, maxAgeMinutes = 30): SourceState {
  if (input.failed) return 'failed';
  if (input.lastUpdated === null) return 'never';
  const updated = Date.parse(input.lastUpdated);
  if (Number.isNaN(updated)) return 'never';
  const ageMinutes = (now.getTime() - updated) / 60_000;
  return ageMinutes >= 0 && ageMinutes <= maxAgeMinutes ? 'ok' : 'stale';
}
