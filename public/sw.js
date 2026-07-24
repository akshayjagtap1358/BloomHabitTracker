// Bloom Service Worker — enables PWA install + offline
const CACHE = "bloom-v1";
const ASSETS = ["/", "/index.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Handle push notifications
self.addEventListener("push", e => {
  const data = e.data?.json() || { title: "Bloom", body: "Time to check your habits! 🌿" };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: "bloom-reminder",
    renotify: true,
  }));
});

// Handle notification click
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.openWindow("/"));
});

// Handle scheduled local alarm (message from app)
self.addEventListener("message", e => {
  if (e.data?.type === "SCHEDULE_NOTIFICATION") {
    const { title, body, delay } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body, icon: "/favicon.svg", tag: "bloom-reminder", renotify: true,
      });
    }, delay);
  }
});
