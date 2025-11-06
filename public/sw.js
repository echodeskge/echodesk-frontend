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
  console.log('[ServiceWorker] Push notification received:', event);

  if (!event.data) {
    console.log('[ServiceWorker] Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[ServiceWorker] Push data:', data);

    // Extract notification data
    const notificationTitle = data.title || 'EchoDesk Notification';
    const notificationBody = data.body || data.message || 'You have a new notification';
    const ticketId = data.ticket_id || data.data?.ticket_id;
    const notificationType = data.notification_type || data.type || 'default';

    // Build ticket URL if ticket_id exists
    let ticketUrl = '/';
    if (ticketId) {
      ticketUrl = `/tickets/${ticketId}`;
    }

    const options = {
      body: notificationBody,
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      image: data.image,
      data: {
        url: ticketUrl,
        ticket_id: ticketId,
        notification_type: notificationType,
        notification_id: data.notification_id || data.id,
        ...data.data
      },
      tag: data.tag || `echodesk-${ticketId || 'notification'}`,
      requireInteraction: data.requireInteraction || false,
      vibrate: data.vibrate || [200, 100, 200],
      timestamp: Date.now(),
      // Add actions for quick interactions
      actions: data.actions || [
        {
          action: 'view',
          title: 'View Ticket',
          icon: '/favicon.ico'
        },
        {
          action: 'close',
          title: 'Dismiss',
          icon: '/favicon.ico'
        }
      ],
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, options)
    );
  } catch (error) {
    console.error('[ServiceWorker] Error handling push event:', error);

    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('EchoDesk', {
        body: 'You have a new notification',
        icon: '/favicon.ico',
        data: { url: '/' }
      })
    );
  }
});

// Notification click event handler
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event);
  console.log('[ServiceWorker] Action:', event.action);
  console.log('[ServiceWorker] Notification data:', event.notification.data);

  event.notification.close();

  // Handle action buttons
  if (event.action === 'close') {
    // Just close the notification, do nothing else
    return;
  }

  // For 'view' action or clicking the notification body
  const urlToOpen = event.notification.data?.url || '/';

  // Get the origin from the service worker location
  const baseUrl = self.location.origin;
  const fullUrl = new URL(urlToOpen, baseUrl).href;

  console.log('[ServiceWorker] Opening URL:', fullUrl);

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      console.log('[ServiceWorker] Found', clientList.length, 'client windows');

      // Try to find an existing window to focus
      for (const client of clientList) {
        // Check if this is an EchoDesk window (same origin)
        if (client.url.startsWith(baseUrl)) {
          console.log('[ServiceWorker] Focusing existing window and navigating');
          // Focus the window and navigate to the URL
          return client.focus().then(() => {
            // Navigate the client to the ticket URL
            return client.navigate(fullUrl);
          });
        }
      }

      // No existing window found, open a new one
      console.log('[ServiceWorker] No existing window found, opening new one');
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
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
