// TowHub Service Worker — handles push notifications
// This file must be at /public/sw.js

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, icon, badge, url, tag } = data;

  const options = {
    body: body || 'New notification from TowHub',
    icon: icon || '/icons/icon-192x192.png',
    badge: badge || '/icons/badge-72x72.png',
    tag: tag || 'towhub-notification',
    data: { url: url || '/dashboard' },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title || 'TowHub', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url);
    })
  );
});

// Handle background sync (for offline support)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Fetch latest notifications when back online
  try {
    const response = await fetch('/api/notifications');
    if (response.ok) {
      const data = await response.json();
      const unread = (data.notifications || []).filter(n => !n.isRead);
      if (unread.length > 0) {
        self.registration.showNotification(`${unread.length} new notification${unread.length > 1 ? 's' : ''}`, {
          body: unread[0].title,
          tag: 'towhub-sync',
          data: { url: '/dashboard' },
        });
      }
    }
  } catch (e) {}
}
