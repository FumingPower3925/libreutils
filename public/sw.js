const CACHE_VERSION = '0.2.0';
const CACHE_NAME = `libreutils-v${CACHE_VERSION}`;
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/index.js',
    '/manifest.json',
    '/favicon.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                await cache.addAll(STATIC_ASSETS);
            } catch (error) {
                console.error('[SW] Failed to cache static assets:', error);
            }
        })()
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            const oldCaches = cacheNames.filter(
                (name) => name.startsWith('libreutils-') && name !== CACHE_NAME
            );

            return Promise.all(oldCaches.map((name) => caches.delete(name)))
                .then(() => {
                    // Only notify clients if there were old caches (meaning this is an update)
                    if (oldCaches.length > 0) {
                        return self.clients.matchAll().then((clients) => {
                            clients.forEach((client) => {
                                client.postMessage({
                                    type: 'SW_UPDATED',
                                    version: CACHE_VERSION
                                });
                            });
                        });
                    }
                });
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                event.waitUntil(
                    fetch(event.request).then((response) => {
                        if (response.ok) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, response);
                            });
                        }
                    }).catch((error) => {
                        console.error('[SW] Background cache update failed:', error);
                    })
                );
                return cached;
            }

            return fetch(event.request).then((response) => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('/');
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
