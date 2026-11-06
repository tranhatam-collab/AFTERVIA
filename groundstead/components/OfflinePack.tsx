'use client';

import { useEffect, useState } from 'react';
import { sha256Hex } from '../lib/offline/digest.ts';
import { PACK_PUBLIC_KEY } from '../lib/offline/keys.ts';
import { verifySignature } from '../lib/offline/signature.ts';
import type { OfflineText } from '../lib/offline/text.ts';
import { verifyPack, type PackManifest } from '../lib/offline/verify.ts';

// The offline copy panel (GS-021, GS-022). It downloads a locale pack, checks the manifest's Ed25519 signature
// against the key built into the site, checks every file against the manifest, and stores the pack only when all of
// that holds. A stored pack that fails the check is removed, so the service worker never answers from a damaged or
// unsigned copy. The worker is public/sw.js.

type Phase = 'checking' | 'busy' | 'none' | 'ready' | 'notReady' | 'unsupported' | 'removed';
type Info = { version: string; updated: string };
type Check = { kind: 'none' } | { kind: 'notReady' } | { kind: 'ready'; info: Info };
type Body = { bytes: ArrayBuffer; type: string | null };
type Fetched =
  | { kind: 'ok'; manifest: PackManifest; bodies: Map<string, Body> }
  | { kind: 'unsigned' }
  | { kind: 'failed' };

const PREFIX = 'groundstead-pack-';

function supported(): boolean {
  return (
    'caches' in window &&
    'serviceWorker' in navigator &&
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined'
  );
}

function absolute(path: string): string {
  return new URL(path, window.location.origin).href;
}

function isManifest(value: unknown): value is PackManifest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || typeof v.version !== 'string' || typeof v.updated !== 'string') return false;
  if (!Array.isArray(v.files)) return false;
  return v.files.every((file: unknown) => {
    if (typeof file !== 'object' || file === null) return false;
    const f = file as Record<string, unknown>;
    return typeof f.path === 'string' && typeof f.sha256 === 'string' && typeof f.size === 'number';
  });
}

async function packNames(locale: string): Promise<string[]> {
  return (await caches.keys()).filter((name) => name.startsWith(`${PREFIX}${locale}-`));
}

async function dropPacks(locale: string, keep?: string): Promise<void> {
  for (const name of await packNames(locale)) {
    if (name !== keep) await caches.delete(name);
  }
}

// Reads the stored manifest, checks its signature, and hashes every stored file again. Ready only when all hold.
async function checkStored(locale: string): Promise<Check> {
  for (const name of await packNames(locale)) {
    const cache = await caches.open(name);
    const hit = await cache.match(absolute(`/offline/${locale}.json`));
    if (!hit) continue;
    let manifest: unknown;
    try {
      manifest = await hit.json();
    } catch {
      continue;
    }
    if (!isManifest(manifest)) continue;
    if (!(await verifySignature(manifest, manifest.signature, PACK_PUBLIC_KEY))) return { kind: 'notReady' };
    const found: Record<string, string> = {};
    for (const file of manifest.files) {
      const stored = await cache.match(absolute(file.path));
      if (stored) found[file.path] = await sha256Hex(await stored.arrayBuffer());
    }
    if (!verifyPack(manifest, found).ready) return { kind: 'notReady' };
    return { kind: 'ready', info: { version: manifest.version, updated: manifest.updated } };
  }
  return { kind: 'none' };
}

// Downloads the manifest, checks its signature, then downloads every file it lists. The result is 'ok' only when the
// signature is valid and every file matches.
async function fetchPack(locale: string): Promise<Fetched> {
  let manifest: unknown;
  try {
    const response = await fetch(`/offline/${locale}.json`, { cache: 'no-store' });
    if (!response.ok) return { kind: 'failed' };
    manifest = await response.json();
  } catch {
    return { kind: 'failed' };
  }
  if (!isManifest(manifest)) return { kind: 'failed' };
  if (!(await verifySignature(manifest, manifest.signature, PACK_PUBLIC_KEY))) return { kind: 'unsigned' };
  const found: Record<string, string> = {};
  const bodies = new Map<string, Body>();
  for (const file of manifest.files) {
    try {
      const response = await fetch(file.path, { cache: 'no-store' });
      if (!response.ok) continue;
      const bytes = await response.arrayBuffer();
      found[file.path] = await sha256Hex(bytes);
      bodies.set(file.path, { bytes, type: response.headers.get('content-type') });
    } catch {
      // unreadable: left out of `found`, so verifyPack reports that file as missing
    }
  }
  return verifyPack(manifest, found).ready ? { kind: 'ok', manifest, bodies } : { kind: 'failed' };
}

async function storePack(locale: string, manifest: PackManifest, bodies: Map<string, Body>): Promise<void> {
  const name = `${PREFIX}${locale}-${manifest.version}`;
  const cache = await caches.open(name);
  try {
    for (const [path, body] of bodies) {
      const headers = body.type ? { 'content-type': body.type } : undefined;
      await cache.put(absolute(path), new Response(body.bytes, { headers }));
    }
    await cache.put(
      absolute(`/offline/${locale}.json`),
      new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json' } }),
    );
  } catch (error) {
    await caches.delete(name);
    throw error;
  }
  await dropPacks(locale, name);
}

async function ensureWorker(): Promise<boolean> {
  if (await navigator.serviceWorker.getRegistration()) return true;
  try {
    await navigator.serviceWorker.register('/sw.js');
    return true;
  } catch {
    return false;
  }
}

function fill(template: string, info: Info): string {
  return template.replace('{version}', info.version).replace('{date}', info.updated);
}

function messageFor(phase: Phase, info: Info | null, labels: OfflineText): string {
  switch (phase) {
    case 'checking':
    case 'busy':
      return labels.statusChecking;
    case 'ready':
      return info ? fill(labels.statusReady, info) : labels.statusNone;
    case 'notReady':
      return labels.statusNotReady;
    case 'unsupported':
      return labels.statusUnsupported;
    case 'removed':
      return labels.statusRemoved;
    default:
      return labels.statusNone;
  }
}

export function OfflinePack({ locale, labels }: { locale: string; labels: OfflineText }) {
  // "checking" is also the first render on the server, so the static HTML and the first client render match.
  const [phase, setPhase] = useState<Phase>('checking');
  const [info, setInfo] = useState<Info | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Shows what is stored after checking it. A stored pack that fails the check is removed.
  async function settle(): Promise<Check['kind']> {
    const check = await checkStored(locale);
    if (check.kind === 'ready') {
      setInfo(check.info);
      setPhase('ready');
    } else if (check.kind === 'notReady') {
      await dropPacks(locale);
      setInfo(null);
      setPhase('notReady');
    } else {
      setInfo(null);
      setPhase('none');
    }
    return check.kind;
  }

  useEffect(() => {
    if (!supported()) {
      setPhase('unsupported');
      return;
    }
    settle()
      .then(async (kind) => {
        if (kind === 'ready' && !(await ensureWorker())) setPhase('unsupported');
      })
      .catch(() => setPhase('unsupported'));
  }, [locale]);

  async function download() {
    setNotice(null);
    setPhase('busy');
    try {
      const fetched = await fetchPack(locale).catch((): Fetched => ({ kind: 'failed' }));
      if (fetched.kind !== 'ok') {
        setNotice(fetched.kind === 'unsigned' ? labels.statusUnsigned : labels.statusFailed);
        await settle();
        return;
      }
      try {
        await storePack(locale, fetched.manifest, fetched.bodies);
      } catch {
        await dropPacks(locale);
        setInfo(null);
        setPhase('notReady');
        return;
      }
      if (!(await ensureWorker())) {
        setPhase('unsupported');
        return;
      }
      setInfo({ version: fetched.manifest.version, updated: fetched.manifest.updated });
      setPhase('ready');
    } catch {
      setPhase('unsupported');
    }
  }

  async function check() {
    setNotice(null);
    setPhase('busy');
    try {
      await settle();
    } catch {
      setPhase('unsupported');
    }
  }

  async function remove() {
    setNotice(null);
    try {
      await dropPacks(locale);
      setInfo(null);
      setPhase('removed');
    } catch {
      setPhase('unsupported');
    }
  }

  const busy = phase === 'checking' || phase === 'busy';
  const hasCopy = phase === 'ready';
  return (
    <section aria-labelledby="offline-title">
      <h2 id="offline-title">{labels.title}</h2>
      <p>{labels.lead}</p>
      <p role="status" aria-live="polite" data-offline={phase}>
        {notice ?? messageFor(phase, info, labels)}
      </p>
      <div className="actions">
        <button type="button" onClick={download} disabled={busy || phase === 'unsupported'}>
          {labels.download}
        </button>
        <button type="button" onClick={check} disabled={busy || !hasCopy}>
          {labels.check}
        </button>
        <button type="button" onClick={remove} disabled={busy || !hasCopy}>
          {labels.remove}
        </button>
      </div>
      <p className="footnote">{labels.note}</p>
    </section>
  );
}
