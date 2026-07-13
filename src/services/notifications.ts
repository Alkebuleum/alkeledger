import {
  collection, doc, orderBy, limit, query,
  onSnapshot, updateDoc, writeBatch,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { USE_MOCK_DATA, db, app } from '@/lib/firebase';
import { isDemoOrgId } from '@/lib/demo';
import type { AppNotif, NotifType } from '@/types';

function notifsCol(uid: string) {
  return collection(db!, 'users', uid, 'notifications');
}

export function subscribeNotifs(
  uid: string,
  cb: (notifs: AppNotif[]) => void,
): () => void {
  if (USE_MOCK_DATA || !db) { cb([]); return () => {}; }
  const q = query(notifsCol(uid), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id } as AppNotif))),
    () => cb([]),
  );
}

export async function markNotifRead(uid: string, notifId: string): Promise<void> {
  if (USE_MOCK_DATA || !db) return;
  await updateDoc(doc(notifsCol(uid), notifId), { read: true });
}

export async function markNotifsRead(uid: string, notifIds: string[]): Promise<void> {
  if (USE_MOCK_DATA || !db || notifIds.length === 0) return;
  const batch = writeBatch(db);
  notifIds.forEach((id) => batch.update(doc(notifsCol(uid), id), { read: true }));
  await batch.commit();
}

export async function notifyCreated(
  orgId: string,
  type: NotifType,
  title: string,
  body: string,
  link: string,
): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId) || !app) return;
  try {
    await httpsCallable(getFunctions(app), 'createNotifications')({
      orgId, type, title, body, link,
    });
  } catch { /* best-effort */ }
}
