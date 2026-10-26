self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Presence of a fetch handler is what makes the site installable.
  // Requests stay on the network so the existing site is unchanged.
});
