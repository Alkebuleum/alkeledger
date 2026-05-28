import { useState, useCallback } from 'react';
import { getToken, getMessaging } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { USE_MOCK_DATA, app, db, VAPID_KEY } from '@/lib/firebase';
import type { AuthUser } from './useAuth';

export type PushPermission = 'default' | 'granted' | 'denied';

export function usePushNotifications(user: AuthUser | null) {
  const [permission, setPermission] = useState<PushPermission>(
    typeof Notification !== 'undefined' ? (Notification.permission as PushPermission) : 'default',
  );

  const requestPush = useCallback(async (): Promise<boolean> => {
    if (!user || USE_MOCK_DATA || !db || !app || !VAPID_KEY) return false;
    if (typeof Notification === 'undefined') return false;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== 'granted') return false;

      await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const sw = await navigator.serviceWorker.ready;

      const fcmMessaging = getMessaging(app);
      const token = await getToken(fcmMessaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
      if (!token) return false;

      await updateDoc(doc(db, 'users', user.uid), { fcmTokens: arrayUnion(token) });
      return true;
    } catch {
      return false;
    }
  }, [user]);

  return { permission, requestPush };
}
