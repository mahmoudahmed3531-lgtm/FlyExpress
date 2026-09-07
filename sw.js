// اسم الكاش الجديد مع طابع زمني لفرض التحديث
const CACHE_NAME = 'flyexpress-v3-live';

// الملفات الأساسية المسموح بتخزينها أوفلاين فقط
const PRECACHE_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './stay.png.png'
];

// 1. التثبيت والتخطي الفوري للانتظار
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {});
    })
  );
});

// 2. تفعيل النسخة الجديدة ومسح أي كاش قديم فوراً
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. استراتيجية Network-First: جلب أحدث نسخة من الإنترنت أولاً
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // استثناء صفحة الأدمن تماماً من أي تخزين مؤقت لجلب التحديث المباشر دائماً
  if (url.pathname.includes('admin.html') || url.pathname.includes('counterapi') || url.pathname.includes('ntfy.sh')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // لباقي الصفحات: اطلب من الإنترنت أولاً، وفي حال انقطاع النت تماماً اعرض المخزن
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});