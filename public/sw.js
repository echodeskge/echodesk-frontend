// Service Worker for Push Notifications
const CACHE_NAME = 'echodesk-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push event handler
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/logo-svg.svg',
      badge: data.badge || '/logo-svg.svg',
      image: data.image,
      data: data.data || {},
      tag: data.tag || 'echodesk-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      vibrate: data.vibrate || [200, 100, 200],
      timestamp: Date.now(),
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'EchoDesk Notification',
        options
      )
    );
  } catch (error) {
    console.error('Error handling push event:', error);

    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('EchoDesk', {
        body: 'You have a new notification',
        icon: '/logo-svg.svg',
      })
    );
  }
});

// Notification click event handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window if no matching window found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

// Fetch event for offline support (optional)
self.addEventListener('fetch', (event) => {
  // Let the browser handle all fetch events
  // You can add caching strategies here if needed
});
