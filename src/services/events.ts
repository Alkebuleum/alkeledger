import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  orderBy, query, serverTimestamp, Timestamp, deleteField,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { USE_MOCK_DATA, db, app, storage } from '@/lib/firebase';
import { isDemoOrgId } from '@/lib/demo';
import type { OrgEvent, RsvpStatus } from '@/types';

let mockEvents: OrgEvent[] = [];

function eventsCol(orgId: string) {
  return collection(db!, 'organizations', orgId, 'events');
}

function toEvent(id: string, data: Record<string, unknown>): OrgEvent {
  return {
    ...(data as unknown as OrgEvent),
    id,
    createdAt: data.createdAt instanceof Timestamp
      ? (data.createdAt as Timestamp).toDate().toISOString().slice(0, 10)
      : (data.createdAt as string ?? ''),
  };
}

export async function listEvents(orgId: string): Promise<OrgEvent[]> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) return mockEvents.filter((e) => e.orgId === orgId);
  if (!db) return [];
  const snap = await getDocs(query(eventsCol(orgId), orderBy('startDate', 'asc')));
  return snap.docs.map((d) => toEvent(d.id, d.data()));
}

export async function createEvent(
  orgId: string,
  data: Omit<OrgEvent, 'id' | 'orgId' | 'createdAt' | 'rsvps'>,
): Promise<OrgEvent> {
  const event: OrgEvent = {
    ...data,
    id: 'ev_' + Math.random().toString(36).slice(2, 9),
    orgId,
    createdAt: new Date().toISOString().slice(0, 10),
    rsvps: {},
  };
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockEvents = [event, ...mockEvents];
    return event;
  }
  if (!db) return event;
  const ref = await addDoc(eventsCol(orgId), {
    ...data,
    orgId,
    rsvps: {},
    createdAt: serverTimestamp(),
  });
  const created = { ...event, id: ref.id };
  return created;
}

export async function updateEvent(
  orgId: string,
  eventId: string,
  data: Partial<Pick<OrgEvent, 'title' | 'description' | 'location' | 'startDate' | 'endDate' | 'allDay' | 'cancelled'>> & {
    // null clears an existing image; undefined/omitted leaves it untouched
    imageUrl?: string | null;
    imageStoragePath?: string | null;
  },
): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockEvents = mockEvents.map((e) => {
      if (e.id !== eventId) return e;
      const next: OrgEvent = { ...e, ...data } as OrgEvent;
      if (data.imageUrl === null) delete next.imageUrl;
      if (data.imageStoragePath === null) delete next.imageStoragePath;
      return next;
    });
    return;
  }
  if (!db) return;
  const payload: Record<string, unknown> = { ...data };
  if (data.imageUrl === null) payload.imageUrl = deleteField();
  if (data.imageStoragePath === null) payload.imageStoragePath = deleteField();
  await updateDoc(doc(eventsCol(orgId), eventId), payload);
}

/**
 * Cover image for an event. Own storage namespace (not `events/`, which
 * doesn't exist as a Storage path) keyed by a generated image id rather than
 * the event id, since a new event's id isn't known until after `createEvent`
 * returns — same reasoning as `uploadLedgerDocument` in `services/documents.ts`.
 */
export async function uploadEventImage(orgId: string, file: File): Promise<{ url: string; storagePath: string }> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    return { url: 'mock://event-image', storagePath: `event-images/${orgId}/mock/${file.name}` };
  }
  if (!storage) throw new Error('Firebase not initialized');
  const imgId       = 'evimg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const storagePath = `event-images/${orgId}/${imgId}/${file.name}`;
  const storageRef  = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, storagePath };
}

export async function deleteEventImage(storagePath: string): Promise<void> {
  if (USE_MOCK_DATA || !storage) return;
  try { await deleteObject(ref(storage, storagePath)); } catch { /* already gone */ }
}

export async function deleteEvent(orgId: string, eventId: string): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockEvents = mockEvents.filter((e) => e.id !== eventId);
    return;
  }
  if (!db) return;
  await deleteDoc(doc(eventsCol(orgId), eventId));
}

export async function notifyEventMembers(
  orgId: string,
  eventId: string,
  event: Pick<OrgEvent, 'title' | 'startDate' | 'endDate' | 'allDay' | 'location' | 'description'>,
): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId) || !app) return;
  await httpsCallable(getFunctions(app), 'notifyEventCreated')({ orgId, eventId, event });
}

export async function setRsvp(
  orgId: string,
  eventId: string,
  userId: string,
  name: string,
  status: RsvpStatus,
): Promise<void> {
  const rsvp = { name, status, respondedAt: new Date().toISOString() };
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockEvents = mockEvents.map((e) =>
      e.id === eventId ? { ...e, rsvps: { ...e.rsvps, [userId]: rsvp } } : e,
    );
    return;
  }
  if (!db) return;
  await updateDoc(doc(eventsCol(orgId), eventId), { [`rsvps.${userId}`]: rsvp });
}
