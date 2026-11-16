// Offline support: network first (so updates arrive), cache as fallback.
const CACHE = 'film-dev-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([
        './',
        './manifest.webmanifest',
        './icons/icon-192.png',
        './art/tank.webp', './art/pour.webp', './art/drain.webp', './art/wash.webp',
        './art/thermometer.webp', './art/developer.webp', './art/bleach.webp', './art/fixer.webp',
        './art/stabilizer.webp', './art/drying.webp', './art/loading.webp', './art/canister.webp',
        './art/stopwatch.webp',
    ])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    event.respondWith(fetch(request).then((response) => {
        if (response.ok || response.type === 'opaque') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
        }

        return response;
    }).catch(() => caches.match(request, { ignoreSearch: request.mode === 'navigate' })
        .then((hit) => hit || caches.match('./'))));
});
