// Groundstead offline worker (GS-021). It stores nothing itself: a page stores a pack only after every file in the
// pack's manifest matches its SHA-256, and this worker answers from those stored packs only.
// For a file held in a stored pack, the network is tried first; the stored copy is used when the network fails or
// does not answer within 3 seconds. Any other request goes straight to the network.
const PACK_PREFIX = 'groundstead-pack-';
const NETWORK_WAIT_MS = 3000;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(answer(request));
});

async function storedCopy(request) {
  for (const name of await caches.keys()) {
    if (!name.startsWith(PACK_PREFIX)) continue;
    const hit = await (await caches.open(name)).match(request);
    if (hit) return hit;
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
    const response = await networkWithinWait(request);
    // A server error must not replace the stored offline copy.
    return response.ok ? response : stored;
  } catch {
    return stored;
  }
}
