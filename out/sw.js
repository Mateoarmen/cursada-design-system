// Cursada — Service Worker. Servido desde la raíz del sitio a propósito
// (mismo directorio que index.html/Cursada.html) para tener scope sobre
// toda la app. El registro en runtime.js usa `updateViaCache:'none'`, así
// que el navegador nunca sirve este archivo desde caché HTTP al chequear
// actualizaciones — no depende de configurar Cache-Control en el hosting.

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  var title = data.title || 'Cursada';
  var options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge.png',
    // Mismo tag = misma notificación en vez de apilarse (dos avisos de la
    // misma entidad, ej. reprogramado, se reemplazan en vez de duplicar).
    tag: data.tag || undefined,
    data: { url: data.url || '/Cursada' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || '/Cursada';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientsList) {
      for (var i = 0; i < clientsList.length; i++) {
        var c = clientsList[i];
        if (c.url.indexOf('/Cursada') >= 0 && 'focus' in c) {
          c.postMessage({ type: 'cursada-notification-click', url: targetUrl });
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
