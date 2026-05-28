import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, X, Pencil, Trash2, BarChart2,
  ChevronDown, ChevronUp, Link2, Mail, MessageCircle, CheckCircle2,
} from 'lucide-react';
import { listPolls, createPoll, updatePoll, deletePoll, castVote, notifyPollMembers } from '@/services/votes';
import { can, useRole } from '@/hooks/useRole';
import type { Poll, PollOption, PollStatus, VoteType, Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  user: AuthUser;
}

function copyShareLink(orgSlug: string, pollId: string, setCopied: (v: boolean) => void) {
  const url = `${window.location.origin}/share/${orgSlug}/poll/${pollId}`;
  navigator.clipboard.writeText(url).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
}

function sharePoll(poll: Poll, orgSlug: string) {
  const url    = `${window.location.origin}/share/${orgSlug}/poll/${poll.id}`;
  const counts = getOptionCounts(poll);
  const total  = Object.keys(poll.votes ?? {}).length;

  const lines: string[] = [`*${poll.title}*`];
  if (poll.description) { lines.push(''); lines.push(poll.description); }
  lines.push('');
  lines.push(`${total} vote${total !== 1 ? 's' : ''} so far`);
  for (const opt of poll.options) {
    lines.push(`• ${opt.text}: ${counts[opt.id] ?? 0}`);
  }
  lines.push('');
  lines.push('Tap to vote:');
  lines.push(url);

  const text    = lines.join('\n');
  const waUrl   = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const mobile  = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (navigator.share && mobile) {
    navigator.share({ title: poll.title, text }).catch(() => window.open(waUrl, '_blank'));
  } else {
    window.open(waUrl, '_blank');
  }
}

function getOptionCounts(poll: Poll): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const opt of poll.options) counts[opt.id] = 0;
  for (const vote of Object.values(poll.votes ?? {})) {
    for (const id of vote.optionIds) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

type NotifyState = 'idle' | 'confirm' | 'sending' | 'sent' | 'error';

// ─── Main page ────────────────────────────────────────────────────────────────

export function Votes({ org, user }: Props) {
  const role = useRole(org.id, user.uid);
  const [polls, setPolls]     = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Poll | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const focusPollId = searchParams.get('openPoll');

  const reload = () => {
    setLoading(true);
    listPolls(org.id).then((ps) => { setPolls(ps); setLoading(false); });
  };

  useEffect(() => { reload(); }, [org.id]);

  useEffect(() => {
    if (focusPollId && !loading) setSearchParams({}, { replace: true });
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (poll: Poll) => {
    if (!confirm(`Delete "${poll.title}"?`)) return;
    await deletePoll(org.id, poll.id);
    reload();
  };

  const handleVote = async (poll: Poll, optionIds: string[]) => {
    await castVote(org.id, poll.id, user.uid, user.displayName, optionIds);
    reload();
  };

  const handlePublish = async (poll: Poll) => {
    await updatePoll(org.id, poll.id, { status: 'active' });
    reload();
  };

  const handleClose = async (poll: Poll) => {
    if (!confirm(`Close voting on "${poll.title}"? Members won't be able to vote after this.`)) return;
    await updatePoll(org.id, poll.id, { status: 'closed' });
    reload();
  };

  const isAdmin = can.announce(role);
  const isPro   = org.plan === 'pro';

  const active = polls.filter((p) => p.status === 'active');
  const drafts = polls.filter((p) => p.status === 'draft');
  const closed = polls.filter((p) => p.status === 'closed');

  return (
    <div className="p-4 sm:p-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono">§ Community</div>
          <h2 className="font-display text-2xl mt-0.5">Votes & Polls</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-3 py-2 bg-stone-900 text-stone-50 text-sm font-medium flex items-center gap-1.5 hover:bg-stone-800"
          >
            <Plus className="w-4 h-4" /> New vote
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-stone-400 text-sm">Loading…</div>
      ) : polls.length === 0 ? (
        <div className="py-16 text-center text-stone-400">
          <BarChart2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No votes or polls yet.</p>
          {isAdmin && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="mt-3 text-sm text-stone-600 underline"
            >
              Create the first one
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-stone-500">
                Active · {active.length}
              </h3>
              {active.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  userId={user.uid}
                  orgSlug={org.slug ?? org.id}
                  isAdmin={isAdmin}
                  isPro={isPro}
                  focused={focusPollId === poll.id}
                  onVote={(ids) => handleVote(poll, ids)}
                  onEdit={() => { setEditing(poll); setShowForm(true); }}
                  onDelete={() => handleDelete(poll)}
                  onClose={() => handleClose(poll)}
                  onNotify={() => notifyPollMembers(org.id, poll.id, { title: poll.title, description: poll.description })}
                />
              ))}
            </section>
          )}

          {isAdmin && drafts.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-stone-400">
                Drafts · {drafts.length}
              </h3>
              {drafts.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  userId={user.uid}
                  orgSlug={org.slug ?? org.id}
                  isAdmin={isAdmin}
                  isPro={isPro}
                  focused={false}
                  onVote={async () => {}}
                  onEdit={() => { setEditing(poll); setShowForm(true); }}
                  onDelete={() => handleDelete(poll)}
                  onPublish={() => handlePublish(poll)}
                />
              ))}
            </section>
          )}

          {closed.length > 0 && (
            <ClosedSection
              polls={closed}
              userId={user.uid}
              orgSlug={org.slug ?? org.id}
              isAdmin={isAdmin}
              isPro={isPro}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}

      {showForm && (
        <PollModal
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

// ─── PollCard ─────────────────────────────────────────────────────────────────

function PollCard({
  poll, userId, orgSlug, isAdmin, isPro, focused,
  onVote, onEdit, onDelete, onClose, onPublish, onNotify,
}: {
  poll: Poll;
  userId: string;
  orgSlug: string;
  isAdmin: boolean;
  isPro: boolean;
  focused: boolean;
  onVote: (ids: string[]) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
  onClose?: () => void;
  onPublish?: () => void;
  onNotify?: () => Promise<void>;
}) {
  const [selected, setSelected]         = useState<string[]>([]);
  const [submitting, setSubmitting]     = useState(false);
  const [changingVote, setChangingVote] = useState(false);
  const [showVoters, setShowVoters]     = useState(false);
  const [copied, setCopied]             = useState(false);
  const [notifyState, setNotifyState]   = useState<NotifyState>('idle');
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (focused && cardRef.current) {
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [focused]);

  const myVote      = poll.votes?.[userId];
  const hasVoted    = !!myVote;
  const totalVotes  = Object.keys(poll.votes ?? {}).length;
  const counts      = getOptionCounts(poll);
  const showResults = hasVoted || poll.status !== 'active';
  const canVote     = poll.status === 'active' && !hasVoted;

  const handleToggle = (optId: string) => {
    if (poll.voteType === 'single') {
      setSelected([optId]);
    } else {
      setSelected((prev) =>
        prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId],
      );
    }
  };

  const handleSubmit = async () => {
    if (selected.length === 0) return;
    setSubmitting(true);
    await onVote(selected);
    setSubmitting(false);
    setChangingVote(false);
  };

  const handleNotifyConfirm = async () => {
    if (!onNotify) return;
    setNotifyState('sending');
    try { await onNotify(); setNotifyState('sent'); setTimeout(() => setNotifyState('idle'), 4000); }
    catch { setNotifyState('error'); setTimeout(() => setNotifyState('idle'), 4000); }
  };

  return (
    <article ref={cardRef} className={`bg-white border rounded-lg overflow-hidden ${focused ? 'border-stone-900 ring-2 ring-stone-900/10' : 'border-stone-200'}`}>
      <div className="p-5">

        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            {poll.status === 'draft' && (
              <span className="text-[10px] uppercase tracking-widest font-mono text-amber-600 mr-2">Draft</span>
            )}
            {poll.status === 'closed' && (
              <span className="text-[10px] uppercase tracking-widest font-mono text-stone-400 mr-2">Closed</span>
            )}
            <h3 className="font-display text-xl text-stone-900 leading-snug">{poll.title}</h3>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {poll.status === 'active' && (
              <>
                <button
                  onClick={() => copyShareLink(orgSlug, poll.id, setCopied)}
                  title="Copy share link"
                  className="p-1.5 rounded text-stone-300 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  {copied ? <span className="text-[10px] text-emerald-600 font-mono">Copied!</span> : <Link2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => sharePoll(poll, orgSlug)}
                  title="Share via WhatsApp"
                  className="p-1.5 rounded text-stone-300 hover:text-[#25D366] hover:bg-emerald-50 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => isPro ? setNotifyState('confirm') : undefined}
                    title={isPro ? 'Email members about this vote' : 'Pro feature — upgrade to send emails'}
                    className={`p-1.5 rounded transition-colors ${isPro ? 'text-stone-300 hover:text-stone-700 hover:bg-stone-100' : 'text-stone-200 cursor-not-allowed'}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
            {isAdmin && (
              <>
                {poll.status === 'draft' && onPublish && (
                  <button
                    onClick={onPublish}
                    className="px-2 py-1 text-[10px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 uppercase tracking-wider mr-1"
                  >
                    Publish
                  </button>
                )}
                <button onClick={onEdit} className="p-1.5 rounded text-stone-300 hover:text-stone-700 hover:bg-stone-100">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {poll.status === 'active' && onClose && (
                  <button onClick={onClose} title="Close voting" className="p-1.5 rounded text-stone-300 hover:text-amber-600 hover:bg-amber-50">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={onDelete} className="p-1.5 rounded text-stone-300 hover:text-red-500 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {poll.description && (
          <p className="text-sm text-stone-600 mb-3 leading-relaxed">{poll.description}</p>
        )}

        <div className="flex items-center gap-3 text-[11px] text-stone-400 font-mono uppercase tracking-wider mb-4">
          <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
          {poll.voteType === 'multiple' && <span>· Multi-choice</span>}
          {poll.deadline && <span>· Closes {poll.deadline}</span>}
        </div>

        {/* Email notify strip */}
        {notifyState !== 'idle' && (
          <div className="mb-4 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-md">
            {notifyState === 'confirm' && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-stone-700">Email all active members about this vote?</span>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setNotifyState('idle')} className="text-xs text-stone-500 hover:text-stone-900">Cancel</button>
                  <button onClick={handleNotifyConfirm} className="text-xs font-medium text-white bg-stone-900 px-2.5 py-1 rounded hover:bg-stone-700">Send emails</button>
                </div>
              </div>
            )}
            {notifyState === 'sending' && <p className="text-xs text-stone-500">Sending emails…</p>}
            {notifyState === 'sent'    && <p className="text-xs text-emerald-600 font-medium">Emails sent to all active members.</p>}
            {notifyState === 'error'   && <p className="text-xs text-red-500">Failed to send. Please try again.</p>}
          </div>
        )}

        {/* Voting UI */}
        {(canVote || changingVote) ? (
          <div className="space-y-2">
            {poll.options.map((opt) => {
              const sel = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => handleToggle(opt.id)}
                  className={`w-full text-left px-4 py-3 border rounded-md text-sm transition-colors ${
                    sel
                      ? 'border-stone-900 bg-stone-900 text-stone-50'
                      : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-400 hover:bg-white'
                  }`}
                >
                  <span className="mr-2 text-base leading-none">{sel ? '●' : '○'}</span>
                  {opt.text}
                </button>
              );
            })}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSubmit}
                disabled={selected.length === 0 || submitting}
                className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-40 rounded"
              >
                {submitting ? 'Submitting…' : 'Cast vote'}
              </button>
              {changingVote && (
                <button onClick={() => { setChangingVote(false); setSelected([]); }} className="text-sm text-stone-400 hover:text-stone-700">
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : showResults ? (
          <div className="space-y-3">
            {poll.options.map((opt) => {
              const count     = counts[opt.id] ?? 0;
              const pct       = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isMyPick  = myVote?.optionIds.includes(opt.id);
              return (
                <div key={opt.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`flex items-center gap-1.5 ${isMyPick ? 'font-medium text-stone-900' : 'text-stone-600'}`}>
                      {isMyPick && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      {opt.text}
                    </span>
                    <span className="font-mono text-xs text-stone-400 shrink-0 ml-2">{count} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isMyPick ? 'bg-stone-900' : 'bg-stone-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {poll.status === 'active' && hasVoted && (
              <button
                onClick={() => { setChangingVote(true); setSelected(myVote?.optionIds ?? []); }}
                className="mt-1 text-xs text-stone-400 underline hover:text-stone-700"
              >
                Change vote
              </button>
            )}
          </div>
        ) : null}

        {/* Admin voter list */}
        {isAdmin && totalVotes > 0 && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            <button
              onClick={() => setShowVoters((v) => !v)}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700"
            >
              {showVoters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showVoters ? 'Hide' : 'Show'} voters ({totalVotes})
            </button>
            {showVoters && (
              <div className="mt-2 border border-stone-100 rounded-md overflow-hidden">
                {Object.entries(poll.votes ?? {}).map(([uid, vote]) => (
                  <div key={uid} className="flex items-center justify-between px-3 py-2 text-xs border-b border-stone-50 last:border-0">
                    <span className="text-stone-700 font-medium">{vote.voterName}</span>
                    <span className="text-stone-500 text-right">
                      {vote.optionIds.map((id) => poll.options.find((o) => o.id === id)?.text ?? id).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ─── ClosedSection ────────────────────────────────────────────────────────────

function ClosedSection({
  polls, userId, orgSlug, isAdmin, isPro, onDelete,
}: {
  polls: Poll[];
  userId: string;
  orgSlug: string;
  isAdmin: boolean;
  isPro: boolean;
  onDelete: (poll: Poll) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-stone-400 hover:text-stone-700"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        Closed polls · {polls.length}
      </button>
      {open && polls.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          userId={userId}
          orgSlug={orgSlug}
          isAdmin={isAdmin}
          isPro={isPro}
          focused={false}
          onVote={async () => {}}
          onEdit={() => {}}
          onDelete={() => onDelete(poll)}
        />
      ))}
    </section>
  );
}

// ─── PollModal ────────────────────────────────────────────────────────────────

function PollModal({
  org, user, editing, onClose, onSaved,
}: {
  org: Organization;
  user: AuthUser;
  editing: Poll | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title,       setTitle]       = useState(editing?.title       ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [voteType,    setVoteType]    = useState<VoteType>(editing?.voteType ?? 'single');
  const [deadline,    setDeadline]    = useState(editing?.deadline    ?? '');
  const [status,      setStatus]      = useState<PollStatus>(editing?.status ?? 'draft');
  const [options, setOptions] = useState<PollOption[]>(
    editing?.options?.length
      ? editing.options
      : [
          { id: `o_${Math.random().toString(36).slice(2, 7)}`, text: '' },
          { id: `o_${Math.random().toString(36).slice(2, 7)}`, text: '' },
        ],
  );
  const [saving, setSaving] = useState(false);

  const isEdit   = editing !== null;
  const validOpts = options.filter((o) => o.text.trim());
  const canSave  = title.trim() && validOpts.length >= 2;

  const addOption = () =>
    setOptions((prev) => [...prev, { id: `o_${Math.random().toString(36).slice(2, 7)}`, text: '' }]);

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOption = (id: string, text: string) =>
    setOptions((prev) => prev.map((o) => o.id === id ? { ...o, text } : o));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      options: validOpts.map((o) => ({ ...o, text: o.text.trim() })),
      voteType,
      status,
      deadline: deadline || undefined,
    };
    if (isEdit) {
      await updatePoll(org.id, editing.id, data);
    } else {
      await createPoll(org.id, { ...data, createdBy: user.displayName, createdByUid: user.uid });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg border border-stone-200 shadow-2xl rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">{isEdit ? 'Edit vote' : 'New vote'}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Question / Title <span className="text-red-400">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Should we update the dues for 2027?"
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add context or background for this vote"
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-2">Vote type</label>
            <div className="flex gap-2">
              {(['single', 'multiple'] as VoteType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setVoteType(t)}
                  className={`flex-1 px-3 py-2.5 text-sm border rounded transition-colors ${
                    voteType === t
                      ? 'bg-stone-900 text-stone-50 border-stone-900'
                      : 'bg-white text-stone-700 border-stone-300 hover:border-stone-500'
                  }`}
                >
                  {t === 'single' ? 'Single choice' : 'Multiple choice'}
                  <span className={`block text-[10px] font-normal mt-0.5 ${voteType === t ? 'text-stone-400' : 'text-stone-400'}`}>
                    {t === 'single' ? 'Pick one option' : 'Pick all that apply'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-2">Options <span className="text-red-400">*</span></label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 w-5 text-right shrink-0">{i + 1}.</span>
                  <input
                    value={opt.text}
                    onChange={(e) => updateOption(opt.id, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                  {options.length > 2 && (
                    <button onClick={() => removeOption(opt.id)} className="text-stone-300 hover:text-red-500 p-1 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 8 && (
                <button onClick={addOption} className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 ml-7 mt-1">
                  <Plus className="w-3 h-3" /> Add option
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-600 block mb-1.5">Deadline (optional)</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
            <div>
              <label className="text-xs text-stone-600 block mb-1.5">Publish as</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PollStatus)}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white"
              >
                <option value="draft">Draft (admin only)</option>
                <option value="active">Active (open for voting)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-between">
          <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-900">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-40 rounded"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create vote'}
          </button>
        </div>
      </div>
    </div>
  );
}
