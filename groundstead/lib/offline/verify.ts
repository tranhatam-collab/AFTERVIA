// Offline pack checks (GS-021, GT07). Pure functions: the browser computes SHA-256 with crypto.subtle and the
// tests compute it with node:crypto; the rule below is the same in both places.
export type PackFile = { path: string; sha256: string; size: number };
// signature and publicKey are set by the build (Ed25519, base64). A reader's browser trusts only the key built into
// the site, never the publicKey that a manifest carries.
export type PackManifest = {
  id: string;
  version: string;
  updated: string;
  // When the build signed the manifest (ISO 8601, UTC). It is part of the signed bytes, so it cannot be moved later.
  issued: string;
  files: PackFile[];
  signature?: string | null;
  publicKey?: string | null;
};
export type Verdict = { ready: boolean; problems: string[] };

// Rollback (G-19): a signed manifest issued before the installed one is refused. The version is a hash of the file
// list and cannot be ordered, so the signed issue time decides.
export function isOlder(incoming: PackManifest, installed: PackManifest): boolean {
  return Date.parse(incoming.issued) < Date.parse(installed.issued);
}

const HEX64 = /^[0-9a-f]{64}$/;

// A pack is ready only when it lists at least one file and every listed file was found with the same SHA-256.
// Extra files in the cache are ignored; a missing or changed file makes the whole pack not ready.
export function verifyPack(pack: PackManifest, found: Readonly<Record<string, string>>): Verdict {
  const problems: string[] = [];
  if (pack.files.length === 0) problems.push('the pack lists no files');
  for (const file of pack.files) {
    if (!HEX64.test(file.sha256)) {
      problems.push(`bad hash format for ${file.path}`);
      continue;
    }
    const hash = found[file.path];
    if (hash === undefined) problems.push(`missing ${file.path}`);
    else if (hash !== file.sha256) problems.push(`hash mismatch ${file.path}`);
  }
  return { ready: problems.length === 0, problems };
}
