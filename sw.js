// ================= Cache / Offline =================
const CACHE_NAME = 'momay-cache-vB1.5'; // เปลี่ยนเวอร์ชันเมื่ออัปเดต

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css?v=2',
  '/script.js?v=2',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ---------------- Install ----------------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(err => console.error('❌ Cache install failed:', err))
  );
});

// ---------------- Activate ----------------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ---------------- Fetch ----------------
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== 'GET' || !['http:', 'https:'].includes(requestUrl.protocol)) return;

  // ---- Network-first สำหรับ API requests ----
  if (
    requestUrl.pathname.startsWith('/daily-energy') ||
    requestUrl.pathname.startsWith('/solar-size') ||
    requestUrl.pathname.startsWith('/daily-bill')
  ) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          if (!resp.ok) throw new Error('Network response not ok');
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ---- Cache-first สำหรับ static files ----
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(networkResp => {
          if (networkResp && networkResp.ok) {
            const copy = networkResp.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, copy))
              .catch(err => console.warn('❌ Cache put failed:', err));
          }
          return networkResp;
        })
        .catch(err => {
          console.warn('❌ Fetch failed:', err);
          if (event.request.mode === 'navigate') return caches.match('/index.html');
          return new Response('', { status: 504, statusText: 'offline' });
        })
    })
  );
});

// ================= Push Notification =================
self.addEventListener('push', event => {
  let data = { title: 'Energy Notification', body: 'แจ้งเตือนการใช้ไฟฟ้าสูงสุดใหม่', url: '/' };
  if (event.data) {
    try { data = event.data.json(); } 
    catch (e) { console.error('❌ Push data parse error', e); }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
    requireInteraction: true
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ---------------- Notification Click ----------------
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(event.notification.data.url) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});
