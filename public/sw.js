/* Basic service worker for PWA installability and future enhancements */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of uncontrolled clients immediately
  event.waitUntil(self.clients.claim());
});

// No-op fetch handler to keep room for future offline caching
self.addEventListener('fetch', () => {
  // Intentionally left blank for now
});


