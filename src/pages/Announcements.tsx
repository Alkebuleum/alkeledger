import { useEffect, useState } from 'react';
import { Plus, X, Trash2, Megaphone } from 'lucide-react';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from '@/services/announcements';
import { can, useRole } from '@/hooks/useRole';
import type { Announcement, AnnouncementPriority, Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  user: AuthUser;
}

const PRIORITY_STYLES: Record<AnnouncementPriority, string> = {
  normal:    'bg-stone-100 text-stone-700',
  important: 'bg-blue-50 text-blue-700 border-l-4 border-blue-400',
  urgent:    'bg-red-50 text-red-800 border-l-4 border-red-500',
};

const PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  normal:    'Notice',
  important: 'Important',
  urgent:    'Urgent',
};

export function Announcements({ org, user }: Props) {
  const role = useRole(org.id, user.uid);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const reload = () => {
    setLoading(true);
    listAnnouncements(org.id).then((a) => {
      // Sort: urgent first, then important, then normal
      const order: Record<AnnouncementPriority, number> = { urgent: 0, important: 1, normal: 2 };
      setItems([...a].sort((x, y) => order[x.priority] - order[y.priority]));
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, [org.id]);

  const handleDelete = async (a: Announcement) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    await deleteAnnouncement(org.id, a.id);
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
            onClick={() => setShowForm(true)}
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
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-stone-600 underline">
              Post the first one
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <article
              key={a.id}
              className={`bg-white border border-stone-200 p-5 ${PRIORITY_STYLES[a.priority]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {a.priority !== 'normal' && (
                      <span className={`text-[10px] uppercase tracking-[0.2em] font-mono font-semibold px-1.5 py-0.5 rounded-sm ${
                        a.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {PRIORITY_LABELS[a.priority]}
                      </span>
                    )}
                    <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">{a.date}</span>
                  </div>
                  <h3 className="font-display text-xl text-stone-900 leading-snug">{a.title}</h3>
                  <p className="mt-2 text-stone-700 text-sm leading-relaxed">{a.body}</p>
                  <div className="mt-2 text-[11px] text-stone-400">Posted by {a.createdBy}</div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(a)}
                    className="text-stone-300 hover:text-red-500 shrink-0 p-1"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <AnnouncementModal
          org={org}
          user={user}
          onClose={() => setShowForm(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

function AnnouncementModal({
  org, user, onClose, onSaved,
}: {
  org: Organization;
  user: AuthUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    await createAnnouncement(org.id, {
      title: title.trim(),
      body: body.trim(),
      priority,
      createdBy: user.displayName,
      createdByUid: user.uid,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg border border-stone-200 shadow-2xl">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">New announcement</h3>
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
                  className={`px-3 py-1.5 text-xs font-medium border capitalize ${
                    priority === p
                      ? p === 'urgent' ? 'bg-red-600 text-white border-red-600'
                        : p === 'important' ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-stone-900 text-white border-stone-900'
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
              className="w-full px-3 py-2.5 border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="What do members need to know?"
              className="w-full px-3 py-2.5 border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-between">
          <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-900">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !body.trim()}
            className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-40"
          >
            {saving ? 'Posting…' : 'Post announcement'}
          </button>
        </div>
      </div>
    </div>
  );
}
