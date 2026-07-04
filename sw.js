// TransPgso SW v1783172801
const APP_VERSION = '1783172801';
const CACHE_NAME = 'transpgso-' + APP_VERSION;
self.addEventListener('install', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()).then(() => self.clients.matchAll({type:'window'})).then(clients => clients.forEach(c => c.postMessage({type:'SW_UPDATED',version:APP_VERSION})))); });
self.addEventListener('fetch', e => { const url = new URL(e.request.url); if(url.origin !== self.location.origin) return; const esIndex = url.pathname.endsWith('/') || url.pathname.endsWith('/TRANSPGSO/') || url.pathname.endsWith('index.html') || url.pathname.endsWith('TRANSPGSO'); if(esIndex || url.pathname.endsWith('sw.js')) { e.respondWith(fetch(e.request, {cache:'no-store'}).catch(() => caches.match(e.request))); return; } });
self.addEventListener('message', e => { if(e.data === 'SKIP_WAITING') self.skipWaiting(); });
