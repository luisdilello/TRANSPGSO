// v1782067976 - SW deshabilitado
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // Notificar a todos los clientes que recarguen
        self.clients.matchAll().then(clients => {
          clients.forEach(c => c.postMessage('RELOAD'));
        });
      })
  );
});
// No interceptar ningún fetch - dejar pasar todo
