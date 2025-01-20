importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUbykaRS-hD_Dn6cbTkJjql5iM3pJDUnU",
  authDomain: "mujbites-aed86.firebaseapp.com",
  projectId: "mujbites-aed86",
  storageBucket: "mujbites-aed86.appspot.com",
  messagingSenderId: "1015444127116",
  appId: "1:1015444127116:web:1fdd4d78d5dea97ba2aaa9",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Cache name and assets to cache
const CACHE_NAME = 'mujbites-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo192.png',
  '/manifest.json',
  '/notificationTone.mp3',
];

// Helper function to check if a request is an API call
const isApiRequest = (url) => {
  return url.includes('/api/');
};

// Helper function to check if a request should be cached
const shouldCache = (url) => {
  // Don't cache:
  // 1. API requests
  // 2. Chrome extension requests
  // 3. Authentication-related endpoints
  return !isApiRequest(url) &&
         !url.startsWith('chrome-extension://') &&
         !url.includes('/login') &&
         !url.includes('/signup');
};

// Install event: Cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets.');
        return cache.addAll(ASSETS_TO_CACHE)
          .catch((error) => {
            console.error('Failed to cache assets:', error);
          });
      })
      .then(() => self.skipWaiting()) // Activate the service worker immediately
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim()) // Take control of all clients
  );
});

// Fetch event: Handle requests with proper partial response handling
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // For API requests, bypass cache completely
  if (isApiRequest(url.href)) {
    event.respondWith(
      fetch(event.request)
        .catch(error => {
          console.error('API request failed:', error);
          throw error;
        })
    );
    return;
  }

  // For static assets that should be cached
  if (shouldCache(url.href)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(event.request)
            .then(response => {
              // Don't cache error responses or partial content
              if (!response || !response.ok || response.status === 206) {
                return response;
              }

              // Clone the response for caching
              const responseToCache = response.clone();

              // Skip caching if it's a partial response (has content-range header)
              if (responseToCache.headers.get('content-range')) {
                return response;
              }

              // Cache the response
              caches.open(CACHE_NAME)
                .then(cache => {
                  try {
                    cache.put(event.request, responseToCache);
                  } catch (error) {
                    console.warn('Failed to cache response:', error);
                  }
                })
                .catch(error => {
                  console.error('Cache operation failed:', error);
                });

              return response;
            })
            .catch(error => {
              console.error('Fetch failed:', error);
              throw error;
            });
        })
    );
    return;
  }

  // For all other requests, try network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: data,
      vibrate: [200, 100, 200], // Vibration pattern for mobile devices
      timestamp: Date.now(), // Timestamp for the notification
    };

    try {
      // Play notification sound
      const audio = new Audio('/notificationTone.mp3');
      audio.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });

      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }
});

// Handle background messages from Firebase
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'New Order Received';
  const notificationOptions = {
    body: payload.notification?.body || 'A new order has been placed at your restaurant.',
    icon: payload.notification?.icon || '/logo192.png',
    badge: payload.notification?.badge || '/logo192.png',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
  };

  self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log('Background notification shown successfully.');
    })
    .catch((error) => {
      console.error('Error showing background notification:', error);
    });
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Handle the click event
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(windowClients => {
          // Check if there's already a window open with the target URL
          for (const client of windowClients) {
            if (client.url === event.notification.data.url && 'focus' in client) {
              return client.focus();
            }
          }
          // If no window is open, open a new one
          return clients.openWindow(event.notification.data.url);
        })
    );
  }
});

// Listen for logout event to clear cache
self.addEventListener('message', (event) => {
  if (event.data === 'logout') {
    console.log('Logout event received. Clearing cache...');
    caches.delete(CACHE_NAME)
      .then(() => {
        console.log('Cache cleared successfully.');
        // Notify all clients that cache has been cleared
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      })
      .catch((error) => {
        console.error('Failed to clear cache:', error);
      });
  }
});

// Handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('Background sync triggered:', event.tag);
    event.waitUntil(
      // Implement your sync logic here
      new Promise((resolve, reject) => {
        try {
          // Add your sync implementation
          resolve();
        } catch (error) {
          console.error('Sync failed:', error);
          reject(error);
        }
      })
    );
  }
});