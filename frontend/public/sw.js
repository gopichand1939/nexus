// NEXUS Offline & Push Service Worker
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let data = { title: 'NEXUS', body: 'New encrypted activity' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body || 'You have new private messages in NEXUS.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'nexus-message',
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'NEXUS', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
