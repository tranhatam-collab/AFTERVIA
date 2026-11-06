// Build-time switches. Search indexing stays OFF unless GS_ALLOW_INDEXING=1 is set for a build
// that the owner approved for public release (01_DEV_LOOP_PLAN.md rule 10).
export function allowIndexing(env: Record<string, string | undefined> = process.env): boolean {
  return env.GS_ALLOW_INDEXING === '1';
}
