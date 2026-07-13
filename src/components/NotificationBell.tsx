import { useState, useRef, useEffect } from 'react';
import { Bell, CalendarDays, BarChart2, Wallet, Inbox, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AppNotif, NotifType } from '@/types';

const TYPE_ICONS: Record<NotifType, React.ComponentType<{ className?: string }>> = {
  event:        CalendarDays,
  poll:         BarChart2,
  dues:         Wallet,
  request:      Inbox,
  membership:   Users,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface Props {
  notifs: AppNotif[];
  totalUnread: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationBell({ notifs, totalUnread, onMarkRead, onMarkAllRead }: Props) {
  const [open, setOpen]   = useState(false);
  const wrapRef           = useRef<HTMLDivElement>(null);
  const navigate          = useNavigate();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function handleClick(notif: AppNotif) {
    if (!notif.read) onMarkRead(notif.id);
    setOpen(false);
    navigate(notif.link);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-stone-600 hover:bg-stone-100 rounded transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-[var(--ledger-red)] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none pointer-events-none">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[min(24rem,calc(100vw-1rem))] bg-white border border-stone-200 shadow-2xl z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-stone-900">
              Notifications {totalUnread > 0 && <span className="text-[var(--ledger-red)]">({totalUnread})</span>}
            </span>
            <div className="flex items-center gap-3">
              {totalUnread > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="text-xs text-stone-500 hover:text-stone-900 underline"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-stone-50">
            {notifs.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-6 h-6 mx-auto text-stone-300 mb-2" />
                <p className="text-sm text-stone-400">You're all caught up</p>
              </div>
            ) : notifs.map((n) => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors flex gap-3 ${!n.read ? 'bg-amber-50/40' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    !n.read ? 'bg-[var(--ledger-red)]/10 text-[var(--ledger-red)]' : 'bg-stone-100 text-stone-400'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-stone-900' : 'text-stone-600'}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-[10px] text-stone-400 mt-1 font-mono uppercase tracking-wide">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-[var(--ledger-red)] shrink-0 mt-2.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
