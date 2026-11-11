// Reads one alert feed (GS-053). Every feed read goes through here, so the same rules apply to each source (G-16, G-17).
// A refusal carries a reason. It is never read as "no alerts": the caller marks the source failed with that reason.

// A refusal of a feed, with the reason it was refused.
export class FeedRefused extends Error {
  reason: string;

  constructor(reason: string) {
    super(reason);
    this.reason = reason;
  }
}

export type FeedFormat = 'geojson' | 'rss';
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
export type FeedRead = { url: string; format: FeedFormat; fetch?: FetchLike; timeoutMs?: number };

const USER_AGENT = 'groundstead-alert-refresh/0.1';

// The reason a feed address is refused, or null when it may be read (G-16). Only https is read: another scheme can name a
// local file, inline data or another protocol.
export function feedUrlProblem(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'the feed address is not a valid URL';
  }
  if (parsed.protocol !== 'https:') return `the feed address uses ${parsed.protocol}; only https feeds are read`;
  return null;
}

// The body of one feed: parsed JSON for GeoJSON, text for RSS.
export async function readFeed(input: FeedRead): Promise<unknown> {
  const problem = feedUrlProblem(input.url);
  if (problem !== null) throw new FeedRefused(problem);
  const doFetch: FetchLike = input.fetch ?? ((url, init) => fetch(url, init));
  const geojson = input.format === 'geojson';
  const response = await doFetch(input.url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: geojson ? 'application/geo+json, application/json' : 'application/rss+xml, application/xml, text/xml',
    },
    signal: AbortSignal.timeout(input.timeoutMs ?? 20_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  return geojson ? JSON.parse(text) : text;
}
