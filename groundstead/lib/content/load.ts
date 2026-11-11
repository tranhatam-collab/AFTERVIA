import { loadContent } from './validate.ts';
import type { LoadedContent } from './types.ts';

let cached: { content: LoadedContent; today: string } | undefined;

// Build-time loader for server components. `npm run build` runs the content check before this is called.
// This is the one place the content path reads the clock: it is the build's composition root (G-06).
function load(): { content: LoadedContent; today: string } {
  if (!cached) {
    const today = new Date().toISOString().slice(0, 10);
    cached = { content: loadContent({ today }), today };
  }
  return cached;
}

export function getContent(): LoadedContent {
  return load().content;
}

// The date the build was made; every "stale" decision on the pages uses this one date.
export function buildDate(): string {
  return load().today;
}
