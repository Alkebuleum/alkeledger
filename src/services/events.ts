import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  orderBy, query, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { USE_MOCK_DATA, db } from '@/lib/firebase';
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
  if (USE_MOCK_DATA) return mockEvents.filter((e) => e.orgId === orgId);
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
  if (USE_MOCK_DATA) {
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
  return { ...event, id: ref.id };
}

export async function updateEvent(
  orgId: string,
  eventId: string,
  data: Partial<Pick<OrgEvent, 'title' | 'description' | 'location' | 'startDate' | 'endDate' | 'allDay' | 'cancelled'>>,
): Promise<void> {
  if (USE_MOCK_DATA) {
    mockEvents = mockEvents.map((e) => e.id === eventId ? { ...e, ...data } : e);
    return;
  }
  if (!db) return;
  await updateDoc(doc(eventsCol(orgId), eventId), data as Record<string, unknown>);
}

export async function deleteEvent(orgId: string, eventId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    mockEvents = mockEvents.filter((e) => e.id !== eventId);
    return;
  }
  if (!db) return;
  await deleteDoc(doc(eventsCol(orgId), eventId));
}

export async function setRsvp(
  orgId: string,
  eventId: string,
  userId: string,
  name: string,
  status: RsvpStatus,
): Promise<void> {
  const rsvp = { name, status, respondedAt: new Date().toISOString() };
  if (USE_MOCK_DATA) {
    mockEvents = mockEvents.map((e) =>
      e.id === eventId ? { ...e, rsvps: { ...e.rsvps, [userId]: rsvp } } : e,
    );
    return;
  }
  if (!db) return;
  await updateDoc(doc(eventsCol(orgId), eventId), { [`rsvps.${userId}`]: rsvp });
}
