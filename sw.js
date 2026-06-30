// School Connect Service Worker — offline + push
const CACHE = 'sc-cache-2026-06-27-r2';
const CORE = ['./','./index.html','./login.html','./dashboard.html','./offline.html','./assets/css/style.css','./assets/js/config.js','./assets/js/app.js','./assets/js/notifications.js','./assets/js/voting.js','./assets/js/pwa-install.js','./assets/js/super.js','./assets/js/site-help.js','./assets/js/cbt-engine.js','./assets/js/analytics.js','./assets/js/enterprise.js','./assets/js/crud.js','./assets/img/logo.png','./manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        const copy = res.clone();
        if (res.ok && (e.request.url.startsWith(self.location.origin))) {
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => {
        if (cached) return cached;
        if (e.request.mode === 'navigate') return caches.match('./offline.html');
        return Promise.reject(new Error('offline'));
      });
      return cached || network;
    })
  );
});
self.addEventListener('push', e => {
  let data = { title: 'School Connect', body: 'You have a new notification' };
  try { if (e.data) data = Object.assign(data, e.data.json()); } catch (_) {}
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: 'assets/img/logo.png', badge: 'assets/img/logo.png',
    data: data, vibrate: [200,100,200], tag: data.tag || 'sc-' + Date.now()
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) { if (c.url.includes(url)) return c.focus(); }
    return clients.openWindow(url);
  }));
});
