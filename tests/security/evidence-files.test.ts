import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// OWN-A-11 (audit 10/11, A-02 and OD-05). Four archives had been committed under docs/plan/evidence. An
// archive cannot be reviewed in a diff, and the secret scanner reads it as one line of binary noise, so it
// is a poor place to keep evidence. The hashes stay in MANIFEST.sha256, which is reviewable text.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARCHIVE = /\.(zip|tar|tgz|gz|bz2|xz|7z|rar|jar)$/i;

function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((line) => line.length > 0);
}

describe('OWN-A-11 evidence stays reviewable', () => {
  it('no archive is committed under docs/plan/evidence', () => {
    const found = trackedFiles().filter((f) => f.startsWith('docs/plan/evidence/') && ARCHIVE.test(f));
    expect(found).toEqual([]);
  });

  it('no archive is committed anywhere in the repository', () => {
    expect(trackedFiles().filter((f) => ARCHIVE.test(f))).toEqual([]);
  });

  it('the manifest that records the removed archives is still there, as text', () => {
    const files = trackedFiles();
    const manifest = 'docs/plan/evidence/independent-decision-review-2026-11-04/MANIFEST.sha256';
    expect(files).toContain(manifest);
  });
});
