import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, X, MapPin, Clock, Pencil, Trash2, CalendarDays, Users, ChevronDown, ChevronUp, Link2, Mail, MessageCircle } from 'lucide-react';
import { listEvents, createEvent, updateEvent, deleteEvent, setRsvp, notifyEventMembers } from '@/services/events';
import { can, useRole } from '@/hooks/useRole';
import type { OrgEvent, Organization, RsvpStatus } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  user: AuthUser;
}

function copyShareLink(orgSlug: string, type: 'event' | 'announcement', id: string, setCopied: (v: boolean) => void) {
  const url = type === 'event'
    ? `${window.location.origin}/e/${id}`
    : `${window.location.origin}/share/${orgSlug}/${type}/${id}`;
  navigator.clipboard.writeText(url).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
}

function shareEvent(event: OrgEvent, orgName: string) {
  const url    = `${window.location.origin}/e/${event.id}`;
  const text   = `${orgName} is inviting you to an event on AlkeLedger. Tap below to view the details and confirm your RSVP.\n\n${url}`;
  const waUrl  = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (navigator.share && isMobile) {
    navigator.share({ title: 'Event Invite', text }).catch(() => window.open(waUrl, '_blank'));
  } else {
    window.open(waUrl, '_blank');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso: string): { month: string; day: string; time: string; full: string } {
  const d = new Date(iso);
  return {
    month: MONTHS[d.getMonth()],
    day:   String(d.getDate()),
    time:  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    full:  d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  };
}

function formatRange(startDate: string, endDate?: string, allDay?: boolean): string {
  const s = new Date(startDate);
  if (allDay) return 'All day';
  const start = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${start} – ${end}`;
}

function isPast(event: OrgEvent): boolean {
  const end = event.endDate ?? event.startDate;
  return new Date(end) < new Date();
}

const RSVP_OPTIONS: { value: RsvpStatus; label: string; active: string; idle: string }[] = [
  { value: 'attending', label: 'Attending', active: 'bg-emerald-600 text-white',  idle: 'bg-white text-stone-600 border-stone-300 hover:border-emerald-400 hover:text-emerald-700' },
  { value: 'maybe',     label: 'Maybe',     active: 'bg-amber-500 text-white',    idle: 'bg-white text-stone-600 border-stone-300 hover:border-amber-400 hover:text-amber-600' },
  { value: 'declining', label: 'Declining', active: 'bg-stone-500 text-white',    idle: 'bg-white text-stone-600 border-stone-300 hover:border-stone-400' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Events({ org, user }: Props) {
  const role = useRole(org.id, user.uid);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<OrgEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const reload = () => {
    setLoading(true);
    listEvents(org.id).then((evs) => {
      setEvents(evs.sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, [org.id]);

  // Auto-RSVP from shared link: ?openEvent=<id>&rsvp=<status>
  useEffect(() => {
    if (loading) return;
    const openEventId = searchParams.get('openEvent');
    const rsvpStatus  = searchParams.get('rsvp') as RsvpStatus | null;
    if (!openEventId || !rsvpStatus) return;
    if (!(['attending', 'maybe', 'declining'] as string[]).includes(rsvpStatus)) return;
    const ev = events.find((e) => e.id === openEventId);
    if (!ev || isPast(ev) || ev.cancelled) return;
    setSearchParams({}, { replace: true });
    setRsvp(org.id, openEventId, user.uid, user.displayName, rsvpStatus).then(reload).catch(() => {});
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (ev: OrgEvent) => {
    if (!confirm(`Delete "${ev.title}"?`)) return;
    await deleteEvent(org.id, ev.id);
    reload();
  };

  const handleRsvp = async (ev: OrgEvent, status: RsvpStatus) => {
    const current = ev.rsvps?.[user.uid]?.status;
    if (current === status) return;
    await setRsvp(org.id, ev.id, user.uid, user.displayName, status);
    reload();
  };

  const isAdmin = can.announce(role);
  const isPro   = org.plan === 'pro';

  const upcoming = events.filter((e) => !isPast(e) && !e.cancelled);
  const past      = events.filter((e) => isPast(e) || !!e.cancelled);

  return (
    <div className="p-4 sm:p-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono">§ Calendar</div>
          <h2 className="font-display text-2xl mt-0.5">Events & Meetings</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-3 py-2 bg-stone-900 text-stone-50 text-sm font-medium flex items-center gap-1.5 hover:bg-stone-800"
          >
            <Plus className="w-4 h-4" /> New event
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-stone-400 text-sm">Loading…</div>
      ) : events.length === 0 ? (
        <div className="py-16 text-center text-stone-400">
          <CalendarDays className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No events scheduled yet.</p>
          {isAdmin && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="mt-3 text-sm text-stone-600 underline"
            >
              Schedule the first one
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-stone-500">
                Upcoming · {upcoming.length}
              </h3>
              {upcoming.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  userId={user.uid}
                  orgSlug={org.slug ?? org.id}
                  orgName={org.name}
                  isAdmin={isAdmin}
                  isPro={isPro}
                  onRsvp={(s) => handleRsvp(ev, s)}
                  onEdit={() => { setEditing(ev); setShowForm(true); }}
                  onDelete={() => handleDelete(ev)}
                  onNotify={() => notifyEventMembers(org.id, ev.id, {
                    title: ev.title, startDate: ev.startDate, endDate: ev.endDate,
                    allDay: ev.allDay, location: ev.location, description: ev.description,
                  })}
                />
              ))}
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <PastSection
              events={past}
              userId={user.uid}
              orgSlug={org.slug ?? org.id}
              orgName={org.name}
              isAdmin={isAdmin}
              isPro={isPro}
              onEdit={(ev) => { setEditing(ev); setShowForm(true); }}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}

      {showForm && (
        <EventModal
          org={org}
          user={user}
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={reload}
        />
      )}
    </div>
  );
}

// ─── EventCard ────────────────────────────────────────────────────────────────

type NotifyState = 'idle' | 'confirm' | 'sending' | 'sent' | 'error';

function EventCard({
  event, userId, orgSlug, orgName, isAdmin, isPro, onRsvp, onEdit, onDelete, onNotify,
}: {
  event: OrgEvent;
  userId: string;
  orgSlug: string;
  orgName: string;
  isAdmin: boolean;
  isPro: boolean;
  onRsvp: (s: RsvpStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  onNotify?: () => Promise<void>;
}) {
  const [showAttendees, setShowAttendees] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notifyState, setNotifyState] = useState<NotifyState>('idle');
  const past = isPast(event);

  const handleNotifyConfirm = async () => {
    if (!onNotify) return;
    setNotifyState('sending');
    try {
      await onNotify();
      setNotifyState('sent');
      setTimeout(() => setNotifyState('idle'), 4000);
    } catch {
      setNotifyState('error');
      setTimeout(() => setNotifyState('idle'), 4000);
    }
  };
  const fmt  = formatDate(event.startDate);
  const myRsvp = event.rsvps?.[userId]?.status ?? null;

  const rsvpCounts = Object.values(event.rsvps ?? {}).reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; },
    {} as Record<RsvpStatus, number>,
  );

  const attendees = Object.entries(event.rsvps ?? {}).sort(([, a], [, b]) =>
    a.status.localeCompare(b.status),
  );

  return (
    <article className={`bg-white border border-stone-200 rounded-lg overflow-hidden ${event.cancelled ? 'opacity-60' : ''}`}>
      <div className="p-5">
        <div className="flex gap-4">
          {/* Date badge */}
          <div className="shrink-0 w-14 text-center">
            <div className="text-[10px] uppercase tracking-widest font-mono text-stone-400">{fmt.month}</div>
            <div className="text-3xl font-display text-stone-900 leading-none">{fmt.day}</div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                {event.cancelled && (
                  <span className="text-[10px] uppercase tracking-widest font-mono text-red-500 mr-2">Cancelled</span>
                )}
                <h3 className="font-display text-xl text-stone-900 leading-snug">{event.title}</h3>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => copyShareLink(orgSlug, 'event', event.id, setCopied)}
                  title="Copy share link"
                  className="p-1.5 rounded text-stone-300 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  {copied
                    ? <span className="text-[10px] text-emerald-600 font-mono">Copied!</span>
                    : <Link2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => shareEvent(event, orgName)}
                  title="Share event"
                  className="p-1.5 rounded text-stone-300 hover:text-[#25D366] hover:bg-emerald-50 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
                {isAdmin && !past && (
                  <>
                    <button
                      onClick={() => isPro ? setNotifyState('confirm') : undefined}
                      title={isPro ? 'Email members about this event' : 'Pro feature — upgrade to send event emails'}
                      className={`p-1.5 rounded transition-colors ${
                        isPro
                          ? 'text-stone-300 hover:text-stone-700 hover:bg-stone-100'
                          : 'text-stone-200 cursor-not-allowed'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onEdit}   className="p-1.5 rounded text-stone-300 hover:text-stone-700 hover:bg-stone-100"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={onDelete} className="p-1.5 rounded text-stone-300 hover:text-red-500  hover:bg-red-50"  ><Trash2 className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {fmt.full} · {formatRange(event.startDate, event.endDate, event.allDay)}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {event.location}
                </span>
              )}
            </div>

            {event.description && (
              <p className="mt-2.5 text-sm text-stone-700 leading-relaxed whitespace-pre-line">{event.description}</p>
            )}

            {/* Email notify confirmation strip */}
            {notifyState !== 'idle' && (
              <div className="mt-3 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-md">
                {notifyState === 'confirm' && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-stone-700">Email all active members about this event?</span>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setNotifyState('idle')}
                        className="text-xs text-stone-500 hover:text-stone-900"
                      >Cancel</button>
                      <button
                        onClick={handleNotifyConfirm}
                        className="text-xs font-medium text-white bg-stone-900 px-2.5 py-1 rounded hover:bg-stone-700"
                      >Send emails</button>
                    </div>
                  </div>
                )}
                {notifyState === 'sending' && (
                  <p className="text-xs text-stone-500">Sending emails…</p>
                )}
                {notifyState === 'sent' && (
                  <p className="text-xs text-emerald-600 font-medium">Emails sent to all active members.</p>
                )}
                {notifyState === 'error' && (
                  <p className="text-xs text-red-500">Failed to send. Please try again.</p>
                )}
              </div>
            )}

            {/* RSVP section */}
            {!event.cancelled && (
              <div className="mt-4 space-y-2">
                {!past && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-stone-500 mr-1">RSVP:</span>
                    {RSVP_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => onRsvp(opt.value)}
                        className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                          myRsvp === opt.value ? opt.active : opt.idle
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Attendee counts */}
                {Object.keys(event.rsvps ?? {}).length > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    {rsvpCounts.attending > 0 && (
                      <span className="text-emerald-700 font-medium">{rsvpCounts.attending} attending</span>
                    )}
                    {rsvpCounts.maybe > 0 && (
                      <span className="text-amber-600 font-medium">{rsvpCounts.maybe} maybe</span>
                    )}
                    {rsvpCounts.declining > 0 && (
                      <span className="text-stone-400">{rsvpCounts.declining} declining</span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => setShowAttendees((v) => !v)}
                        className="ml-auto flex items-center gap-1 text-stone-400 hover:text-stone-700"
                      >
                        <Users className="w-3 h-3" />
                        {showAttendees ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                )}

                {/* Attendee list (admin) */}
                {showAttendees && attendees.length > 0 && (
                  <div className="mt-2 border border-stone-100 rounded-md overflow-hidden">
                    {attendees.map(([uid, rsvp]) => (
                      <div key={uid} className="flex items-center justify-between px-3 py-2 text-xs border-b border-stone-50 last:border-0">
                        <span className="text-stone-700 font-medium">{rsvp.name}</span>
                        <span className={`capitalize font-medium ${
                          rsvp.status === 'attending' ? 'text-emerald-600' :
                          rsvp.status === 'maybe'     ? 'text-amber-500' : 'text-stone-400'
                        }`}>{rsvp.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── PastSection ──────────────────────────────────────────────────────────────

function PastSection({
  events, userId, orgSlug, orgName, isAdmin, isPro, onEdit, onDelete,
}: {
  events: OrgEvent[];
  userId: string;
  orgSlug: string;
  orgName: string;
  isAdmin: boolean;
  isPro: boolean;
  onEdit: (ev: OrgEvent) => void;
  onDelete: (ev: OrgEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-stone-400 hover:text-stone-700"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        Past events · {events.length}
      </button>
      {open && events.slice().reverse().map((ev) => (
        <EventCard
          key={ev.id}
          event={ev}
          userId={userId}
          orgSlug={orgSlug}
          orgName={orgName}
          isAdmin={isAdmin}
          isPro={isPro}
          onRsvp={() => {}}
          onEdit={() => onEdit(ev)}
          onDelete={() => onDelete(ev)}
        />
      ))}
    </section>
  );
}

// ─── EventModal ───────────────────────────────────────────────────────────────

function EventModal({
  org, user, editing, onClose, onSaved,
}: {
  org: Organization;
  user: AuthUser;
  editing: OrgEvent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title,       setTitle]       = useState(editing?.title       ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [location,    setLocation]    = useState(editing?.location    ?? '');
  const [startDate,   setStartDate]   = useState(editing?.startDate   ?? '');
  const [endDate,     setEndDate]     = useState(editing?.endDate     ?? '');
  const [allDay,      setAllDay]      = useState(editing?.allDay      ?? false);
  const [saving, setSaving] = useState(false);

  const isEdit = editing !== null;
  const canSave = title.trim() && startDate;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startDate,
      endDate: endDate || undefined,
      allDay,
    };
    if (isEdit) {
      await updateEvent(org.id, editing.id, data);
    } else {
      await createEvent(org.id, {
        ...data,
        createdBy: user.displayName,
        createdByUid: user.uid,
      });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg border border-stone-200 shadow-2xl rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">{isEdit ? 'Edit event' : 'New event'}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Title <span className="text-red-400">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual General Meeting"
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="allDay"
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="allDay" className="text-sm text-stone-600">All-day event</label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-600 block mb-1.5">
                {allDay ? 'Date' : 'Start'} <span className="text-red-400">*</span>
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
            {!allDay && (
              <div>
                <label className="text-xs text-stone-600 block mb-1.5">End</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Community Hall, Room 4B or Zoom"
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Description / Agenda</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What's on the agenda?"
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-between">
          <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-900">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-40 rounded"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </div>
    </div>
  );
}
