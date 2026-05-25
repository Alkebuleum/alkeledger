import { useEffect, useState } from 'react';
import { Plus, X, CheckCircle2, Inbox } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { Panel } from '@/components/Panel';
import { listRequests, submitRequest, closeRequest } from '@/services/requests';
import { can, useRole } from '@/hooks/useRole';
import type { MemberRequest, Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  user: AuthUser;
}

export function Requests({ org, user }: Props) {
  const role = useRole(org.id, user.uid);
  const [items, setItems] = useState<MemberRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'mine'>('all');
  const [showForm, setShowForm] = useState(false);
  const [responding, setResponding] = useState<MemberRequest | null>(null);

  const isAdmin = can.manage(role);

  const reload = () => {
    setLoading(true);
    listRequests(org.id).then((r) => { setItems(r); setLoading(false); });
  };

  useEffect(() => { reload(); }, [org.id]);

  const displayed = items.filter((r) => {
    if (filter === 'open') return r.status === 'open';
    if (filter === 'mine') return r.fromId === user.uid;
    return true;
  });

  return (
    <div className="p-4 sm:p-8 max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono">§ Inbox</div>
          <h2 className="font-display text-2xl mt-0.5">Member requests</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter tabs */}
          {(['all', 'open', 'mine'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium capitalize border ${
                filter === f ? 'bg-stone-900 text-stone-50 border-stone-900' : 'border-stone-300 text-stone-700 hover:border-stone-400'
              }`}
            >
              {f === 'mine' ? 'My requests' : f}
            </button>
          ))}
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-stone-900 text-stone-50 text-xs font-medium flex items-center gap-1.5 hover:bg-stone-800"
          >
            <Plus className="w-3.5 h-3.5" /> New request
          </button>
        </div>
      </div>

      <Panel title={`${displayed.length} ${filter === 'all' ? '' : filter} request${displayed.length !== 1 ? 's' : ''}`}>
        {loading ? (
          <div className="py-10 text-center text-stone-400 text-sm">Loading…</div>
        ) : displayed.length === 0 ? (
          <div className="py-14 text-center text-stone-400">
            <Inbox className="w-7 h-7 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No requests.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {displayed.map((r) => (
              <div key={r.id} className="px-5 py-4 hover:bg-stone-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-stone-900">{r.subject}</span>
                      <StatusPill value={r.status} />
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      From <span className="font-medium">{r.from}</span> · {r.date}
                    </div>
                    {r.message && (
                      <p className="mt-2 text-sm text-stone-600 leading-relaxed">{r.message}</p>
                    )}
                    {r.response && (
                      <div className="mt-3 p-3 bg-stone-50 border-l-4 border-stone-300">
                        <div className="text-[10px] uppercase tracking-wider text-stone-500 font-mono mb-1">Admin response · {r.closedBy}</div>
                        <p className="text-sm text-stone-700">{r.response}</p>
                      </div>
                    )}
                  </div>
                  {isAdmin && r.status === 'open' && (
                    <button
                      onClick={() => setResponding(r)}
                      className="shrink-0 px-3 py-1.5 text-xs border border-stone-300 text-stone-700 hover:bg-stone-100 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Respond
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {showForm && (
        <SubmitModal
          org={org}
          user={user}
          onClose={() => setShowForm(false)}
          onSaved={reload}
        />
      )}

      {responding && (
        <RespondModal
          req={responding}
          org={org}
          user={user}
          onClose={() => setResponding(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

function SubmitModal({
  org, user, onClose, onSaved,
}: {
  org: Organization;
  user: AuthUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!subject.trim()) return;
    setSaving(true);
    await submitRequest(org.id, {
      from: user.displayName,
      fromId: user.uid,
      subject: subject.trim(),
      message: message.trim() || undefined,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg border border-stone-200 shadow-2xl">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">Submit a request</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Dues waiver request, Receipt copy, Appeal suspension"
              className="w-full px-3 py-2.5 border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Provide context for the admins…"
              className="w-full px-3 py-2.5 border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-between">
          <button onClick={onClose} className="text-sm text-stone-600">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !subject.trim()}
            className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium disabled:opacity-40"
          >
            {saving ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RespondModal({
  req, org, user, onClose, onSaved,
}: {
  req: MemberRequest;
  org: Organization;
  user: AuthUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = async () => {
    setSaving(true);
    await closeRequest(org.id, req.id, user.displayName, response.trim() || undefined);
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg border border-stone-200 shadow-2xl">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">Respond to request</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-stone-50 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">From {req.from} · {req.date}</div>
            <div className="font-medium text-stone-900">{req.subject}</div>
            {req.message && <p className="mt-1 text-sm text-stone-600">{req.message}</p>}
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Your response (optional)</label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              placeholder="Leave a note for the member…"
              className="w-full px-3 py-2.5 border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-between">
          <button onClick={onClose} className="text-sm text-stone-600">Cancel</button>
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium disabled:opacity-40"
          >
            {saving ? 'Closing…' : 'Close request'}
          </button>
        </div>
      </div>
    </div>
  );
}
