import { useEffect, useState } from 'react';
import { Plus, X, Trash2, Pencil, Megaphone, Pin } from 'lucide-react';
import { listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/services/announcements';
import { can, useRole } from '@/hooks/useRole';
import type { Announcement, AnnouncementPriority, Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  user: AuthUser;
}

const PRIORITY_BORDER: Record<AnnouncementPriority, string> = {
  normal:    '',
  important: 'border-l-4 border-l-blue-400',
  urgent:    'border-l-4 border-l-red-500',
};

const PRIORITY_BADGE: Record<AnnouncementPriority, string> = {
  normal:    '',
  important: 'bg-blue-100 text-blue-700',
  urgent:    'bg-red-100 text-red-700',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Announcements({ org, user }: Props) {
  const role = useRole(org.id, user.uid);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [showForm, setShowForm] = useState(false);

  const reload = () => {
    setLoading(true);
    listAnnouncements(org.id).then((a) => {
      const order: Record<AnnouncementPriority, number> = { urgent: 0, important: 1, normal: 2 };
      setItems(
        [...a].sort((x, y) => {
          // Pinned always first
          if (x.pinned && !y.pinned) return -1;
          if (!x.pinned && y.pinned) return 1;
          return order[x.priority] - order[y.priority];
        }),
      );
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, [org.id]);

  const handleDelete = async (a: Announcement) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    await deleteAnnouncement(org.id, a.id);
    reload();
  };

  const handleTogglePin = async (a: Announcement) => {
    await updateAnnouncement(org.id, a.id, {
      title: a.title,
      body: a.body,
      priority: a.priority,
      pinned: !a.pinned,
    });
    reload();
  };

  const isAdmin = can.announce(role);

  return (
    <div className="p-4 sm:p-8 max-w-3xl space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono">§ Notices</div>
          <h2 className="font-display text-2xl mt-0.5">Announcements</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-3 py-2 bg-stone-900 text-stone-50 text-sm font-medium flex items-center gap-1.5 hover:bg-stone-800"
          >
            <Plus className="w-4 h-4" /> New announcement
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-stone-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-stone-400">
          <Megaphone className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No announcements yet.</p>
          {isAdmin && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="mt-3 text-sm text-stone-600 underline"
            >
              Post the first one
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <article
              key={a.id}
              className={`bg-white border border-stone-200 rounded-lg overflow-hidden ${PRIORITY_BORDER[a.priority]}`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {a.pinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono font-semibold px-1.5 py-0.5 rounded-sm bg-stone-100 text-stone-600">
                          <Pin className="w-2.5 h-2.5" /> Pinned
                        </span>
                      )}
                      {a.priority !== 'normal' && (
                        <span className={`text-[10px] uppercase tracking-[0.2em] font-mono font-semibold px-1.5 py-0.5 rounded-sm ${PRIORITY_BADGE[a.priority]}`}>
                          {a.priority}
                        </span>
                      )}
                      <span className="text-[10px] text-stone-400 font-mono">{a.date}</span>
                    </div>

                    <h3 className="font-display text-xl text-stone-900 leading-snug">{a.title}</h3>

                    {/* Body — preserve line breaks */}
                    <div className="mt-2 text-stone-700 text-sm leading-relaxed whitespace-pre-line">
                      {a.body}
                    </div>

                    <div className="mt-3 text-[11px] text-stone-400">Posted by {a.createdBy}</div>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleTogglePin(a)}
                        title={a.pinned ? 'Unpin' : 'Pin to top'}
                        className={`p-1.5 rounded hover:bg-stone-100 transition-colors ${a.pinned ? 'text-stone-700' : 'text-stone-300 hover:text-stone-600'}`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setEditing(a); setShowForm(true); }}
                        title="Edit"
                        className="p-1.5 rounded text-stone-300 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        title="Delete"
                        className="p-1.5 rounded text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <AnnouncementModal
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

// ─── Modal ────────────────────────────────────────────────────────────────────

function AnnouncementModal({
  org, user, editing, onClose, onSaved,
}: {
  org: Organization;
  user: AuthUser;
  editing: Announcement | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title,    setTitle]    = useState(editing?.title    ?? '');
  const [body,     setBody]     = useState(editing?.body     ?? '');
  const [priority, setPriority] = useState<AnnouncementPriority>(editing?.priority ?? 'normal');
  const [saving,   setSaving]   = useState(false);

  const isEdit = editing !== null;

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    if (isEdit) {
      await updateAnnouncement(org.id, editing.id, {
        title: title.trim(),
        body: body.trim(),
        priority,
        pinned: editing.pinned,
      });
    } else {
      await createAnnouncement(org.id, {
        title: title.trim(),
        body: body.trim(),
        priority,
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
          <h3 className="font-display text-xl">{isEdit ? 'Edit announcement' : 'New announcement'}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Priority</label>
            <div className="flex gap-2">
              {(['normal', 'important', 'urgent'] as AnnouncementPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 text-xs font-medium border rounded capitalize transition-colors ${
                    priority === p
                      ? p === 'urgent'    ? 'bg-red-600 text-white border-red-600'
                      : p === 'important' ? 'bg-blue-600 text-white border-blue-600'
                      :                    'bg-stone-900 text-white border-stone-900'
                      : 'border-stone-300 text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual General Meeting — June 18"
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="What do members need to know?"
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
            <p className="text-[11px] text-stone-400 mt-1">Line breaks are preserved in the post.</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-between">
          <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-900">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !body.trim()}
            className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-40 rounded"
          >
            {saving ? (isEdit ? 'Saving…' : 'Posting…') : (isEdit ? 'Save changes' : 'Post announcement')}
          </button>
        </div>
      </div>
    </div>
  );
}
