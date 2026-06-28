import { useEffect, useMemo, useState } from 'react';
import {
  Wallet, CheckCircle2, AlertCircle, Clock, Plus, X, Pencil,
  Upload, Eye, ThumbsUp, ThumbsDown, ImageIcon,
} from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { Panel } from '@/components/Panel';
import { KPI } from '@/components/KPI';
import { fmt } from '@/lib/format';
import { listMembers } from '@/services/members';
import { listDuesPeriods, createDuesPeriod, updateDuesPeriod } from '@/services/dues';
import { uploadDuesReceipt } from '@/lib/storage';
import { can, useRole } from '@/hooks/useRole';
import type {
  DuesPeriod, DuesPeriodStatus, DuesType, LedgerEntry, LedgerStatus, Member, Organization,
} from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<DuesType, string> = {
  annual: 'Annual',
  quarterly: 'Quarterly',
  monthly: 'Monthly',
  emergency: 'Emergency',
  special: 'Special Assessment',
};

const TYPE_COLORS: Record<DuesType, string> = {
  annual:    'bg-violet-100 text-violet-700',
  quarterly: 'bg-blue-100 text-blue-700',
  monthly:   'bg-sky-100 text-sky-700',
  emergency: 'bg-red-100 text-red-700',
  special:   'bg-amber-100 text-amber-700',
};

const STATUS_ORDER: Record<DuesPeriodStatus, number> = { active: 0, upcoming: 1, closed: 2 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deadlineLabel(deadline: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (deadline < today) return 'Overdue';
  const days = Math.round(
    (new Date(deadline + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000,
  );
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 14) return `Due in ${days}d`;
  return deadline;
}

function isOverdue(deadline: string): boolean {
  return deadline < new Date().toISOString().slice(0, 10);
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PeriodFormData = {
  name: string;
  type: DuesType;
  amountIndividual: number;
  amountOrganization: number;
  periodStart?: string;
  periodEnd?: string;
  deadline: string;
  status: DuesPeriodStatus;
};

interface Props {
  org: Organization;
  ledger: LedgerEntry[];
  user: AuthUser;
  onRecordPayment: (entry: LedgerEntry) => Promise<void>;
  onApprove: (entryId: string, status: LedgerStatus) => Promise<void>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Dues({ org, ledger, user, onRecordPayment, onApprove }: Props) {
  const role = useRole(org.id, user.uid);
  const isAdmin = can.manage(role);

  const [periods, setPeriods] = useState<DuesPeriod[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<DuesPeriod | null>(null);
  const [showSubmitPayment, setShowSubmitPayment] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listDuesPeriods(org.id), listMembers(org.id)]).then(([ps, ms]) => {
      const sorted = [...ps].sort(
        (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9),
      );
      setPeriods(sorted);
      setMembers(ms);
      if (sorted.length > 0) {
        const first = sorted.find((p) => p.status === 'active' || p.status === 'upcoming') ?? sorted[0];
        setSelectedId((id) => id ?? first.id);
      }
    });
  }, [org.id]);

  const selectedPeriod = periods.find((p) => p.id === selectedId) ?? null;
  const activeMembers = members.filter((m) => m.status === 'active');

  // Members with approved/anchored entries → "paid"
  const paidSet = useMemo(() => new Set(
    ledger
      .filter((e) =>
        e.category === 'Dues' &&
        e.duesPeriodId === selectedPeriod?.id &&
        (e.status === 'approved' || e.status === 'anchored'),
      )
      .map((e) => e.memberId)
      .filter((id): id is string => Boolean(id)),
  ), [ledger, selectedPeriod]);

  // Entries submitted by members waiting for admin review
  const pendingEntries = useMemo(() =>
    selectedPeriod
      ? ledger.filter((e) =>
          e.category === 'Dues' &&
          e.duesPeriodId === selectedPeriod.id &&
          e.status === 'pending',
        )
      : [],
  [ledger, selectedPeriod]);

  // Members with no entry at all (not paid, not pending)
  const notSubmitted = useMemo(() => {
    const accountedFor = new Set([
      ...Array.from(paidSet),
      ...pendingEntries.map((e) => e.memberId).filter((id): id is string => Boolean(id)),
    ]);
    return activeMembers.filter((m) => !accountedFor.has(m.id));
  }, [activeMembers, paidSet, pendingEntries]);

  // All entries for selected period (for payment history)
  const periodEntries = useMemo(() =>
    selectedPeriod
      ? ledger.filter((e) => e.category === 'Dues' && e.duesPeriodId === selectedPeriod.id)
      : [],
  [ledger, selectedPeriod]);

  const collected = periodEntries
    .filter((e) => e.status === 'approved' || e.status === 'anchored')
    .reduce((s, e) => s + e.amount, 0);

  const paid = activeMembers.filter((m) => paidSet.has(m.id));
  const outstanding = pendingEntries.length + notSubmitted.length;

  // Current user's most relevant entry for this period
  const myEntry = useMemo(() => {
    if (!selectedPeriod) return null;
    const mine = ledger.filter(
      (e) => e.category === 'Dues' && e.duesPeriodId === selectedPeriod.id && e.memberId === user.uid,
    );
    return (
      mine.find((e) => e.status === 'pending') ??
      mine.find((e) => e.status === 'approved' || e.status === 'anchored') ??
      mine.find((e) => e.status === 'rejected') ??
      null
    );
  }, [ledger, selectedPeriod, user.uid]);

  const myRate = useMemo(() => {
    if (!selectedPeriod) return 0;
    const me = members.find((m) => m.id === user.uid);
    return me?.memberType === 'organization'
      ? selectedPeriod.amountOrganization
      : selectedPeriod.amountIndividual;
  }, [selectedPeriod, members, user.uid]);

  function cardStats(p: DuesPeriod) {
    const paidIds = new Set(
      ledger
        .filter((e) => e.category === 'Dues' && e.duesPeriodId === p.id && (e.status === 'approved' || e.status === 'anchored'))
        .map((e) => e.memberId).filter(Boolean),
    );
    const collectedAmt = ledger
      .filter((e) => e.category === 'Dues' && e.duesPeriodId === p.id && (e.status === 'approved' || e.status === 'anchored'))
      .reduce((s, e) => s + e.amount, 0);
    return { paidCount: paidIds.size, collectedAmt };
  }

  // Admin: record payment directly (cash etc.) → approved immediately
  const handleAdminMarkPaid = async (member: Member) => {
    if (!selectedPeriod) return;
    const amount = member.memberType === 'organization'
      ? selectedPeriod.amountOrganization
      : selectedPeriod.amountIndividual;
    await onRecordPayment({
      id: 'le_' + Math.random().toString(36).slice(2, 7),
      orgId: org.id,
      type: 'income',
      amount,
      currency: org.currency,
      category: 'Dues',
      description: `${selectedPeriod.name} — ${member.name}`,
      memberId: member.id,
      duesPeriodId: selectedPeriod.id,
      status: 'approved',
      createdBy: user.displayName,
      createdByUid: user.uid,
      createdAt: new Date().toISOString().slice(0, 10),
      anchorStatus: 'not_anchored',
    });
  };

  // Member: submit payment with optional receipt → pending
  const handleMemberSubmit = async (imageFile?: File) => {
    if (!selectedPeriod) return;
    let receiptUrl: string | undefined;
    if (imageFile) {
      receiptUrl = await uploadDuesReceipt(org.id, selectedPeriod.id, user.uid, imageFile);
    }
    const me = members.find((m) => m.id === user.uid);
    await onRecordPayment({
      id: 'le_' + Math.random().toString(36).slice(2, 7),
      orgId: org.id,
      type: 'income',
      amount: myRate,
      currency: org.currency,
      category: 'Dues',
      description: `${selectedPeriod.name} — ${me?.name ?? user.displayName}`,
      memberId: user.uid,
      duesPeriodId: selectedPeriod.id,
      status: 'pending',
      receiptUrl,
      createdBy: user.displayName,
      createdByUid: user.uid,
      createdAt: new Date().toISOString().slice(0, 10),
      anchorStatus: 'not_anchored',
    });
    setShowSubmitPayment(false);
  };

  const handleSavePeriod = async (data: PeriodFormData) => {
    if (editingPeriod) {
      await updateDuesPeriod(org.id, editingPeriod.id, data);
      setPeriods((prev) =>
        [...prev.map((p) => (p.id === editingPeriod.id ? { ...p, ...data } : p))].sort(
          (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9),
        ),
      );
    } else {
      const newPeriod = await createDuesPeriod(org.id, { ...data, createdBy: user.displayName });
      setPeriods((prev) =>
        [newPeriod, ...prev].sort(
          (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9),
        ),
      );
      setSelectedId(newPeriod.id);
    }
    setShowForm(false);
    setEditingPeriod(null);
  };

  const myPaid = myEntry?.status === 'approved' || myEntry?.status === 'anchored';

  return (
    <div className="p-4 sm:p-8 max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Dues Periods</span>
        {isAdmin && (
          <button
            onClick={() => { setEditingPeriod(null); setShowForm(true); }}
            className="px-3 py-1.5 bg-stone-900 text-stone-50 text-xs font-medium rounded-md flex items-center gap-1.5 hover:bg-stone-800"
          >
            <Plus className="w-3.5 h-3.5" /> New period
          </button>
        )}
      </div>

      {/* Period cards */}
      {periods.length === 0 ? (
        <div className="border border-dashed border-stone-300 rounded-lg p-12 text-center space-y-3">
          <p className="text-stone-500 text-sm">No dues periods configured yet.</p>
          {isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-md hover:bg-stone-800"
            >
              Create first period
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {periods.map((p) => {
            const { paidCount, collectedAmt } = cardStats(p);
            return (
              <PeriodCard
                key={p.id}
                period={p}
                isSelected={p.id === selectedId}
                paidCount={paidCount}
                totalCount={activeMembers.length}
                collected={collectedAmt}
                currency={org.currency}
                onClick={() => setSelectedId(p.id)}
              />
            );
          })}
        </div>
      )}

      {/* Selected period detail */}
      {selectedPeriod && (
        <>
          {/* Period title */}
          <div className="flex items-start gap-3 pt-2 border-t border-stone-200">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-xl text-stone-900">{selectedPeriod.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[selectedPeriod.type]}`}>
                  {TYPE_LABELS[selectedPeriod.type]}
                </span>
                <StatusPill value={selectedPeriod.status} />
              </div>
              <div className="text-xs text-stone-500 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                {selectedPeriod.periodStart && selectedPeriod.periodEnd && (
                  <span>Covers {selectedPeriod.periodStart} → {selectedPeriod.periodEnd}</span>
                )}
                <span>
                  Deadline:{' '}
                  <span className={isOverdue(selectedPeriod.deadline) ? 'text-rose-600 font-medium' : ''}>
                    {selectedPeriod.deadline}
                  </span>
                </span>
                {selectedPeriod.amountIndividual > 0 && (
                  <span>Individual: <strong>{fmt(selectedPeriod.amountIndividual, org.currency)}</strong></span>
                )}
                {selectedPeriod.amountOrganization > 0 && (
                  <span>Organization: <strong>{fmt(selectedPeriod.amountOrganization, org.currency)}</strong></span>
                )}
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => { setEditingPeriod(selectedPeriod); setShowForm(true); }}
                className="shrink-0 px-2.5 py-1.5 text-xs border border-stone-300 text-stone-600 rounded-md hover:bg-stone-50 flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPI label="Collected" value={fmt(collected, org.currency)} icon={Wallet} accent="emerald" />
            <KPI label="Paid" value={`${paid.length} / ${activeMembers.length}`} icon={CheckCircle2} accent="indigo" />
            <KPI label="Outstanding" value={`${outstanding}`} icon={AlertCircle} accent={outstanding > 0 ? 'rose' : 'stone'} />
            <KPI
              label="Deadline"
              value={deadlineLabel(selectedPeriod.deadline)}
              icon={Clock}
              accent={isOverdue(selectedPeriod.deadline) ? 'rose' : 'stone'}
            />
          </div>

          {/* My payment status (visible to everyone) */}
          {!myPaid && selectedPeriod.status !== 'closed' && (
            <MyPaymentCard
              myEntry={myEntry}
              rate={myRate}
              currency={org.currency}
              onSubmit={() => setShowSubmitPayment(true)}
              onViewReceipt={setViewingReceipt}
            />
          )}

          {/* Admin: pending review */}
          {isAdmin && pendingEntries.length > 0 && (
            <Panel title={`Pending review (${pendingEntries.length})`}>
              <div className="divide-y divide-stone-100">
                {pendingEntries.map((e) => {
                  const member = members.find((m) => m.id === e.memberId);
                  return (
                    <PendingReviewRow
                      key={e.id}
                      entry={e}
                      memberName={member?.name ?? e.createdBy}
                      onApprove={() => onApprove(e.id, 'approved')}
                      onReject={() => onApprove(e.id, 'rejected')}
                      onViewReceipt={e.receiptUrl ? () => setViewingReceipt(e.receiptUrl!) : undefined}
                    />
                  );
                })}
              </div>
            </Panel>
          )}

          {/* Admin: not submitted */}
          {isAdmin && notSubmitted.length > 0 && (
            <Panel title={`Not submitted (${notSubmitted.length})`}>
              <div className="divide-y divide-stone-100">
                {notSubmitted.map((m) => {
                  const rate = m.memberType === 'organization'
                    ? selectedPeriod.amountOrganization
                    : selectedPeriod.amountIndividual;
                  return (
                    <NotSubmittedRow
                      key={m.id}
                      member={m}
                      rate={rate}
                      currency={org.currency}
                      onMarkPaid={() => handleAdminMarkPaid(m)}
                    />
                  );
                })}
              </div>
            </Panel>
          )}

          {/* Payment history */}
          <Panel title={`Payment history (${periodEntries.length})`}>
            <div className="overflow-x-auto -mx-5 -mb-5">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-stone-50 text-[11px] uppercase tracking-widest text-stone-500">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Member</th>
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                    <th className="text-right px-5 py-3 font-medium">Amount</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {periodEntries.map((e) => {
                    const member = members.find((m) => m.id === e.memberId);
                    return (
                      <tr key={e.id} className="hover:bg-stone-50">
                        <td className="px-5 py-3 text-stone-900">{member?.name ?? e.description}</td>
                        <td className="px-5 py-3 text-stone-600">{e.createdAt}</td>
                        <td className="px-5 py-3 text-right font-medium text-emerald-700">
                          {fmt(e.amount, org.currency)}
                        </td>
                        <td className="px-5 py-3"><StatusPill value={e.status} /></td>
                        <td className="px-5 py-3 text-right">
                          {e.receiptUrl && (
                            <button
                              onClick={() => setViewingReceipt(e.receiptUrl!)}
                              className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 ml-auto"
                            >
                              <ImageIcon className="w-3 h-3" /> Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {periodEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-stone-400 text-sm">
                        No payments recorded for this period yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {/* Modals */}
      {showForm && (
        <PeriodFormModal
          org={org}
          existing={editingPeriod}
          onSave={handleSavePeriod}
          onClose={() => { setShowForm(false); setEditingPeriod(null); }}
        />
      )}

      {showSubmitPayment && selectedPeriod && (
        <SubmitPaymentModal
          period={selectedPeriod}
          rate={myRate}
          currency={org.currency}
          onSubmit={handleMemberSubmit}
          onClose={() => setShowSubmitPayment(false)}
        />
      )}

      {viewingReceipt && (
        <ReceiptViewModal url={viewingReceipt} onClose={() => setViewingReceipt(null)} />
      )}
    </div>
  );
}

// ─── Period card ──────────────────────────────────────────────────────────────

function PeriodCard({
  period, isSelected, paidCount, totalCount, collected, currency, onClick,
}: {
  period: DuesPeriod; isSelected: boolean;
  paidCount: number; totalCount: number; collected: number; currency: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border transition-all rounded-lg ${
        isSelected
          ? 'border-stone-900 bg-white shadow-sm ring-1 ring-stone-900'
          : 'border-stone-200 bg-white hover:border-stone-400'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-stone-900 leading-tight">{period.name}</span>
        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[period.type]}`}>
          {TYPE_LABELS[period.type]}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${
          period.status === 'active'   ? 'bg-emerald-100 text-emerald-700' :
          period.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                                         'bg-stone-100 text-stone-500'
        }`}>
          {period.status}
        </span>
        <span className={`text-xs ${isOverdue(period.deadline) ? 'text-rose-600 font-medium' : 'text-stone-500'}`}>
          Due {period.deadline}
        </span>
      </div>
      <div className="text-xs text-stone-600">
        <span className="font-medium">{paidCount}/{totalCount}</span> paid ·{' '}
        <span className="text-emerald-700 font-medium">{fmt(collected, currency)}</span>
      </div>
    </button>
  );
}

// ─── My payment card ──────────────────────────────────────────────────────────

function MyPaymentCard({
  myEntry, rate, currency, onSubmit, onViewReceipt,
}: {
  myEntry: LedgerEntry | null;
  rate: number;
  currency: string;
  onSubmit: () => void;
  onViewReceipt: (url: string) => void;
}) {
  const isPending  = myEntry?.status === 'pending';
  const isRejected = myEntry?.status === 'rejected';

  return (
    <div className={`rounded-lg border p-4 flex items-center gap-4 ${
      isPending  ? 'border-amber-200 bg-amber-50' :
      isRejected ? 'border-red-200 bg-red-50' :
                   'border-stone-200 bg-stone-50'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-stone-900 mb-0.5">Your payment</div>
        {isPending && (
          <div className="text-xs text-amber-700">
            Submitted {myEntry.createdAt} · Awaiting admin approval
            {myEntry.receiptUrl && (
              <button
                onClick={() => onViewReceipt(myEntry.receiptUrl!)}
                className="ml-2 underline hover:no-underline"
              >
                View receipt
              </button>
            )}
          </div>
        )}
        {isRejected && (
          <div className="text-xs text-red-700">
            Submission was rejected. Please resubmit with a valid receipt.
          </div>
        )}
        {!myEntry && (
          <div className="text-xs text-stone-600">
            {rate > 0 ? `Amount due: ${fmt(rate, currency)}` : 'Contact your admin for the amount due.'}
          </div>
        )}
      </div>
      {(!myEntry || isRejected) && (
        <button
          onClick={onSubmit}
          className="shrink-0 px-3 py-1.5 bg-stone-900 text-stone-50 text-xs font-medium rounded-md flex items-center gap-1.5 hover:bg-stone-800"
        >
          <Upload className="w-3 h-3" />
          {isRejected ? 'Resubmit' : 'Submit payment'}
        </button>
      )}
    </div>
  );
}

// ─── Pending review row ───────────────────────────────────────────────────────

function PendingReviewRow({
  entry, memberName, onApprove, onReject, onViewReceipt,
}: {
  entry: LedgerEntry; memberName: string;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  onViewReceipt?: () => void;
}) {
  const [deciding, setDeciding] = useState<'approve' | 'reject' | null>(null);

  const decide = async (action: 'approve' | 'reject') => {
    setDeciding(action);
    await (action === 'approve' ? onApprove() : onReject());
    setDeciding(null);
  };

  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-semibold shrink-0">
        {initials(memberName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-stone-900">{memberName}</div>
        <div className="text-xs text-stone-500 flex items-center gap-2">
          <span>Submitted {entry.createdAt}</span>
          {entry.amount > 0 && <span>· {fmt(entry.amount, entry.currency)}</span>}
          {onViewReceipt && (
            <button
              onClick={onViewReceipt}
              className="text-stone-500 hover:text-stone-900 flex items-center gap-0.5 underline"
            >
              <Eye className="w-3 h-3" /> Receipt
            </button>
          )}
          {!onViewReceipt && <span className="text-stone-400">No receipt attached</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => decide('approve')}
          disabled={deciding !== null}
          className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 flex items-center gap-1 disabled:opacity-50"
        >
          <ThumbsUp className="w-3 h-3" />
          {deciding === 'approve' ? '…' : 'Approve'}
        </button>
        <button
          onClick={() => decide('reject')}
          disabled={deciding !== null}
          className="px-2.5 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 flex items-center gap-1 disabled:opacity-50"
        >
          <ThumbsDown className="w-3 h-3" />
          {deciding === 'reject' ? '…' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

// ─── Not submitted row ────────────────────────────────────────────────────────

function NotSubmittedRow({
  member, rate, currency, onMarkPaid,
}: {
  member: Member; rate: number; currency: string;
  onMarkPaid: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    setSaving(true);
    await onMarkPaid();
    setSaving(false);
  };

  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-[10px] font-semibold shrink-0">
        {initials(member.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-stone-900">{member.name}</div>
        <div className="text-xs text-stone-500">
          {member.email}
          {rate > 0 && <span className="ml-2 text-stone-400">· Owes {fmt(rate, currency)}</span>}
        </div>
      </div>
      <button
        onClick={handle}
        disabled={saving}
        className="shrink-0 px-2.5 py-1 text-xs bg-stone-50 text-stone-700 border border-stone-300 rounded-md hover:bg-stone-100 flex items-center gap-1 disabled:opacity-50"
        title="Record as paid directly (e.g. cash payment)"
      >
        <CheckCircle2 className="w-3 h-3" />
        {saving ? '…' : 'Mark paid'}
      </button>
    </div>
  );
}

// ─── Submit payment modal (member) ────────────────────────────────────────────

function SubmitPaymentModal({
  period, rate, currency, onSubmit, onClose,
}: {
  period: DuesPeriod; rate: number; currency: string;
  onSubmit: (imageFile?: File) => Promise<void>;
  onClose: () => void;
}) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(imageFile ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md border border-stone-200 shadow-2xl">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">Submit payment</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Period + amount summary */}
          <div className="bg-stone-50 rounded-lg px-4 py-3 space-y-1">
            <div className="text-xs text-stone-500">Period</div>
            <div className="text-sm font-semibold text-stone-900">{period.name}</div>
            {rate > 0 && (
              <div className="text-xs text-stone-600">
                Amount due: <span className="font-semibold text-stone-900">{fmt(rate, currency)}</span>
              </div>
            )}
            <div className="text-xs text-stone-500">Deadline: {period.deadline}</div>
          </div>

          {/* Receipt upload */}
          <div>
            <label className="text-xs text-stone-600 block mb-1">
              Receipt / proof of payment <span className="text-stone-400">(optional but recommended)</span>
            </label>
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFile}
              />
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Receipt preview" className="w-full max-h-48 object-contain border border-stone-200 rounded" />
                  <div className="text-xs text-center text-stone-500 mt-1">Tap to change</div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center hover:border-stone-400 transition-colors">
                  <Upload className="w-6 h-6 text-stone-400 mx-auto mb-2" />
                  <div className="text-sm text-stone-500">Tap to upload a screenshot or photo</div>
                  <div className="text-xs text-stone-400 mt-1">PNG, JPG, PDF up to 10MB</div>
                </div>
              )}
            </label>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <p className="text-xs text-stone-400">
            Your payment will be marked as <strong>pending</strong> until an admin reviews and approves it.
          </p>

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-stone-200 rounded-md text-sm text-stone-600 hover:bg-stone-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-md hover:bg-stone-800 disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'Submit for review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Receipt view modal ───────────────────────────────────────────────────────

function ReceiptViewModal({ url, onClose }: { url: string; onClose: () => void }) {
  const isPdf = url.toLowerCase().includes('.pdf') || url.includes('application%2Fpdf');
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg border border-stone-200 shadow-2xl">
        <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-stone-900">Receipt</span>
          <div className="flex items-center gap-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" /> Open full size
            </a>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-900">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4">
          {isPdf ? (
            <div className="text-center py-8">
              <p className="text-sm text-stone-600 mb-3">PDF receipt attached.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-md hover:bg-stone-800"
              >
                Open PDF
              </a>
            </div>
          ) : (
            <img src={url} alt="Receipt" className="w-full max-h-[60vh] object-contain" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Period form modal (admin) ────────────────────────────────────────────────

function PeriodFormModal({
  org, existing, onSave, onClose,
}: {
  org: Organization;
  existing: DuesPeriod | null;
  onSave: (data: PeriodFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<DuesType>(existing?.type ?? 'annual');
  const [periodStart, setPeriodStart] = useState(existing?.periodStart ?? '');
  const [periodEnd, setPeriodEnd] = useState(existing?.periodEnd ?? '');
  const [deadline, setDeadline] = useState(existing?.deadline ?? '');
  const [amtInd, setAmtInd] = useState(
    existing?.amountIndividual != null ? String(existing.amountIndividual)
      : org.duesRates?.individual ? String(org.duesRates.individual) : '',
  );
  const [amtOrg, setAmtOrg] = useState(
    existing?.amountOrganization != null ? String(existing.amountOrganization)
      : org.duesRates?.organization ? String(org.duesRates.organization) : '',
  );
  const [status, setStatus] = useState<DuesPeriodStatus>(existing?.status ?? 'active');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !deadline) return;
    setSaving(true);
    await onSave({
      name, type,
      periodStart: periodStart || undefined,
      periodEnd: periodEnd || undefined,
      deadline,
      amountIndividual: parseFloat(amtInd) || 0,
      amountOrganization: parseFloat(amtOrg) || 0,
      status,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg border border-stone-200 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">{existing ? 'Edit period' : 'New dues period'}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-stone-600 block mb-1">Name *</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2026 Annual Dues, Emergency Fund May 2026"
              required
              className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1">Type *</label>
            <select
              value={type} onChange={(e) => setType(e.target.value as DuesType)}
              className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white"
            >
              {(Object.entries(TYPE_LABELS) as [DuesType, string][]).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1">
              Period covers <span className="text-stone-400">(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-stone-400 block mb-1">Start</label>
                <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
              </div>
              <div>
                <label className="text-[11px] text-stone-400 block mb-1">End</label>
                <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
              </div>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">The date range this collection is for (e.g. Jan 1 – Dec 31 for annual dues).</p>
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1">Payment deadline *</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required
              className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
            <p className="text-[11px] text-stone-400 mt-1">When payment must be received by.</p>
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1">Amount per member ({org.currency})</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-stone-500 block mb-1">Individual</label>
                <input type="number" min="0" step="0.01" value={amtInd} onChange={(e) => setAmtInd(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
              </div>
              <div>
                <label className="text-[11px] text-stone-500 block mb-1">Organization</label>
                <input type="number" min="0" step="0.01" value={amtOrg} onChange={(e) => setAmtOrg(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1">Status</label>
            <div className="flex gap-2">
              {(['upcoming', 'active', 'closed'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`flex-1 px-3 py-2 text-xs font-medium border rounded-md capitalize ${
                    status === s ? 'bg-stone-900 text-stone-50 border-stone-900' : 'border-stone-300 text-stone-600 hover:border-stone-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-stone-200 rounded-md text-sm text-stone-600 hover:bg-stone-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || !name || !deadline}
              className="flex-1 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-md hover:bg-stone-800 disabled:opacity-40"
            >
              {saving ? 'Saving…' : existing ? 'Save changes' : 'Create period'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
