// TransPgso SW v1782323207 - AUTO-UPDATE
const APP_VERSION = '1782323207';

self.addEventListener('install', e => {
  console.log('SW v' + APP_VERSION + ' instalando');
  // Tomar control inmediatamente sin esperar
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  console.log('SW v' + APP_VERSION + ' activando');
  e.waitUntil(
    Promise.all([
      // Borrar TODOS los caches
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))),
      // Tomar control de todos los clientes
      self.clients.claim()
    ]).then(() => {
      // Notificar a todos los clientes que recarguen
      return self.clients.matchAll({type: 'window'}).then(clients => {
        clients.forEach(client => client.postMessage({type: 'SW_UPDATED', version: APP_VERSION}));
      });
    })
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  const esIndex = url.pathname.endsWith('/') || 
                  url.pathname.endsWith('/TRANSPGSO/') ||
                  url.pathname.endsWith('index.html') ||
                  url.pathname.endsWith('TRANSPGSO');
  
  if(esIndex) {
    e.respondWith(
      fetch(e.request.url.split('?')[0] + '?_v=' + APP_VERSION, {
        cache: 'no-store',
        headers: {'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache'}
      }).catch(() => fetch(e.request, {cache: 'no-store'}))
    );
    return;
  }
  
  if(url.pathname.endsWith('sw.js')) {
    e.respondWith(fetch(e.request, {cache: 'no-store'}));
    return;
  }
  
  e.respondWith(
    fetch(e.request, {cache: 'no-store'}).catch(() => caches.match(e.request))
  );
});

self.addEventListener('message', e => {
  if(e.data === 'SKIP_WAITING') self.skipWaiting();
});
