// OIKID CRM Service Worker — network-first 策略
// 主要目的:讓 Chrome 顯示「安裝為應用程式」按鈕 + 提供離線 fallback
// 注意:沒有 cache Ragic / OIKID 的 API,那些一定要走 network

const CACHE_VERSION = 'oikid-crm-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(e => console.warn('[SW] 部分資源 cache 失敗:', e)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 只 cache 同 origin 的 GET 請求,而且只 cache static 資源
  // Ragic / OIKID API 一律 network-only
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // network-first → 失敗 fallback cache
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        // 成功就更新 cache
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});
