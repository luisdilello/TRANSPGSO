// TransPgso SW v1782066834
const CACHE = 'transpgso-v1782066834';

self.addEventListener('install', e => {
  self.skipWaiting(); // Activar inmediatamente
});

self.addEventListener('activate', e => {
  // Eliminar TODOS los caches anteriores
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // SIEMPRE ir a la red primero, nunca servir desde caché
  // Solo usar caché como fallback offline
  if(e.request.method !== 'GET') return;
  
  // Para el index.html y sw.js: NUNCA cachear, siempre red
  if(e.request.url.includes('index.html') || 
     e.request.url.includes('sw.js') ||
     e.request.url.endsWith('/TRANSPGSO/') ||
     e.request.url.endsWith('/TRANSPGSO')) {
    e.respondWith(
      fetch(e.request, {cache: 'no-store', headers: {'Cache-Control': 'no-cache'}})
        .catch(() => caches.match(e.request))
    );
    return;
  }
  
  // Para otros recursos (fonts, etc): red primero
  e.respondWith(
    fetch(e.request, {cache: 'no-store'})
      .catch(() => caches.match(e.request))
  );
});

// Notificar a todos los clientes cuando hay nueva versión
self.addEventListener('message', e => {
  if(e.data === 'SKIP_WAITING') self.skipWaiting();
});
