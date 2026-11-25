// Freshness of a contact entry. Kept pure so the rule can be tested without a browser.
export const STALE_AFTER_DAYS = 92;
export type DirectoryState = 'current' | 'stale' | 'unknown';

const DAY_MS = 86_400_000;

// An entry is "current" up to 92 days after its check date and "stale" after that. A missing, unreadable
// or future date is "unknown": the page must never show such an entry as checked.
export function directoryStatus(checkedOn: string | undefined, today: string): DirectoryState {
  const checked = checkedOn ? Date.parse(checkedOn) : Number.NaN;
  const now = Date.parse(today);
  if (Number.isNaN(checked) || Number.isNaN(now)) return 'unknown';
  const days = Math.floor((now - checked) / DAY_MS);
  if (days < 0) return 'unknown';
  return days > STALE_AFTER_DAYS ? 'stale' : 'current';
}
