import {
  collection, doc, getDocs, addDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { USE_MOCK_DATA, db } from '@/lib/firebase';
import { MOCK_ANNOUNCEMENTS } from '@/data/mock';
import type { Announcement, AnnouncementPriority } from '@/types';

let mockAnnouncements = [...MOCK_ANNOUNCEMENTS];

export async function listAnnouncements(orgId: string): Promise<Announcement[]> {
  if (USE_MOCK_DATA) return mockAnnouncements.filter((a) => a.orgId === orgId);
  if (!db) return [];

  const snap = await getDocs(
    query(
      collection(db, 'organizations', orgId, 'announcements'),
      orderBy('createdAt', 'desc'),
    )
  );

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      orgId,
      title: data.title as string,
      body: data.body as string,
      date: data.date as string,
      priority: (data.priority as AnnouncementPriority) ?? 'normal',
      createdBy: data.createdBy as string,
      createdByUid: data.createdByUid as string | undefined,
    };
  });
}

export async function createAnnouncement(
  orgId: string,
  data: { title: string; body: string; priority: AnnouncementPriority; createdBy: string; createdByUid?: string },
): Promise<Announcement> {
  const date = new Date().toISOString().slice(0, 10);
  const ann: Announcement = {
    id: 'a_' + Math.random().toString(36).slice(2, 8),
    orgId,
    title: data.title,
    body: data.body,
    date,
    priority: data.priority,
    createdBy: data.createdBy,
    createdByUid: data.createdByUid,
  };

  if (USE_MOCK_DATA) {
    mockAnnouncements = [ann, ...mockAnnouncements];
    return ann;
  }
  if (!db) return ann;

  const ref = await addDoc(collection(db, 'organizations', orgId, 'announcements'), {
    title: data.title,
    body: data.body,
    date,
    priority: data.priority,
    createdBy: data.createdBy,
    createdByUid: data.createdByUid ?? null,
    createdAt: serverTimestamp(),
  });

  return { ...ann, id: ref.id };
}

export async function deleteAnnouncement(orgId: string, announcementId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    mockAnnouncements = mockAnnouncements.filter((a) => a.id !== announcementId);
    return;
  }
  if (!db) return;
  await deleteDoc(doc(db, 'organizations', orgId, 'announcements', announcementId));
}
