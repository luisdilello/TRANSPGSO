// TransPgso SW v1782695346
const APP_VERSION = '1782695346';
self.addEventListener('install', e => { e.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', e => { e.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))),self.clients.claim()])); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(url.origin !== self.location.origin) return;
  const esIndex = url.pathname.endsWith('/') || url.pathname.endsWith('/TRANSPGSO/') || url.pathname.endsWith('index.html') || url.pathname.endsWith('TRANSPGSO');
  if(esIndex) { e.respondWith(fetch(url.pathname.split('?')[0]+'?_nocache='+APP_VERSION,{cache:'no-store'}).catch(()=>fetch(e.request,{cache:'no-store'}))); return; }
  if(url.pathname.endsWith('sw.js')) { e.respondWith(fetch(e.request,{cache:'no-store'})); return; }
});
self.addEventListener('message', e => { if(e.data==='SKIP_WAITING') self.skipWaiting(); });
