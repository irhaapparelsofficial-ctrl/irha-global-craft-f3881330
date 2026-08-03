self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "Owner attention required" };
  }

  const title = typeof payload.title === "string" ? payload.title : "Irha Apparels";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "Owner attention required",
    icon: typeof payload.icon === "string" ? payload.icon : "/icon-512x512.png",
    badge: typeof payload.badge === "string" ? payload.badge : "/icon-512x512.png",
    tag: typeof payload.tag === "string" ? payload.tag : "irha-owner-alert",
    renotify: true,
    requireInteraction: payload.kind === "live_chat" || payload.kind === "site_visitor",
    timestamp: Number(payload.timestamp) || Date.now(),
    data: {
      url: typeof payload.url === "string" ? payload.url : "/admin",
      kind: typeof payload.kind === "string" ? payload.kind : "system",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(Promise.resolve());
});
