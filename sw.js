// TransPgso SW v1788263459
// Antes este service worker borraba TODO el cache al instalar y no guardaba nada -- eso
// significaba que si el mensajero se quedaba sin señal, la app ni siquiera podía abrir
// (pantalla en blanco). Ahora precachea lo minimo necesario para que la app y las librerias
// de las que depende (React, Supabase, el lector de codigo de barras) sigan funcionando sin
// conexion, y actualiza ese cache solo cuando SI hay señal.
// OJO: cada vez que se despliega un fix de JS en index.html, hay que bumpear este
// APP_VERSION también (aunque este archivo sw.js no haya cambiado de lógica) — eso obliga
// al navegador a instalar un Service Worker "nuevo" y dispara el aviso/recarga automática
// que ya tiene la app (ver controllerchange en index.html). Si no se bumpea, un mensajero
// que dejó la PWA abierta en segundo plano sigue corriendo el JS viejo indefinidamente,
// aunque el index.html ya esté actualizado en GitHub Pages.
const APP_VERSION = '1788263459';
const CACHE_NAME = 'transpgso-' + APP_VERSION;
const LOGO_ICON = 'logo.jpg';

// Shell propio de la app -- el mensajero nunca necesita los modulos de modules/*.js (esos son
// solo del panel admin: Gestion de Envios, Pagos, etc., se cargan aparte y solo para admins).
const ASSETS_PROPIOS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/logo.jpg'];
// Librerias externas criticas para que la app de mensajero funcione: React, Supabase (base de
// datos), y el lector de codigos de barra (zxing) que usan Colecta/Retiro Masivo/Asignacion.
const ASSETS_EXTERNOS = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all([
        cache.addAll(ASSETS_PROPIOS).catch(() => {}),
        ...ASSETS_EXTERNOS.map(url => fetch(url, { mode: 'no-cors' }).then(res => cache.put(url, res)).catch(() => {}))
      ]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: APP_VERSION })))
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('sw.js')) return; // el propio SW: siempre de red, nunca de cache

  const esMismoOrigen = url.origin === self.location.origin;
  const esIndex = esMismoOrigen && (url.pathname === '/' || url.pathname.endsWith('index.html'));
  const esExterno = !esMismoOrigen && ASSETS_EXTERNOS.some(u => e.request.url.indexOf(u) === 0);

  if (esIndex) {
    // El shell de la app: siempre intenta la version mas nueva primero; si no hay señal,
    // sirve la ultima que se guardo en cache -- asi la app abre igual sin conexion.
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(res => { caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  if (esMismoOrigen) {
    // Iconos, manifest, etc: no cambian seguido -- cache primero, red como respaldo.
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request)
        .then(res => { caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone())); return res; })
        .catch(() => cached))
    );
    return;
  }

  if (esExterno) {
    // Librerias externas: cache primero para que sigan funcionando sin señal, y se
    // refrescan solas en segundo plano apenas hay conexion.
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request, { mode: 'no-cors' })
          .then(res => { caches.open(CACHE_NAME).then(c => c.put(e.request, res)); return res; })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = {}; }
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
    self.clients.matchAll({ type: 'window' }).then(clientsArr => {
      for (const client of clientsArr) { if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
