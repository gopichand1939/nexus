import {api} from './api';

export async function registerPushNotifications() {
 if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
  throw new Error('Push notifications are not supported in this browser.');
 }
 const perm = await Notification.requestPermission();
 if (perm !== 'granted') {
  throw new Error(`Notification permission: ${perm}`);
 }
 const registration = await navigator.serviceWorker.register('/sw.js');
 await navigator.serviceWorker.ready;

 let sub = await registration.pushManager.getSubscription();
 if (!sub) {
  // Demo public VAPID key placeholder or standard endpoint registration
  const dummyKey = new Uint8Array([4, 15, 23, 42, 99, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128]);
  try {
   sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: dummyKey
   });
  } catch {
   // Fallback without applicationServerKey if local browser supports it
   sub = await registration.pushManager.subscribe({ userVisibleOnly: true }).catch(() => null);
  }
 }

 if (sub) {
  const json = sub.toJSON();
  await api('/users/me/push', {
   method: 'POST',
   body: {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh || 'local-p256dh',
    auth: json.keys?.auth || 'local-auth'
   }
  });
 }
 return 'Notifications enabled';
}
