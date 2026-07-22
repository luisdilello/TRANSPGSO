// TransPgso SW v1784741804
const APP_VERSION = '1784741804';
const CACHE_NAME = 'transpgso-' + APP_VERSION;
const LOGO_ICON = 'logo.jpg';
self.addEventListener('install', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()).then(() => self.clients.matchAll({type:'window'})).then(clients => clients.forEach(c => c.postMessage({type:'SW_UPDATED',version:APP_VERSION})))); });
self.addEventListener('fetch', e => { const url = new URL(e.request.url); if(url.origin !== self.location.origin) return; const esIndex = url.pathname === '/' || url.pathname.endsWith('index.html'); if(esIndex || url.pathname.endsWith('sw.js')) { e.respondWith(fetch(e.request, {cache:'no-cache'}).catch(() => caches.match(e.request))); return; } });
self.addEventListener('message', e => { if(e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('push', e => {
  let data = {};
  try{ data = e.data ? e.data.json() : {}; }catch(err){ data = {}; }
  const title = data.title || 'TransPgso';
  const options = {
    body: data.body || 'Tienes un aviso nuevo — abre la app para verlo',
    icon: data.icon || LOGO_ICON,
    badge: data.badge || LOGO_ICON,
    data: { url: data.url || '/' },
    tag: data.tag || undefined
  };
  e.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({type:'window'}).then(clientsArr => {
      for (const client of clientsArr) { if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
