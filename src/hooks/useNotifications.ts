import { useEffect, useState } from 'react';
import { subscribeNotifs, markNotifRead, markNotifsRead } from '@/services/notifications';
import type { AppNotif, NotifType } from '@/types';
import type { AuthUser } from './useAuth';

export function useNotifications(user: AuthUser | null, orgIds: string[]) {
  const [notifs, setNotifs] = useState<AppNotif[]>([]);

  useEffect(() => {
    if (!user) { setNotifs([]); return; }
    return subscribeNotifs(user.uid, setNotifs);
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const orgSet = new Set(orgIds);
  const relevant = notifs.filter((n) => orgSet.has(n.orgId));
  const unread   = relevant.filter((n) => !n.read);
  const totalUnread = unread.length;

  function unreadCount(orgId: string, type: NotifType): number {
    return unread.filter((n) => n.orgId === orgId && n.type === type).length;
  }

  async function markRead(notifId: string) {
    if (!user) return;
    // Optimistic update
    setNotifs((prev) => prev.map((n) => n.id === notifId ? { ...n, read: true } : n));
    await markNotifRead(user.uid, notifId);
  }

  async function markAllRead(orgId?: string) {
    if (!user) return;
    const ids = unread
      .filter((n) => !orgId || n.orgId === orgId)
      .map((n) => n.id);
    if (ids.length === 0) return;
    setNotifs((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, read: true } : n));
    await markNotifsRead(user.uid, ids);
  }

  return { notifs: relevant, unread, totalUnread, unreadCount, markRead, markAllRead };
}
