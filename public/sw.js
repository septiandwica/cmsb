import { precacheAndRoute } from 'workbox-precaching';

// Workbox akan inject manifest sini saat build
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener("install", () => {
  console.log("SW installed");
  self.skipWaiting(); // wajib untuk autoUpdate
});

self.addEventListener("activate", (event) => {
  console.log("SW activated");
  event.waitUntil(self.clients.claim());
});

// Push notification handler
self.addEventListener("push", (event) => {
  let data = { title: "CMSB", body: "You have a new update!" };

  try {
    if (event.data) data = event.data.json();
  } catch {
    data = { title: "CMSB", body: event.data?.text() };
  }

  event.waitUntil(
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",

    // 🔥 TRIGGER SUARA DI ANDROID & WINDOWS
    renotify: true,        // penting → kasih tau bahwa notif ini update → bunyi
    tag: "cmsb-alert",     // grouping notif → wajib pasangan renotify
    vibrate: [200, 100, 200], // getar (memicu notifikasi berbunyi di banyak device)

    requireInteraction: false,   // notif auto hide, tapi tetap bunyi
  })
);
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
