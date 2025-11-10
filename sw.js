// ================= Cache / Offline =================
const CACHE_NAME = 'momay-cache-vB2';
const API_CACHE_NAME = 'momay-api-cache-v1';
const API_TTL = 24 * 60 * 60 * 1000; // 24 hours
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css?v=2.33',
  '/script.js?v=2.33',
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
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    // Enable navigation preload for faster navigations
    if (self.registration && self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) { /* ignore */ }
    }
    await self.clients.claim();
    // Cleanup old API cache entries based on TTL
    try {
      const apiCache = await caches.open(API_CACHE_NAME);
      const requests = await apiCache.keys();
      const now = Date.now();
      await Promise.all(requests.map(async req => {
        try {
          const url = req.url;
          // Skip meta entries
          if (url.endsWith('::meta')) return;
          const metaReq = new Request(url + '::meta');
          const metaResp = await apiCache.match(metaReq);
          if (!metaResp) return;
          const meta = await metaResp.json().catch(() => null);
          if (!meta || !meta.ts) return;
          if (now - meta.ts > API_TTL) {
            await apiCache.delete(req);
            await apiCache.delete(metaReq);
          }
        } catch (e) { /* ignore per-entry errors */ }
      }));
    } catch (e) { /* ignore cleanup errors */ }
  })());
});

// ---------------- Fetch ----------------
const API_PATHS = ['/daily-energy', '/solar-size', '/daily-bill', '/calendar'];
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== 'GET' || !['http:', 'https:'].includes(requestUrl.protocol)) return;

  // Fast navigation handling: respond with preload -> cache -> network
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      // Try navigation preload response first (fetch started by browser)
      const preloadResp = await event.preloadResponse.catch(() => null);
      if (preloadResp) return preloadResp;

      // Then try cache
      const cachedIndex = await caches.match('/index.html') || await caches.match('/');
      if (cachedIndex) {
        // update cache in background
        event.waitUntil((async () => {
          try {
            const networkResp = await fetch(event.request);
            if (networkResp && networkResp.ok) {
              const cache = await caches.open(CACHE_NAME);
              cache.put('/index.html', networkResp.clone()).catch(() => {});
            }
          } catch (e) { /* ignore */ }
        })());
        return cachedIndex;
      }

      // Fallback to network
      try {
        return await fetch(event.request);
      } catch (err) {
        return caches.match('/index.html');
      }
    })());
    return;
  }

  if (API_PATHS.some(path => requestUrl.pathname.includes(path))) {
    // Network-first สำหรับ API แต่ cache ผลลัพธ์เพื่อ fallback (stale-while-revalidate-ish)
    event.respondWith((async () => {
      try {
          const networkResp = await fetch(event.request.clone());
          if (networkResp && networkResp.ok) {
            // Clone and persist JSON responses for offline fallback
            const ct = networkResp.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const apiCache = await caches.open(API_CACHE_NAME);
              await apiCache.put(event.request, networkResp.clone());
              // store metadata timestamp
              const meta = new Response(JSON.stringify({ ts: Date.now() }), { headers: { 'Content-Type': 'application/json' } });
              await apiCache.put(new Request(event.request.url + '::meta'), meta).catch(() => {});
            }
          }
          return networkResp;
        } catch (e) {
          // Network failed — try cache (respect TTL)
          try {
            const apiCache = await caches.open(API_CACHE_NAME);
            const cached = await apiCache.match(event.request);
            if (cached) {
              const metaResp = await apiCache.match(new Request(event.request.url + '::meta'));
              const meta = metaResp ? await metaResp.json().catch(() => null) : null;
              if (meta && meta.ts && (Date.now() - meta.ts <= API_TTL)) {
                return cached;
              }
            }
          } catch (e2) { /* ignore cache lookup errors */ }
          return new Response(JSON.stringify({ error: 'offline' }), { headers: { 'Content-Type': 'application/json' } });
        }
    })());
    return;
  }

  // Cache-first สำหรับ static files
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Stale-while-revalidate: respond immediately, then update cache in background
        event.waitUntil((async () => {
          try {
            const networkResp = await fetch(event.request);
            if (networkResp && networkResp.ok) {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(event.request, networkResp.clone());
            }
          } catch (e) { /* ignore */ }
        })());
        return cached;
      }

      return fetch(event.request)
        .then(networkResp => {
          if (networkResp && networkResp.ok) {
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, networkResp.clone()))
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
    try { data = event.data.json(); } catch (e) { console.error('❌ Push data parse error', e); }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).then(() => {
      // ส่ง message ไปหน้าเว็บให้ popup แสดง
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'dailyPopup', payload: data });
        });
      });
    })
  );
});

// ---------------- Notification Click ----------------
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const url = new URL(event.notification.data.url, self.location.origin).href;
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ---------------- Push Subscription Change ----------------
self.addEventListener('pushsubscriptionchange', async event => {
  console.log('🔄 Push subscription changed');
  const applicationServerKey = urlBase64ToUint8Array('BB2fZ3NOzkWDKOi8H5jhbwICDTv760wIB6ZD2PwmXcUA_B5QXkXtely4b4JZ5v5b88VX1jKa7kRfr94nxqiksqY');
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
      .then(newSub => fetch('https://momaybackend02-production.up.railway.app/api/subscribe', {
        method: 'POST',
        body: JSON.stringify(newSub),
        headers: { 'Content-Type': 'application/json' }
      }))
  );
});

// ---------------- Utility ----------------
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
