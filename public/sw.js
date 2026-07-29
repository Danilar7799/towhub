// TowHub Service Worker — handles push notifications
// This file must be at /public/sw.js

const CACHE_NAME = "towhub-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate - claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, icon, badge, url, tag, vibrate, actions, data: customData } = data;

    const options: NotificationOptions = {
      body: body || "New notification from TowHub",
      icon: icon || "/icons/icon-192.png",
      badge: badge || "/icons/badge-72.png",
      tag: tag || "towhub-notification",
      data: { url: url || "/dashboard", ...customData },
      vibrate: vibrate || [200, 100, 200],
      actions: actions || [
        { action: "open", title: "View" },
        { action: "dismiss", title: "Dismiss" },
      ],
      requireInteraction: true,
    };

    event.waitUntil(
      self.registration.showNotification(title || "TowHub", options)
    );
  } catch (err) {
    console.error("[SW] Push parse error:", err);
    event.waitUntil(
      self.registration.showNotification("TowHub", {
        body: event.data.text(),
        tag: "towhub-notification",
      })
    );
  }
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes("/dashboard") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});

// Handle background sync (for offline support)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-notifications") {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    const response = await fetch("/api/notifications?unread=true");
    if (response.ok) {
      const data = await response.json();
      const unread = (data.notifications || []).filter((n: any) => !n.isRead);
      if (unread.length > 0) {
        await self.registration.showNotification(`${unread.length} new notification${unread.length > 1 ? "s" : ""}`, {
          body: unread[0].title,
          tag: "towhub-sync",
          data: { url: "/dashboard" },
        });
      }
    }
  } catch (err) {
    console.error("[SW] Sync failed:", err);
  }
}

// Fetch handler for offline caching (optional)
self.addEventListener("fetch", (event) => {
  // Only cache GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((response) => {
        // Don't cache non-success or opaque responses
        if (!response.ok || response.type === "opaque") return response;

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});