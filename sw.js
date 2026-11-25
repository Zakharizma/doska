/* Служебный скрипт — нужен только для установки доски как приложения.
   Chrome на Android даёт «Установить приложение» лишь тогда, когда у сайта
   есть манифест и служебный скрипт с обработчиком fetch.

   ГЛАВНОЕ ПРАВИЛО: страницу он НЕ кеширует.
   Запросы навигации уходят в сеть с cache:'no-store' — это обходит и кеш
   браузера, и кеш служебного скрипта. Именно кеш страницы в прошлый раз
   дал чёрный экран и «старую версию». Кешируются только иконки и манифест:
   они не меняются и весят мало.

   При смене CACHE_NAME старые кеши удаляются при активации. */
const CACHE = 'doska-assets-v3';
const ASSETS = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* Страница, версия и данные синхронизации — всегда из сети, мимо кеша.
     cache:'no-store' не даёт браузеру подсунуть старую копию. */
  if (req.mode === 'navigate' ||
      url.pathname.endsWith('index.html') ||
      url.pathname.endsWith('/') ||
      url.pathname.endsWith('ver.txt') ||
      url.pathname.endsWith('rem.json')) {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() =>
        caches.match(req).then(hit => hit || fetch(req))
      )
    );
    return;
  }

  /* Иконки и манифест: из кеша, если он есть, иначе из сети. */
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
