const CACHE_NAME = 'dating-app-cache-v2';
const STATIC_CACHE = 'static-cache-v2';
const DYNAMIC_CACHE = 'dynamic-cache-v2';
const urlsToCache = [
  '/',
  '/index.php',
  '/offline.html',
  '/assets/css/main.css',
  '/assets/css/mainpage.css',
  '/assets/css/toastr.css',
  '/assets/css/owl.carousel.min.css',
  '/assets/css/owl.theme.default.min.css',
  '/assets/css/viewer.css',
  '/assets/css/jqupload.css',
  '/assets/js/jquery-1.12.4.min.js',
  '/assets/js/bootstrap.min.js',
  '/assets/js/toastr.js',
  '/assets/js/owl.carousel.min.js',
  '/assets/js/viewer.js',
  '/assets/js/jquery-viewer.min.js',
  '/assets/js/moment.js',
  '/assets/js/jqupload.js',
  '/assets/image/icon-192x192.png',
  '/assets/image/icon-512x512.png',
  '/controllers/home.php'
];


const DYNAMIC_CACHE_LIMIT = 50;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((key) => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, response.clone());
              limitCacheSize(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        return caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      }).catch(() => caches.match('/offline.html'));
    })
  );
});

function limitCacheSize(cacheName, maxItems) {
  caches.open(cacheName).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => limitCacheSize(cacheName, maxItems));
      }
    });
  });
}

self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/images/icon-192x192.png',
    badge: '/images/icon-192x192.png',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(data.title || 'New Message', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});