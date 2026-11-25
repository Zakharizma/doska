/* Служебный скрипт — нужен только для установки доски как приложения.
   Chrome на Android даёт «Установить приложение» лишь тогда, когда у сайта
   есть манифест и служебный скрипт с обработчиком fetch. Больше он ни для
   чего не нужен.

   ГЛАВНОЕ ПРАВИЛО: страницу он НЕ трогает.
   Никакого кеширования и подмены index.html — ни при первом заходе, ни при
   обновлении. Именно из-за кеша страницы в прошлый раз получился чёрный
   экран. Здесь запросы навигации уходят в сеть напрямую, наш обработчик к
   ним не прикасается. Кешируются только иконки и манифест — они не меняются
   и весят мало. */
const CACHE = 'doska-assets-v1';
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

  /* Страница, версия и данные синхронизации — только сеть, без нашего
     участия. Обработчик при этом существует, поэтому установка доступна. */
  if (req.mode === 'navigate' ||
      url.pathname.endsWith('index.html') ||
      url.pathname.endsWith('/') ||
      url.pathname.endsWith('ver.txt') ||
      url.pathname.endsWith('rem.json')) {
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
