importScripts('/__/firebase/10.12.2/firebase-app-compat.js');
importScripts('/__/firebase/10.12.2/firebase-messaging-compat.js');
importScripts('/__/firebase/init.js');

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  const link = payload.fcmOptions?.link ?? '/';
  self.registration.showNotification(title ?? 'Scribb', {
    body: body ?? '',
    icon: '/icon.png',
    badge: '/icon.png',
    data: { link },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(link));
        }
      }
      return clients.openWindow(link);
    })
  );
});
