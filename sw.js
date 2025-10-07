// ================= Service Worker =================

// เปลี่ยนชื่อ cache เป็นเวอร์ชันใหม่ทุกครั้งอัปเดต
const CACHE_NAME = 'momay-cache-v3';

// ใส่ versioned URL สำหรับ CSS/JS เพื่อให้ browser โหลดไฟล์ใหม่
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
      .then(() => self.skipWaiting()) // ใช้ SW ใหม่ทันที
  );
});

// ---------------- Activate ----------------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME) // ลบ cache เก่าทั้งหมด
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // ให้ SW ใหม่ควบคุม client ทันที
  );
});

// ---------------- Fetch ----------------
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // เฉพาะ GET และ http/https
  if (event.request.method !== 'GET' || !['http:', 'https:'].includes(requestUrl.protocol)) return;

  // Network-first สำหรับ API
  if (
    requestUrl.pathname.startsWith('/daily-energy') ||
    requestUrl.pathname.startsWith('/solar-size') ||
    requestUrl.pathname.startsWith('/daily-bill')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first สำหรับ static assets (HTML, CSS, JS, icons)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(networkResp => {
          if (networkResp && networkResp.ok) {
            const copy = networkResp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return networkResp;
        })
        .catch(() => {
          // fallback สำหรับ navigation
          if (event.request.mode === 'navigate') return caches.match('/index.html');
          return new Response("", { status: 504, statusText: 'offline' });
        });
    })
  );
});
