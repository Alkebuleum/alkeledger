import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, X, MapPin, Clock, Pencil, Trash2, CalendarDays, Users, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Link2, Mail, MessageCircle, ImagePlus } from 'lucide-react';
import { listEvents, createEvent, updateEvent, deleteEvent, setRsvp, notifyEventMembers, uploadEventImage, deleteEventImage } from '@/services/events';
import { processCoverImage } from '@/lib/image';
import { notifyCreated } from '@/services/notifications';
import { can, useRole } from '@/hooks/useRole';
import { isPaidPlan } from '@/lib/plan';
import type { OrgEvent, Organization, RsvpStatus } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  user: AuthUser;
}

function copyShareLink(orgSlug: string, id: string, setCopied: (v: boolean) => void) {
  const url = `${window.location.origin}/share/${orgSlug}/event/${id}`;
  navigator.clipboard.writeText(url).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
}

function shareEvent(event: OrgEvent, orgSlug: string) {
  const url  = `${window.location.origin}/share/${orgSlug}/event/${event.id}`;
  const date = event.startDate
    ? new Date(event.startDate).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const time = formatRange(event.startDate, event.endDate, event.allDay);

  const rsvps     = event.rsvps ?? {};
  const attending = Object.values(rsvps).filter((r) => r.status === 'attending').length;
  const maybe     = Object.values(rsvps).filter((r) => r.status === 'maybe').length;
  const declining = Object.values(rsvps).filter((r) => r.status === 'declining').length;

  const lines: string[] = [];
  lines.push(`*${event.title}*`);
  lines.push('');
  lines.push(`${date} · ${time}`);
  if (event.location) lines.push(`Location: ${event.location}`);
  lines.push('');
  lines.push('RSVP Status');
  lines.push(`Attending: ${attending}`);
  lines.push(`Maybe: ${maybe}`);
  lines.push(`Declining: ${declining}`);
  lines.push('');
  lines.push('Tap below to RSVP:');
  lines.push(url);

  const text   = lines.join('\n');
  const waUrl  = `https://wa.me/?text=${encodeURIComponent(text)}`;
  // Only use the native share sheet on mobile — desktop OS share dialogs
  // (Windows/macOS) mangle Unicode emoji before passing text to apps.
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (navigator.share && isMobile) {
    navigator.share({ title: event.title, text }).catch(() => window.open(waUrl, '_blank'));
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

// Local (not UTC) date key — toISOString() would shift dates near midnight
// depending on the viewer's timezone, misplacing events on the grid.
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

const RSVP_OPTIONS: { value: RsvpStatus; label: string; active: string; idle: string }[] = [
  { value: 'attending', label: 'Attending', active: 'bg-emerald-600 text-white',  idle: 'bg-white text-stone-600 border-stone-300 hover:border-emerald-400 hover:text-emerald-700' },
  { value: 'maybe',     label: 'Maybe',     active: 'bg-amber-500 text-white',    idle: 'bg-white text-stone-600 border-stone-300 hover:border-amber-400 hover:text-amber-600' },
  { value: 'declining', label: 'Declining', active: 'bg-stone-500 text-white',    idle: 'bg-white text-stone-600 border-stone-300 hover:border-stone-400' },
];

// ─── MonthCalendar ────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function MonthCalendar({
  events, viewDate, onViewDateChange, selectedDate, onSelectDate,
}: {
  events: OrgEvent[];
  viewDate: Date;
  onViewDateChange: (d: Date) => void;
  selectedDate: string | null;
  onSelectDate: (key: string | null) => void;
}) {
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  const eventCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of events) {
      if (ev.cancelled) continue;
      const key = dateKey(new Date(ev.startDate));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth   = new Date(year, month + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [year, month]);

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onViewDateChange(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-md text-stone-400 hover:text-stone-900 hover:bg-stone-100"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base sm:text-lg text-stone-900">
            {viewDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </h3>
          {!sameMonth(viewDate, today) && (
            <button
              onClick={() => onViewDateChange(new Date())}
              className="text-[11px] text-stone-400 hover:text-stone-700 underline"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={() => onViewDateChange(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-md text-stone-400 hover:text-stone-900 hover:bg-stone-100"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium uppercase text-stone-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const key       = dateKey(date);
          const count     = eventCounts.get(key) ?? 0;
          const isToday   = key === dateKey(today);
          const isSelected = key === selectedDate;
          return (
            <button
              key={i}
              onClick={() => onSelectDate(isSelected ? null : key)}
              className="flex flex-col items-center justify-center py-1 gap-0.5"
            >
              <span
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                  isSelected
                    ? 'bg-stone-900 text-white font-semibold'
                    : isToday
                    ? 'border border-stone-900 text-stone-900 font-semibold'
                    : count > 0
                    ? 'text-stone-900 font-medium hover:bg-stone-100'
                    : 'text-stone-400 hover:bg-stone-50'
                }`}
              >
                {date.getDate()}
              </span>
              <span
                className={`w-1 h-1 rounded-full ${
                  count === 0 ? 'bg-transparent' : isSelected ? 'bg-white' : 'bg-[var(--ledger-red)]'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── EventListItem ────────────────────────────────────────────────────────────
// Compact row for the list under the calendar — a page can have many events,
// so the list shows just enough to scan and tap through; full RSVP/attendee/
// admin controls live on the detail view (EventCard) opened by tapping a row.

function EventListItem({ event, userId, onOpen }: { event: OrgEvent; userId: string; onOpen: () => void }) {
  const fmt = formatDate(event.startDate);
  const myRsvp = event.rsvps?.[userId]?.status ?? null;
  const totalRsvps = Object.keys(event.rsvps ?? {}).length;

  return (
    <button
      onClick={onOpen}
      className={`w-full flex items-center gap-3 sm:gap-4 bg-white border border-stone-200 rounded-xl p-3 sm:p-4 text-left hover:border-stone-300 hover:shadow-sm transition-all ${
        event.cancelled ? 'opacity-60' : ''
      }`}
    >
      <div className="shrink-0 w-11 h-[3.25rem] sm:w-12 sm:h-14 rounded-lg bg-stone-900 text-white flex flex-col items-center justify-center">
        <span className="text-[8px] sm:text-[9px] uppercase font-mono text-white/50 leading-none tracking-wider">{fmt.month}</span>
        <span className="text-xl sm:text-2xl font-display font-semibold leading-none mt-0.5">{fmt.day}</span>
      </div>

      <div className="flex-1 min-w-0">
        {event.cancelled && (
          <span className="text-[9px] uppercase tracking-widest font-mono text-red-500 block mb-0.5">Cancelled</span>
        )}
        <h4 className="font-display text-base text-stone-900 leading-tight truncate">{event.title}</h4>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
          <Clock className="w-3 h-3 shrink-0 text-stone-400" />
          <span className="truncate">
            {formatRange(event.startDate, event.endDate, event.allDay)}
            {event.location ? ` · ${event.location}` : ''}
          </span>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {myRsvp && (
          <span
            className={`w-2 h-2 rounded-full ${
              myRsvp === 'attending' ? 'bg-emerald-500' : myRsvp === 'maybe' ? 'bg-amber-500' : 'bg-stone-400'
            }`}
            title={`You: ${myRsvp}`}
          />
        )}
        {totalRsvps > 0 && <span className="hidden sm:inline text-[11px] text-stone-400 font-mono">{totalRsvps}</span>}
        <ChevronRight className="w-4 h-4 text-stone-300" />
      </div>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Events({ org, user }: Props) {
  const role = useRole(org.id, user.uid);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<OrgEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    listEvents(org.id).then((evs) => {
      setEvents(evs.sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, [org.id]);

  // Auto-RSVP from shared link: ?openEvent=<id>&rsvp=<status>
  // Keeps `openEvent` in the URL afterward (drops only `rsvp`) so the visitor
  // lands on that event's detail view instead of bouncing back to the plain list.
  useEffect(() => {
    if (loading) return;
    const openEventId = searchParams.get('openEvent');
    const rsvpStatus  = searchParams.get('rsvp') as RsvpStatus | null;
    if (!openEventId || !rsvpStatus) return;
    if (!(['attending', 'maybe', 'declining'] as string[]).includes(rsvpStatus)) return;
    setSearchParams({ openEvent: openEventId }, { replace: true });
    const ev = events.find((e) => e.id === openEventId);
    if (!ev || isPast(ev) || ev.cancelled) return;
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
  const isPro   = isPaidPlan(org);

  const upcoming = events.filter((e) => !isPast(e) && !e.cancelled);
  const past      = events.filter((e) => isPast(e) || !!e.cancelled);
  const dayEvents = selectedDate
    ? events.filter((e) => dateKey(new Date(e.startDate)) === selectedDate)
    : [];
  const selectedLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  const openEventId = searchParams.get('openEvent');
  const openEvent    = openEventId ? events.find((e) => e.id === openEventId) ?? null : null;

  const closeDetail = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('openEvent');
    next.delete('rsvp');
    setSearchParams(next);
  };

  const openDetail = (id: string) => setSearchParams({ openEvent: id });

  return (
    <div className="p-4 sm:p-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono">§ Calendar</div>
          <h2 className="font-display text-2xl mt-0.5">Calendar</h2>
        </div>
        {isAdmin && !openEventId && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-3 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-md flex items-center gap-1.5 hover:bg-stone-800"
          >
            <Plus className="w-4 h-4" /> New event
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-stone-400 text-sm">Loading…</div>
      ) : openEventId ? (
        /* ── Event detail (deep-linkable via ?openEvent=<id>, incl. share links & RSVP emails) ── */
        <div className="space-y-4">
          <button
            onClick={closeDetail}
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900"
          >
            <ChevronLeft className="w-4 h-4" /> Back to calendar
          </button>
          {openEvent ? (
            <EventCard
              event={openEvent}
              userId={user.uid}
              orgSlug={org.slug ?? org.id}
              isAdmin={isAdmin}
              isPro={isPro}
              onRsvp={(s) => handleRsvp(openEvent, s)}
              onEdit={() => { setEditing(openEvent); setShowForm(true); }}
              onDelete={() => handleDelete(openEvent)}
              onNotify={() => notifyEventMembers(org.id, openEvent.id, {
                title: openEvent.title, startDate: openEvent.startDate, endDate: openEvent.endDate,
                allDay: openEvent.allDay, location: openEvent.location, description: openEvent.description,
              })}
            />
          ) : (
            <div className="py-10 text-center text-stone-400 text-sm">
              This event no longer exists or you don't have access to it.
            </div>
          )}
        </div>
      ) : (
        <>
          <MonthCalendar
            events={events}
            viewDate={viewDate}
            onViewDateChange={setViewDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {events.length === 0 ? (
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
          ) : selectedDate ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-widest text-stone-500">
                  {selectedLabel} · {dayEvents.length}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-stone-400 hover:text-stone-700 underline"
                >
                  Show all
                </button>
              </div>
              {dayEvents.length === 0 ? (
                <div className="py-10 text-center text-stone-400">
                  <p className="text-sm">No events on {selectedLabel}.</p>
                  {isAdmin && (
                    <button
                      onClick={() => { setEditing(null); setShowForm(true); }}
                      className="mt-3 text-sm text-stone-600 underline"
                    >
                      Schedule one
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((ev) => (
                    <EventListItem key={ev.id} event={ev} userId={user.uid} onOpen={() => openDetail(ev.id)} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Upcoming */}
              {upcoming.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-widest text-stone-500">
                    Upcoming · {upcoming.length}
                  </h3>
                  {upcoming.map((ev) => (
                    <EventListItem key={ev.id} event={ev} userId={user.uid} onOpen={() => openDetail(ev.id)} />
                  ))}
                </section>
              )}

              {/* Past */}
              {past.length > 0 && (
                <PastSection events={past} userId={user.uid} onOpen={openDetail} />
              )}
            </div>
          )}
        </>
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
  event, userId, orgSlug, isAdmin, isPro, onRsvp, onEdit, onDelete, onNotify,
}: {
  event: OrgEvent;
  userId: string;
  orgSlug: string;
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
    <article className={`bg-white border border-stone-200 rounded-xl overflow-hidden ${event.cancelled ? 'opacity-60' : ''}`}>
      {event.imageUrl && (
        <img src={event.imageUrl} alt="" className="w-full aspect-[16/9] object-cover border-b border-stone-100" />
      )}
      <div className="p-4 sm:p-5">

        {/* ── Header row: date badge + title + share icons ── */}
        <div className="flex gap-3 sm:gap-4">
          {/* Date badge */}
          <div className="shrink-0 w-12 h-14 sm:w-14 sm:h-16 rounded-xl bg-stone-900 text-white flex flex-col items-center justify-center">
            <span className="text-[9px] sm:text-[10px] uppercase font-mono text-white/50 leading-none tracking-wider">
              {fmt.month}
            </span>
            <span className="text-2xl sm:text-3xl font-display font-semibold leading-none mt-0.5">
              {fmt.day}
            </span>
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                {event.cancelled && (
                  <span className="text-[10px] uppercase tracking-widest font-mono text-red-500 block mb-0.5">Cancelled</span>
                )}
                <h3 className="font-display text-lg sm:text-xl text-stone-900 leading-tight">{event.title}</h3>
              </div>
              {/* Share icons — compact on mobile, full set on desktop */}
              <div className="flex items-center gap-0.5 shrink-0 -mt-0.5">
                <button
                  onClick={() => copyShareLink(orgSlug, event.id, setCopied)}
                  title="Copy share link"
                  className="p-1.5 rounded-md text-stone-300 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  {copied
                    ? <span className="text-[10px] text-emerald-600 font-mono">Copied!</span>
                    : <Link2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => shareEvent(event, orgSlug)}
                  title="Share via WhatsApp"
                  className="p-1.5 rounded-md text-stone-300 hover:text-[#25D366] hover:bg-emerald-50 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
                {/* Desktop-only admin icons */}
                {isAdmin && !past && (
                  <div className="hidden sm:flex items-center gap-0.5">
                    <button
                      onClick={() => isPro ? setNotifyState('confirm') : undefined}
                      title={isPro ? 'Email members about this event' : 'Pro feature'}
                      className={`p-1.5 rounded-md transition-colors ${isPro ? 'text-stone-300 hover:text-stone-700 hover:bg-stone-100' : 'text-stone-200 cursor-not-allowed'}`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onEdit}   className="p-1.5 rounded-md text-stone-300 hover:text-stone-700 hover:bg-stone-100"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={onDelete} className="p-1.5 rounded-md text-stone-300 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="mt-1.5 space-y-0.5 text-xs text-stone-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 shrink-0 text-stone-400" />
                <span className="truncate">{fmt.full} · {formatRange(event.startDate, event.endDate, event.allDay)}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 shrink-0 text-stone-400" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="mt-3 text-sm text-stone-700 leading-relaxed whitespace-pre-line">{event.description}</p>
        )}

        {/* Email notify strip */}
        {notifyState !== 'idle' && (
          <div className="mt-3 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-md">
            {notifyState === 'confirm' && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-stone-700">Email all active members about this event?</span>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setNotifyState('idle')} className="text-xs text-stone-500 hover:text-stone-900">Cancel</button>
                  <button onClick={handleNotifyConfirm} className="text-xs font-medium text-white bg-stone-900 px-2.5 py-1 rounded-md hover:bg-stone-700">Send emails</button>
                </div>
              </div>
            )}
            {notifyState === 'sending' && <p className="text-xs text-stone-500">Sending emails…</p>}
            {notifyState === 'sent'    && <p className="text-xs text-emerald-600 font-medium">Emails sent to all active members.</p>}
            {notifyState === 'error'   && <p className="text-xs text-red-500">Failed to send. Please try again.</p>}
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
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
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
                {rsvpCounts.attending > 0 && <span className="text-emerald-700 font-medium">{rsvpCounts.attending} attending</span>}
                {rsvpCounts.maybe     > 0 && <span className="text-amber-600 font-medium">{rsvpCounts.maybe} maybe</span>}
                {rsvpCounts.declining > 0 && <span className="text-stone-400">{rsvpCounts.declining} declining</span>}
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

            {/* Attendee list */}
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

        {/* Mobile-only admin action strip */}
        {isAdmin && !past && (
          <div className="sm:hidden mt-4 pt-3 border-t border-stone-100 flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-stone-200 rounded-md text-stone-600 hover:bg-stone-50"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-100 rounded-md text-red-500 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
            {isPro && (
              <button
                onClick={() => setNotifyState('confirm')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-stone-200 rounded-md text-stone-600 hover:bg-stone-50 ml-auto"
              >
                <Mail className="w-3 h-3" /> Notify
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ─── PastSection ──────────────────────────────────────────────────────────────

function PastSection({
  events, userId, onOpen,
}: {
  events: OrgEvent[];
  userId: string;
  onOpen: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-stone-400 hover:text-stone-700"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        Past events · {events.length}
      </button>
      {open && events.slice().reverse().map((ev) => (
        <EventListItem key={ev.id} event={ev} userId={userId} onOpen={() => onOpen(ev.id)} />
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
  const [error,  setError]  = useState('');

  const [imageFile,       setImageFile]       = useState<File | null>(null);
  const [imagePreview,    setImagePreview]    = useState<string | null>(editing?.imageUrl ?? null);
  const [imageRemoved,    setImageRemoved]    = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isEdit = editing !== null;
  const canSave = title.trim() && startDate;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageRemoved(false);
    setImageProcessing(true);
    setError('');
    try {
      // Crop to the same 16:9 frame the card displays, so the preview
      // shown here is exactly what ends up on the event card — no
      // surprise crop after upload.
      const { file: processed, previewUrl } = await processCoverImage(file);
      setImageFile(processed);
      setImagePreview(previewUrl);
    } catch {
      setError('Could not process that image. Try a different file.');
    } finally {
      setImageProcessing(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageRemoved(true);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');

    try {
      let newImage: { url: string; storagePath: string } | null = null;
      if (imageFile) {
        newImage = await uploadEventImage(org.id, imageFile);
      }

      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startDate,
        endDate: endDate || undefined,
        allDay,
      };
      if (isEdit) {
        await updateEvent(org.id, editing.id, {
          ...data,
          ...(newImage
            ? { imageUrl: newImage.url, imageStoragePath: newImage.storagePath }
            : imageRemoved
            ? { imageUrl: null, imageStoragePath: null }
            : {}),
        });
      } else {
        const orgSlug = org.slug ?? org.id;
        const created = await createEvent(org.id, {
          ...data,
          ...(newImage ? { imageUrl: newImage.url, imageStoragePath: newImage.storagePath } : {}),
          createdBy: user.displayName,
          createdByUid: user.uid,
        });
        notifyCreated(org.id, 'event', data.title, data.description?.slice(0, 120) ?? '', `/${orgSlug}/calendar?openEvent=${created.id}`);
      }
      // Old image is only deleted once its replacement (or removal) is confirmed saved —
      // deleting first would leave the event pointing at a gone file if the save then failed
      if ((newImage || imageRemoved) && editing?.imageStoragePath) {
        await deleteEventImage(editing.imageStoragePath);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-end sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg border border-stone-200 shadow-2xl rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">{isEdit ? 'Edit event' : 'New event'}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Title <span className="text-red-400">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual General Meeting"
              className="w-full px-3 py-2.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Image</label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={imageProcessing}
              onChange={handleImageChange}
            />
            {imagePreview ? (
              <div className="relative">
                {/* Same 16:9 frame the event card displays — this preview is the exact crop that gets uploaded */}
                <img src={imagePreview} alt="" className="w-full aspect-[16/9] object-cover rounded-md border border-stone-200" />
                <button
                  onClick={handleRemoveImage}
                  title="Remove image"
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-stone-900/70 text-white hover:bg-stone-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageProcessing}
                  className="mt-1.5 text-xs text-stone-600 underline disabled:opacity-40"
                >
                  {imageProcessing ? 'Processing…' : 'Change image'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={imageProcessing}
                className="w-full aspect-[16/9] flex flex-col items-center justify-center gap-1.5 border border-dashed border-stone-300 rounded-md text-stone-400 hover:border-stone-400 hover:text-stone-600 disabled:opacity-40"
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-xs">{imageProcessing ? 'Processing…' : 'Add a cover image (optional)'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="allDay"
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded-md"
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
                className="w-full px-3 py-2.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
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
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
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
              className="w-full px-3 py-2.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Description / Agenda</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What's on the agenda?"
              className="w-full px-3 py-2.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-900">Cancel</button>
          {error && <span className="text-xs text-red-500 flex-1 text-right">{error}</span>}
          <button
            onClick={handleSave}
            disabled={saving || !canSave || imageProcessing}
            className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-md hover:bg-stone-800 disabled:opacity-40 shrink-0"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </div>
    </div>
  );
}
