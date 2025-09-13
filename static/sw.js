// Minimal Service Worker for Solobase - No caching
// This service worker doesn't cache anything, just passes through all requests

self.addEventListener('install', event => {
  // Skip waiting and activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Clear all caches from previous service workers
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  // For external resources (fonts, CDNs), use no-cors mode to bypass CSP in service worker
  const url = new URL(event.request.url);
  
  // List of external domains that should bypass service worker
  const externalDomains = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'unpkg.com'
  ];
  
  if (externalDomains.some(domain => url.hostname.includes(domain))) {
    // Don't handle external requests in service worker, let browser handle them directly
    return;
  }
  
  // For same-origin requests, fetch normally
  event.respondWith(fetch(event.request));
});