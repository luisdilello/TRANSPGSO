// TransPgso SW v1782253148 - FUERZA NO CACHE
const APP_VERSION = '1782253148';

self.addEventListener('install', e => {
  console.log('SW v' + APP_VERSION + ' instalando');
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  console.log('SW v' + APP_VERSION + ' activando');
  e.waitUntil(
    Promise.all([
      // Borrar TODOS los caches
      caches.keys().then(keys => Promise.all(keys.map(k => {
        console.log('Borrando cache:', k);
        return caches.delete(k);
      }))),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Para index.html y raíz: SIEMPRE desde red, nunca caché
  const esIndex = url.pathname.endsWith('/') || 
                  url.pathname.endsWith('/TRANSPGSO/') ||
                  url.pathname.endsWith('index.html') ||
                  url.pathname.endsWith('TRANSPGSO');
  
  if(esIndex) {
    e.respondWith(
      fetch(e.request.url.split('?')[0] + '?_nocache=' + APP_VERSION, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }).catch(() => fetch(e.request, {cache: 'no-store'}))
    );
    return;
  }
  
  // Para sw.js: siempre desde red
  if(url.pathname.endsWith('sw.js')) {
    e.respondWith(fetch(e.request, {cache: 'no-store'}));
    return;
  }
  
  // Para todo lo demás: red primero, sin caché
  e.respondWith(
    fetch(e.request, {cache: 'no-store'}).catch(() => 
      caches.match(e.request)
    )
  );
});

// Responder a mensajes del cliente
self.addEventListener('message', e => {
  if(e.data === 'GET_VERSION') {
    e.ports[0].postMessage(APP_VERSION);
  }
  if(e.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
