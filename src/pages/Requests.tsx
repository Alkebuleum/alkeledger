import { useEffect, useState } from 'react';
import { Plus, X, Check, XCircle, Gift, Inbox, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  listBenefits, createBenefit, updateBenefit, deleteBenefit,
  listBenefitRequests, listMyBenefitRequests, submitBenefitRequest, decideBenefitRequest, markBenefitPaid,
} from '@/services/benefits';
import { can, useRole } from '@/hooks/useRole';
import { fmt } from '@/lib/format';
import type { Benefit, BenefitRequest, BenefitRequestStatus, LedgerEntry, Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  user: AuthUser;
  onCreateEntry: (entry: LedgerEntry) => Promise<void>;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<BenefitRequestStatus, string> = {
  pending:  'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border border-blue-200',
  rejected: 'bg-red-50 text-red-600 border border-red-200',
  paid:     'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

// ─── Main component ───────────────────────────────────────────────────────────

export function Requests({ org, user, onCreateEntry }: Props) {
  const role    = useRole(org.id, user.uid);
  const isAdmin = can.manage(role);

  const [tab, setTab]           = useState<'requests' | 'benefits'>(isAdmin ? 'requests' : 'benefits');
  const [benefits,  setBenefits]  = useState<Benefit[]>([]);
  const [requests,  setRequests]  = useState<BenefitRequest[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Modal state
  const [editingBenefit,  setEditingBenefit]  = useState<Benefit | null>(null);
  const [showBenefitForm, setShowBenefitForm] = useState(false);
  const [requestingFor,   setRequestingFor]   = useState<Benefit | null>(null);
  const [decidingOn,      setDecidingOn]      = useState<BenefitRequest | null>(null);
  const [markingPaid,     setMarkingPaid]     = useState<BenefitRequest | null>(null);

  // Requests filter (admin)
  const [reqFilter, setReqFilter] = useState<'all' | BenefitRequestStatus>('pending');

  const reload = () => {
    setLoading(true);
    const reqs = isAdmin
      ? listBenefitRequests(org.id)
      : listMyBenefitRequests(org.id, user.uid);
    Promise.all([listBenefits(org.id), reqs]).then(([bs, rs]) => {
      setBenefits(bs);
      setRequests(rs);
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, [org.id]);

  const activeBenefits = benefits.filter((b) => b.active);

  const filteredRequests = requests.filter((r) =>
    reqFilter === 'all' || r.status === reqFilter,
  );

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="p-4 sm:p-8 max-w-4xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono">§ Benefits</div>
          <h2 className="font-display text-2xl mt-0.5">Member Benefits</h2>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-stone-100 rounded-lg">
          <TabBtn active={tab === 'requests'} onClick={() => setTab('requests')}>
            {isAdmin ? 'Requests' : 'My Requests'}
            {pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-semibold leading-none">
                {pendingCount}
              </span>
            )}
          </TabBtn>
          <TabBtn active={tab === 'benefits'} onClick={() => setTab('benefits')}>
            {isAdmin ? 'Manage Benefits' : 'Available Benefits'}
          </TabBtn>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-stone-400 text-sm">Loading…</div>
      ) : (
        <>
          {/* ── Requests tab ── */}
          {tab === 'requests' && (
            <RequestsTab
              requests={filteredRequests}
              allRequests={requests}
              filter={reqFilter}
              onFilterChange={setReqFilter}
              isAdmin={isAdmin}
              currency={org.currency}
              onDecide={setDecidingOn}
              onMarkPaid={setMarkingPaid}
            />
          )}

          {/* ── Benefits tab ── */}
          {tab === 'benefits' && (
            <BenefitsTab
              benefits={isAdmin ? benefits : activeBenefits}
              isAdmin={isAdmin}
              currency={org.currency}
              onRequest={(b) => setRequestingFor(b)}
              onNew={() => { setEditingBenefit(null); setShowBenefitForm(true); }}
              onEdit={(b) => { setEditingBenefit(b); setShowBenefitForm(true); }}
              onDelete={async (b) => {
                if (!confirm(`Delete benefit "${b.name}"?`)) return;
                await deleteBenefit(org.id, b.id);
                reload();
              }}
              onToggleActive={async (b) => {
                await updateBenefit(org.id, b.id, { active: !b.active });
                reload();
              }}
            />
          )}
        </>
      )}

      {/* Modals */}
      {showBenefitForm && (
        <BenefitModal
          org={org}
          user={user}
          editing={editingBenefit}
          onClose={() => { setShowBenefitForm(false); setEditingBenefit(null); }}
          onSaved={reload}
        />
      )}

      {requestingFor && (
        <RequestModal
          benefit={requestingFor}
          org={org}
          user={user}
          onClose={() => setRequestingFor(null)}
          onSaved={() => { setRequestingFor(null); setTab('requests'); reload(); }}
        />
      )}

      {decidingOn && (
        <DecideModal
          req={decidingOn}
          org={org}
          user={user}
          onClose={() => setDecidingOn(null)}
          onSaved={() => { setDecidingOn(null); reload(); }}
        />
      )}

      {markingPaid && (
        <MarkPaidModal
          req={markingPaid}
          org={org}
          user={user}
          onClose={() => setMarkingPaid(null)}
          onSaved={() => { setMarkingPaid(null); reload(); }}
          onCreateEntry={onCreateEntry}
        />
      )}
    </div>
  );
}

// ─── TabBtn ───────────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center ${
        active ? 'bg-white shadow-sm text-stone-900' : 'text-stone-600 hover:text-stone-900'
      }`}
    >
      {children}
    </button>
  );
}

// ─── RequestsTab ─────────────────────────────────────────────────────────────

function RequestsTab({
  requests, allRequests, filter, onFilterChange, isAdmin, currency, onDecide, onMarkPaid,
}: {
  requests: BenefitRequest[];
  allRequests: BenefitRequest[];
  filter: 'all' | BenefitRequestStatus;
  onFilterChange: (f: 'all' | BenefitRequestStatus) => void;
  isAdmin: boolean;
  currency: string;
  onDecide: (r: BenefitRequest) => void;
  onMarkPaid: (r: BenefitRequest) => void;
}) {
  const counts = {
    all:      allRequests.length,
    pending:  allRequests.filter((r) => r.status === 'pending').length,
    approved: allRequests.filter((r) => r.status === 'approved').length,
    rejected: allRequests.filter((r) => r.status === 'rejected').length,
    paid:     allRequests.filter((r) => r.status === 'paid').length,
  };

  const filters: { value: 'all' | BenefitRequestStatus; label: string }[] = [
    { value: 'all',      label: `All (${counts.all})` },
    { value: 'pending',  label: `Pending (${counts.pending})` },
    { value: 'approved', label: `Approved (${counts.approved})` },
    { value: 'paid',     label: `Paid (${counts.paid})` },
    { value: 'rejected', label: `Rejected (${counts.rejected})` },
  ];

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex gap-2 flex-wrap">
          {filters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFilterChange(value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                filter === value
                  ? 'bg-stone-900 text-stone-50'
                  : 'bg-white ring-1 ring-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl ring-1 ring-stone-200 overflow-hidden">
        {requests.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            <Inbox className="w-7 h-7 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{filter === 'pending' ? 'No pending requests.' : 'No requests yet.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {requests.map((r) => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-stone-900">{r.benefitName}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[r.status]}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500">
                      {isAdmin ? (
                        <>From <span className="font-medium text-stone-700">{r.memberName}</span> · </>
                      ) : null}
                      {r.createdAt}
                      {r.amount && (
                        <span className="ml-2 font-medium text-stone-700">· {fmt(r.amount, currency)} requested</span>
                      )}
                    </div>
                    {r.justification && (
                      <p className="mt-2 text-sm text-stone-600 leading-relaxed">{r.justification}</p>
                    )}
                    {r.response && (
                      <div className="mt-3 p-3 bg-stone-50 border-l-4 border-stone-300 rounded-r">
                        <div className="text-[10px] uppercase tracking-wider text-stone-500 font-mono mb-1">
                          Response · {r.closedBy}
                        </div>
                        <p className="text-sm text-stone-700">{r.response}</p>
                      </div>
                    )}
                    {r.status === 'paid' && r.paidAt && (
                      <div className="mt-2 text-xs text-emerald-600">
                        Paid {r.paidAmount ? `${fmt(r.paidAmount, currency)} ` : ''}on {r.paidAt.slice(0, 10)} by {r.paidBy}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="shrink-0 flex flex-col gap-1.5">
                      {r.status === 'pending' && (
                        <button
                          onClick={() => onDecide(r)}
                          className="px-3 py-1.5 text-xs border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-md"
                        >
                          Review
                        </button>
                      )}
                      {r.status === 'approved' && (
                        <button
                          onClick={() => onMarkPaid(r)}
                          className="px-3 py-1.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700 rounded-md font-medium"
                        >
                          Mark as paid
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BenefitsTab ──────────────────────────────────────────────────────────────

function BenefitsTab({
  benefits, isAdmin, currency, onRequest, onNew, onEdit, onDelete, onToggleActive,
}: {
  benefits: Benefit[];
  isAdmin: boolean;
  currency: string;
  onRequest: (b: Benefit) => void;
  onNew: () => void;
  onEdit: (b: Benefit) => void;
  onDelete: (b: Benefit) => void;
  onToggleActive: (b: Benefit) => void;
}) {
  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={onNew}
            className="px-3 py-2 bg-stone-900 text-stone-50 text-sm font-medium flex items-center gap-1.5 hover:bg-stone-800 rounded"
          >
            <Plus className="w-4 h-4" /> New benefit
          </button>
        </div>
      )}

      {benefits.length === 0 ? (
        <div className="py-16 text-center text-stone-400">
          <Gift className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {isAdmin ? 'No benefits defined yet. Create one to get started.' : 'No benefits available yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {benefits.map((b) => (
            <div
              key={b.id}
              className={`bg-white border rounded-xl p-5 flex flex-col gap-3 ${
                b.active ? 'border-stone-200' : 'border-stone-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-stone-900">{b.name}</h3>
                    {!b.active && (
                      <span className="text-[10px] uppercase tracking-widest font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  {b.description && (
                    <p className="mt-1 text-sm text-stone-500 leading-relaxed">{b.description}</p>
                  )}
                  {b.maxAmount && (
                    <p className="mt-1.5 text-xs text-stone-500">
                      Max: <span className="font-medium text-stone-700">{fmt(b.maxAmount, currency)}</span>
                    </p>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onToggleActive(b)} title={b.active ? 'Deactivate' : 'Activate'} className="p-1.5 rounded-md text-stone-300 hover:text-stone-700 hover:bg-stone-100">
                      {b.active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => onEdit(b)} className="p-1.5 rounded-md text-stone-300 hover:text-stone-700 hover:bg-stone-100"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(b)} className="p-1.5 rounded-md text-stone-300 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>

              {b.active && (
                <button
                  onClick={() => onRequest(b)}
                  className="mt-auto w-full py-2 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 rounded"
                >
                  Request this benefit
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BenefitModal (admin: create/edit benefit) ────────────────────────────────

function BenefitModal({
  org, user, editing, onClose, onSaved,
}: {
  org: Organization;
  user: AuthUser;
  editing: Benefit | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name,           setName]           = useState(editing?.name           ?? '');
  const [description,    setDescription]    = useState(editing?.description    ?? '');
  const [maxAmount,      setMaxAmount]      = useState(editing?.maxAmount?.toString() ?? '');
  const [requiresAmount, setRequiresAmount] = useState(editing?.requiresAmount ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
      requiresAmount,
      active: editing?.active ?? true,
      createdBy: user.displayName,
    };
    if (editing) {
      await updateBenefit(org.id, editing.id, data);
    } else {
      await createBenefit(org.id, data);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md border border-stone-200 shadow-2xl rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">{editing ? 'Edit benefit' : 'New benefit'}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Name <span className="text-red-400">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund, Medical Assistance"
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Who is eligible and what it covers…"
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Maximum amount (optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresAmount}
              onChange={(e) => setRequiresAmount(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-stone-700">Require members to specify an amount when requesting</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-between">
          <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-900">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-40 rounded"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create benefit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RequestModal (member: submit a request) ──────────────────────────────────

function RequestModal({
  benefit, org, user, onClose, onSaved,
}: {
  benefit: Benefit;
  org: Organization;
  user: AuthUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount,        setAmount]        = useState('');
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);

  const needsAmount = benefit.requiresAmount || !!benefit.maxAmount;

  const handleSubmit = async () => {
    if (needsAmount && !amount) return;
    setSaving(true);
    await submitBenefitRequest(org.id, {
      benefitId:    benefit.id,
      benefitName:  benefit.name,
      memberId:     user.uid,
      memberName:   user.displayName,
      amount:       amount ? parseFloat(amount) : undefined,
      justification: justification.trim() || undefined,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md border border-stone-200 shadow-2xl rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">Request benefit</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Benefit summary */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <div className="font-medium text-stone-900">{benefit.name}</div>
            {benefit.description && <p className="text-sm text-stone-500 mt-0.5">{benefit.description}</p>}
            {benefit.maxAmount && (
              <p className="text-xs text-stone-500 mt-1">Max available: <span className="font-medium">{fmt(benefit.maxAmount, org.currency)}</span></p>
            )}
          </div>

          {needsAmount && (
            <div>
              <label className="text-xs text-stone-600 block mb-1.5">
                Amount requested {benefit.requiresAmount && <span className="text-red-400">*</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  max={benefit.maxAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Justification / reason</label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              placeholder="Explain why you are requesting this benefit…"
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-between">
          <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-900">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving || (benefit.requiresAmount && !amount)}
            className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-40 rounded"
          >
            {saving ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MarkPaidModal (admin: disburse payment + create ledger expense) ─────────

function MarkPaidModal({
  req, org, user, onClose, onSaved, onCreateEntry,
}: {
  req: BenefitRequest;
  org: Organization;
  user: AuthUser;
  onClose: () => void;
  onSaved: () => void;
  onCreateEntry: (entry: LedgerEntry) => Promise<void>;
}) {
  const [amount,  setAmount]  = useState(req.amount?.toString() ?? '');
  const [saving,  setSaving]  = useState(false);

  const handlePay = async () => {
    setSaving(true);
    const paidAmount = amount ? parseFloat(amount) : undefined;

    await markBenefitPaid(org.id, req.id, user.displayName, paidAmount);

    // Auto-create ledger expense entry
    if (paidAmount) {
      await onCreateEntry({
        id: 'be_' + Math.random().toString(36).slice(2, 9),
        orgId: org.id,
        type: 'expense',
        amount: paidAmount,
        currency: org.currency,
        category: 'Member Benefit',
        description: `${req.benefitName} — ${req.memberName}`,
        memberId: req.memberId,
        status: 'approved',
        createdBy: user.displayName,
        createdByUid: user.uid,
        createdAt: new Date().toISOString().slice(0, 10),
        anchorStatus: 'not_anchored',
      });
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md border border-stone-200 shadow-2xl rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">Mark as paid</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-1">
            <div className="font-medium text-stone-900">{req.benefitName}</div>
            <div className="text-xs text-stone-500">
              To <span className="font-medium text-stone-700">{req.memberName}</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Amount paid</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">{org.currency}</span>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5">
              A ledger expense entry will be created automatically.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-between">
          <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-900">Cancel</button>
          <button
            onClick={handlePay}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 rounded"
          >
            {saving ? 'Recording…' : 'Confirm payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DecideModal (admin: approve or reject) ───────────────────────────────────

function DecideModal({
  req, org, user, onClose, onSaved,
}: {
  req: BenefitRequest;
  org: Organization;
  user: AuthUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [response, setResponse] = useState('');
  const [saving,   setSaving]   = useState(false);

  const decide = async (status: 'approved' | 'rejected') => {
    setSaving(true);
    await decideBenefitRequest(org.id, req.id, status, user.displayName, response.trim() || undefined);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md border border-stone-200 shadow-2xl rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">Review request</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-stone-900">{req.benefitName}</span>
              {req.amount && <span className="text-sm font-medium text-stone-700">{fmt(req.amount, org.currency)}</span>}
            </div>
            <div className="text-xs text-stone-500">
              From <span className="font-medium text-stone-700">{req.memberName}</span> · {req.createdAt}
            </div>
            {req.justification && (
              <p className="text-sm text-stone-600 mt-2 pt-2 border-t border-stone-200">{req.justification}</p>
            )}
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Response note (optional)</label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              placeholder="Leave a note for the member…"
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-900">Cancel</button>
          <div className="flex gap-2">
            <button
              onClick={() => decide('rejected')}
              disabled={saving}
              className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-40 rounded flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
            <button
              onClick={() => decide('approved')}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 rounded flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
