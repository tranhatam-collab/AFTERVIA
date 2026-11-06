import type { Locale } from '../i18n/locales.ts';
import { sha256Hex } from './digest.ts';
import { createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { canonicalBytes, type PackBody } from './signature.ts';
import type { PackFile, PackManifest } from './verify.ts';

// Build-time helpers (used by tools/build/postbuild.mjs and the tests). The reader's device never imports this file.

// What a locale pack holds: the home page, the emergency section and the help directories. Readiness and other
// tools stay out: the pack is the emergency content.
const SECTIONS = ['emergency', 'help'] as const;

export function inPack(urlPath: string, locale: Locale): boolean {
  if (urlPath === `/${locale}/`) return true;
  return SECTIONS.some((section) => urlPath.startsWith(`/${locale}/${section}/`));
}

// Paths under /_next/static that a file names: scripts, styles, payloads, fonts and images.
const ASSET = /\/_next\/static\/[^\s"'()<>\\,;]+\.(?:js|css|woff2?|png|jpe?g|webp|svg|ico)\b/g;

export function assetRefs(text: string): string[] {
  return [...new Set(text.match(ASSET) ?? [])].sort();
}

// The manifest lists every file of the pack with its SHA-256 and size, sorted by path. The version is a hash of that
// list, so any changed byte changes it. The date is the build date shown to the reader.
export async function buildManifest(
  locale: Locale,
  files: { path: string; bytes: Uint8Array }[],
  updated: string,
): Promise<PackManifest> {
  const entries: PackFile[] = [];
  for (const file of files) {
    entries.push({ path: file.path, sha256: await sha256Hex(file.bytes), size: file.bytes.byteLength });
  }
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const listing = new TextEncoder().encode(entries.map((e) => `${e.path} ${e.sha256}`).join('\n'));
  const version = (await sha256Hex(listing)).slice(0, 12);
  return { id: locale, version, updated, files: entries };
}

// Signs the manifest with the build's Ed25519 private key (PKCS#8 PEM). Only the build calls this. The key comes from
// the environment and is never written to disk.
export function signManifest(manifest: PackManifest, privatePem: string): PackManifest {
  const key = createPrivateKey(privatePem);
  const publicKey = Buffer.from(createPublicKey(key).export({ format: 'jwk' }).x ?? '', 'base64url').toString('base64');
  const body: PackBody = { id: manifest.id, version: manifest.version, updated: manifest.updated, files: manifest.files };
  const signature = sign(null, canonicalBytes(body), key).toString('base64');
  return { ...manifest, signature, publicKey };
}
