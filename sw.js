/* Служебный скрипт для установки доски как приложения.
   Главное правило: страница всегда берётся из сети, кеш — только запасной
   вариант на случай, когда интернета нет. Иначе снова начнётся «старая
   версия из кеша», из-за которой правки будто бы не сохраняются. */
const CACHE = 'doska-v1';
const SHELL = ['./', 'icon-192.png', 'icon-512.png', 'manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(
      ks.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  /* чужие домены (GitHub API, файлы) не трогаем */
  if (url.origin !== location.origin) return;

  /* данные синхронизации и проверка версии — строго из сети */
  if (url.pathname.endsWith('rem.json') || url.pathname.endsWith('ver.txt')) return;

  /* страница и её разметка: сначала сеть, кеш — только если сети нет */
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./')))
  );
});
