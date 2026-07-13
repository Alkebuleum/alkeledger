import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, X, Pencil, Trash2, BarChart2,
  ChevronDown, ChevronUp, Link2, Mail, MessageCircle, CheckCircle2, Scale,
} from 'lucide-react';
import { listPolls, createPoll, updatePoll, deletePoll, castVote, notifyPollMembers } from '@/services/votes';
import { notifyCreated } from '@/services/notifications';
import { listPositions } from '@/services/positions';
import { can, useRole } from '@/hooks/useRole';
import type { Poll, PollOption, PollStatus, VoteType, Organization, LedgerEntry } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

const PROPOSAL_CATEGORIES = [
  'New project', 'Project funding', 'Budget change', 'Leadership appointment',
  'Policy change', 'New member approval', 'Position issuance', 'Position transfer',
  'Benefit distribution', 'Asset purchase', 'Asset sale', 'Partnership',
  'Contract approval', 'Emergency action', 'Other',
];

interface Props {
  org: Organization;
  user: AuthUser;
  ledger: LedgerEntry[];
  onCreateEntry: (entry: LedgerEntry) => Promise<void>;
}

function winnerSummary(poll: Poll, unitsByMember?: Record<string, number>): string {
  const counts = getOptionCounts(poll, unitsByMember);
  const total = unitsByMember
    ? Object.values(counts).reduce((s, v) => s + v, 0)
    : Object.keys(poll.votes ?? {}).length;
  const max = Math.max(0, ...Object.values(counts));
  const winners = poll.options.filter((o) => max > 0 && counts[o.id] === max);
  const label = winners.length > 1
    ? `Tied: ${winners.map((w) => `"${w.text}"`).join(' / ')}`
    : winners.length === 1
      ? `"${winners[0].text}"`
      : 'No votes cast';
  return `${poll.title} — ${label} (${max} of ${total} votes)`;
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

function getOptionCounts(poll: Poll, unitsByMember?: Record<string, number>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const opt of poll.options) counts[opt.id] = 0;
  for (const [uid, vote] of Object.entries(poll.votes ?? {})) {
    const weight = unitsByMember ? unitsByMember[uid] ?? 0 : 1;
    for (const id of vote.optionIds) counts[id] = (counts[id] ?? 0) + weight;
  }
  return counts;
}

type NotifyState = 'idle' | 'confirm' | 'sending' | 'sent' | 'error';

// ─── Main page ────────────────────────────────────────────────────────────────

export function Votes({ org, user, ledger, onCreateEntry }: Props) {
  const role = useRole(org.id, user.uid);
  const [polls, setPolls]     = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Poll | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [unitsByMember, setUnitsByMember] = useState<Record<string, number> | undefined>(undefined);

  const focusPollId = searchParams.get('openPoll');

  const votingModel = org.cooperativeConfig?.votingModel;
  const isWeightedVoting = votingModel === 'unitWeighted' || votingModel === 'contributionWeighted';

  const reload = () => {
    setLoading(true);
    listPolls(org.id).then((ps) => { setPolls(ps); setLoading(false); });
  };

  useEffect(() => { reload(); }, [org.id]);

  useEffect(() => {
    if (!isWeightedVoting) { setUnitsByMember(undefined); return; }
    listPositions(org.id).then((positions) => {
      const map: Record<string, number> = {};
      for (const p of positions) {
        if (p.status === 'active') map[p.memberId] = (map[p.memberId] ?? 0) + p.units;
      }
      setUnitsByMember(map);
    });
  }, [org.id, isWeightedVoting]);

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
    const orgSlug = org.slug ?? org.id;
    notifyCreated(org.id, 'poll', poll.title, poll.description?.slice(0, 120) ?? '', `/${orgSlug}/proposals?openPoll=${poll.id}`);
    reload();
  };

  const handleClose = async (poll: Poll) => {
    if (!confirm(`Close voting on "${poll.title}"? Members won't be able to vote after this.`)) return;
    await updatePoll(org.id, poll.id, { status: 'closed' });
    reload();
  };

  const handleLogDecision = async (poll: Poll) => {
    if (!confirm(`Log "${poll.title}" as a permanent decision record? This creates a sealed ledger entry that goes through the same approve → anchor workflow as everything else.`)) return;
    const entry: LedgerEntry = {
      id: 'le_' + Math.random().toString(36).slice(2, 7),
      orgId: org.id,
      recordType: 'decision',
      pollId: poll.id,
      type: 'expense',
      amount: 0,
      currency: org.currency,
      category: 'Vote outcome',
      description: winnerSummary(poll, unitsByMember),
      status: 'pending',
      createdBy: user.displayName,
      createdByUid: user.uid,
      createdAt: new Date().toISOString().slice(0, 10),
      anchorStatus: 'not_anchored',
    };
    await onCreateEntry(entry);
  };

  const loggedPollIds = new Set(ledger.filter((e) => e.pollId).map((e) => e.pollId));

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
          <h2 className="font-display text-2xl mt-0.5">Proposals</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-3 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-md flex items-center gap-1.5 hover:bg-stone-800"
          >
            <Plus className="w-4 h-4" /> New proposal
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-stone-400 text-sm">Loading…</div>
      ) : polls.length === 0 ? (
        <div className="py-16 text-center text-stone-400">
          <BarChart2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No proposals yet.</p>
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
                  unitsByMember={unitsByMember}
                  positionLabel={org.cooperativeConfig?.positionLabel}
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
                  unitsByMember={unitsByMember}
                  positionLabel={org.cooperativeConfig?.positionLabel}
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
              unitsByMember={unitsByMember}
              positionLabel={org.cooperativeConfig?.positionLabel}
              onDelete={handleDelete}
              loggedPollIds={loggedPollIds}
              onLogDecision={handleLogDecision}
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
  poll, userId, orgSlug, isAdmin, isPro, focused, unitsByMember, positionLabel,
  onVote, onEdit, onDelete, onClose, onPublish, onNotify,
  decisionLogged, onLogDecision,
}: {
  poll: Poll;
  userId: string;
  orgSlug: string;
  isAdmin: boolean;
  isPro: boolean;
  focused: boolean;
  unitsByMember?: Record<string, number>;
  positionLabel?: string;
  onVote: (ids: string[]) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
  onClose?: () => void;
  onPublish?: () => void;
  onNotify?: () => Promise<void>;
  decisionLogged?: boolean;
  onLogDecision?: () => void;
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
  const ballots     = Object.keys(poll.votes ?? {}).length;
  const counts      = getOptionCounts(poll, unitsByMember);
  const totalVotes  = unitsByMember ? Object.values(counts).reduce((s, v) => s + v, 0) : ballots;
  const unitLabel   = positionLabel ?? 'unit';
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
                  className="p-1.5 rounded-md text-stone-300 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  {copied ? <span className="text-[10px] text-emerald-600 font-mono">Copied!</span> : <Link2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => sharePoll(poll, orgSlug)}
                  title="Share via WhatsApp"
                  className="p-1.5 rounded-md text-stone-300 hover:text-[#25D366] hover:bg-emerald-50 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => isPro ? setNotifyState('confirm') : undefined}
                    title={isPro ? 'Email members about this vote' : 'Pro feature — upgrade to send emails'}
                    className={`p-1.5 rounded-md transition-colors ${isPro ? 'text-stone-300 hover:text-stone-700 hover:bg-stone-100' : 'text-stone-200 cursor-not-allowed'}`}
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
                <button onClick={onEdit} className="p-1.5 rounded-md text-stone-300 hover:text-stone-700 hover:bg-stone-100">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {poll.status === 'active' && onClose && (
                  <button onClick={onClose} title="Close voting" className="p-1.5 rounded-md text-stone-300 hover:text-amber-600 hover:bg-amber-50">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={onDelete} className="p-1.5 rounded-md text-stone-300 hover:text-red-500 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {poll.description && (
          <p className="text-sm text-stone-600 mb-3 leading-relaxed">{poll.description}</p>
        )}

        {(poll.proposalCategory || poll.requestedBudget || poll.fundingSource || poll.timelineNote) && (
          <div className="mb-3 p-3 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-600 space-y-1">
            {poll.proposalCategory && (
              <div><span className="text-stone-400">Category:</span> <span className="font-medium text-stone-800">{poll.proposalCategory}</span></div>
            )}
            {poll.requestedBudget != null && (
              <div><span className="text-stone-400">Requested budget:</span> <span className="font-medium text-stone-800">{poll.requestedBudget.toLocaleString()}</span></div>
            )}
            {poll.fundingSource && (
              <div><span className="text-stone-400">Funding source:</span> <span className="font-medium text-stone-800">{poll.fundingSource}</span></div>
            )}
            {poll.timelineNote && (
              <div><span className="text-stone-400">Timeline:</span> <span className="text-stone-700">{poll.timelineNote}</span></div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] text-stone-400 font-mono uppercase tracking-wider mb-4">
          <span>{ballots} vote{ballots !== 1 ? 's' : ''}{unitsByMember ? ` · ${totalVotes} ${unitLabel}${totalVotes === 1 ? '' : 's'}` : ''}</span>
          {poll.voteType === 'multiple' && <span>· Multi-choice</span>}
          {poll.deadline && <span>· Closes {poll.deadline}</span>}
        </div>

        {/* Email notify strip */}
        {notifyState !== 'idle' && (
          <div className="mb-4 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-md">
            {notifyState === 'confirm' && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-stone-700">Email all active members about this vote?</span>
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
                    <span className="font-mono text-xs text-stone-400 shrink-0 ml-2">
                      {count}{unitsByMember ? ` ${unitLabel}${count === 1 ? '' : 's'}` : ''} · {pct}%
                    </span>
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
        {isAdmin && ballots > 0 && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            <button
              onClick={() => setShowVoters((v) => !v)}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700"
            >
              {showVoters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showVoters ? 'Hide' : 'Show'} voters ({ballots})
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

        {/* Log as permanent decision — closed polls only, explicit opt-in */}
        {poll.status === 'closed' && onLogDecision && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            {decisionLogged ? (
              <span className="flex items-center gap-1.5 text-xs text-stone-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Logged as a decision record
              </span>
            ) : isAdmin ? (
              <button
                onClick={onLogDecision}
                disabled={totalVotes === 0}
                className="flex items-center gap-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed"
                title={totalVotes === 0 ? 'No votes were cast on this proposal' : undefined}
              >
                <Scale className="w-3.5 h-3.5" /> Log as decision
              </button>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

// ─── ClosedSection ────────────────────────────────────────────────────────────

function ClosedSection({
  polls, userId, orgSlug, isAdmin, isPro, unitsByMember, positionLabel, onDelete, loggedPollIds, onLogDecision,
}: {
  polls: Poll[];
  userId: string;
  orgSlug: string;
  isAdmin: boolean;
  isPro: boolean;
  unitsByMember?: Record<string, number>;
  positionLabel?: string;
  onDelete: (poll: Poll) => void;
  loggedPollIds: Set<string | undefined>;
  onLogDecision: (poll: Poll) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-stone-400 hover:text-stone-700"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        Closed proposals · {polls.length}
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
          unitsByMember={unitsByMember}
          positionLabel={positionLabel}
          onVote={async () => {}}
          onEdit={() => {}}
          onDelete={() => onDelete(poll)}
          decisionLogged={loggedPollIds.has(poll.id)}
          onLogDecision={() => onLogDecision(poll)}
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
  const [proposalCategory, setProposalCategory] = useState(editing?.proposalCategory ?? '');
  const [requestedBudget,  setRequestedBudget]  = useState(editing?.requestedBudget?.toString() ?? '');
  const [fundingSource,    setFundingSource]    = useState(editing?.fundingSource ?? '');
  const [timelineNote,     setTimelineNote]     = useState(editing?.timelineNote ?? '');
  const isCooperative = org.type === 'cooperative';
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
      ...(isCooperative ? {
        proposalCategory: proposalCategory || undefined,
        requestedBudget: requestedBudget ? parseFloat(requestedBudget) : undefined,
        fundingSource: fundingSource.trim() || undefined,
        timelineNote: timelineNote.trim() || undefined,
      } : {}),
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
          <h3 className="font-display text-xl">{isEdit ? 'Edit proposal' : 'New proposal'}</h3>
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

          {isCooperative && (
            <div className="space-y-4 p-4 bg-stone-50 border border-stone-200 rounded-md">
              <div className="text-[11px] uppercase tracking-widest text-stone-400 font-mono">Proposal details</div>
              <div>
                <label className="text-xs text-stone-600 block mb-1.5">Category</label>
                <select
                  value={proposalCategory}
                  onChange={(e) => setProposalCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white"
                >
                  <option value="">None</option>
                  {PROPOSAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-600 block mb-1.5">Requested budget</label>
                  <input
                    type="number"
                    min="0"
                    value={requestedBudget}
                    onChange={(e) => setRequestedBudget(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-600 block mb-1.5">Funding source</label>
                  <input
                    value={fundingSource}
                    onChange={(e) => setFundingSource(e.target.value)}
                    placeholder="e.g. General Fund"
                    className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-stone-600 block mb-1.5">Timeline</label>
                <textarea
                  value={timelineNote}
                  onChange={(e) => setTimelineNote(e.target.value)}
                  rows={2}
                  placeholder="Expected timeline / milestones"
                  className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
                />
              </div>
            </div>
          )}

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
            className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-md hover:bg-stone-800 disabled:opacity-40"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create vote'}
          </button>
        </div>
      </div>
    </div>
  );
}
