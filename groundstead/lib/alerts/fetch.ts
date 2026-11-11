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
export type FeedRead = { url: string; format: FeedFormat; fetch?: FetchLike; timeoutMs?: number; maxBytes?: number };

const USER_AGENT = 'groundstead-alert-refresh/0.1';

// The largest feed body read, in bytes (G-17). A larger body is refused and its source is marked failed with the reason
// TOO_LARGE. The two feeds are a few hundred kilobytes each; this bounds memory, it does not limit normal use.
export const MAX_FEED_BYTES = 5 * 1024 * 1024;
export const TOO_LARGE = 'too large';

// The text of a body, read as it streams. A declared length over the limit is refused before any byte is read. The
// bytes are counted as they arrive, and reading stops and the stream is cancelled as soon as the limit is passed, so the
// body is never held in memory past the limit (G-17).
async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new FeedRefused(TOO_LARGE);
  if (response.body === null) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new FeedRefused(TOO_LARGE);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

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
  const text = await readCapped(response, input.maxBytes ?? MAX_FEED_BYTES);
  return geojson ? JSON.parse(text) : text;
}
