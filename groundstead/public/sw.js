// Groundstead offline worker (GS-021, GS-022, G-18). It stores nothing itself: a page stores a pack only after every
// file in the pack's manifest matches its SHA-256 and the manifest's Ed25519 signature verifies. This worker checks both
// again before it serves a stored file, so a file that changed on the device, or a pack that is not signed by the key
// this site was built with, is never served.
// For a file held in a stored pack, the network is tried first; the stored copy is used when the network fails or
// does not answer within 3 seconds. Any other request goes straight to the network.
const PACK_PREFIX = 'groundstead-pack-';
const NETWORK_WAIT_MS = 3000;
// The build writes the site's trusted Ed25519 public key here (base64, raw 32 bytes). Empty: no stored copy is served.
const TRUSTED_KEY = '';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(answer(request));
});

// Base64 text to bytes, or null when the text is not base64.
function base64ToBytes(text) {
  if (typeof text !== 'string' || text.length === 0 || text.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return null;
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

// What the manifest signature covers. Must match canonicalBytes in lib/offline/signature.ts.
function canonicalBytes(manifest) {
  const text = JSON.stringify({
    id: manifest.id,
    version: manifest.version,
    updated: manifest.updated,
    issued: manifest.issued,
    files: manifest.files.map((file) => ({ path: file.path, sha256: file.sha256, size: file.size })),
  });
  return new TextEncoder().encode(text);
}

async function signedByTrustedKey(manifest) {
  const raw = base64ToBytes(TRUSTED_KEY);
  const signature = base64ToBytes(manifest.signature);
  if (!raw || raw.byteLength !== 32 || !signature) return false;
  try {
    const key = await crypto.subtle.importKey('raw', raw, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, signature, canonicalBytes(manifest));
  } catch {
    return false;
  }
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// The stored copy of this request, when its pack's manifest is signed by the trusted key, lists this exact file with
// the same size and SHA-256, and the bytes on the device match. Otherwise null: the copy is not served.
async function checkedCopy(cache, packName, request, hit) {
  try {
    const locale = packName.slice(PACK_PREFIX.length).split('-')[0];
    const manifestHit = await cache.match(new URL(`/offline/${locale}.json`, self.location.origin).href);
    if (!manifestHit) return null;
    const manifest = await manifestHit.json();
    if (!manifest || manifest.id !== locale || !Array.isArray(manifest.files)) return null;
    if (!(await signedByTrustedKey(manifest))) return null;
    const entry = manifest.files.find((file) => new URL(file.path, self.location.origin).href === request.url);
    if (!entry) return null;
    const bytes = await hit.arrayBuffer();
    if (bytes.byteLength !== entry.size || (await sha256Hex(bytes)) !== entry.sha256) return null;
    return new Response(bytes, { status: hit.status, statusText: hit.statusText, headers: hit.headers });
  } catch {
    return null;
  }
}

async function storedCopy(request) {
  for (const name of await caches.keys()) {
    if (!name.startsWith(PACK_PREFIX)) continue;
    const cache = await caches.open(name);
    const hit = await cache.match(request);
    if (!hit) continue;
    const copy = await checkedCopy(cache, name, request, hit);
    if (copy) return copy;
  }
  return null;
}

function networkWithinWait(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('network did not answer in time')), NETWORK_WAIT_MS);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function answer(request) {
  const stored = await storedCopy(request);
  if (!stored) return fetch(request);
  try {
    // The network's answer is returned whatever its status, so a page the build withdrew (404) is not served from the
    // device. The stored copy is used only when the request itself fails or the wait runs out.
    return await networkWithinWait(request);
  } catch {
    return stored;
  }
}
