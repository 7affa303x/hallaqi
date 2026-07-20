/**
 * Hallaqi push-only service worker.
 * No precache — avoids stale OAuth shells while keeping Web Push alive.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

importScripts('/push-handler.js');
