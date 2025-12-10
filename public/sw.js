// Push notification handlers - imported by Workbox SW
// DO NOT add install/activate handlers here - they conflict with Workbox

self.addEventListener('push', function(event) {
  console.log('[Push SW] Push event received!');
  
  let data = {
    title: 'Nuova Notifica',
    body: 'Hai ricevuto una nuova notifica',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[Push SW] Payload:', JSON.stringify(payload));
      data = { ...data, ...payload };
    } catch (e) {
      console.log('[Push SW] Text data:', event.data.text());
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    tag: data.tag || 'push-' + Date.now(),
    renotify: true,
    requireInteraction: true
  };

  console.log('[Push SW] Showing notification:', data.title);
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => console.log('[Push SW] Notification shown successfully'))
      .catch(err => console.error('[Push SW] Failed to show notification:', err))
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Push SW] Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('[Push SW] Notification closed');
});

console.log('[Push SW] Push notification handlers loaded');
