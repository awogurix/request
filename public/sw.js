// Service Worker for PWA
const CACHE_NAME = 'radio-request-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/today.html',
  '/playlist.html',
  '/admin.html',
  '/css/style.css',
  '/js/index.js',
  '/js/today.js',
  '/js/playlist.js',
  '/js/admin.js',
  '/manifest.json'
];

// インストール時
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// アクティベーション時
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ時（ネットワーク優先、フォールバックとしてキャッシュ）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // レスポンスをクローンしてキャッシュに保存
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // ネットワークエラー時はキャッシュから返す
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // キャッシュにもない場合
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// プッシュ通知
self.addEventListener('push', (event) => {
  let data = {
    title: 'ラジオ曲リクエスト',
    body: '新しい通知があります',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'radio-request-notification',
    requireInteraction: false
  };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'radio-request-notification',
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ラジオ曲リクエスト', options)
  );
});

// 通知クリック時
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // すでに開いているウィンドウがあればフォーカス
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // なければ新しいウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
