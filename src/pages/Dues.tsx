import { useEffect, useState } from 'react';
import { Wallet, CheckCircle2, AlertCircle, Plus, X } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { Panel } from '@/components/Panel';
import { KPI } from '@/components/KPI';
import { fmt } from '@/lib/format';
import { listMembers, setDuesPaid } from '@/services/members';
import { can, useRole } from '@/hooks/useRole';
import type { LedgerEntry, Member, Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  ledger: LedgerEntry[];
  user: AuthUser;
}

export function Dues({ org, ledger, user }: Props) {
  const role = useRole(org.id, user.uid);
  const [members, setMembers] = useState<Member[]>([]);
  const [showMarkPaid, setShowMarkPaid] = useState(false);

  const isAdmin = can.manage(role);

  useEffect(() => {
    listMembers(org.id).then(setMembers);
  }, [org.id]);

  const activeMembers = members.filter((m) => m.status === 'active');
  const paid   = activeMembers.filter((m) => m.duesPaid).length;
  const unpaid = activeMembers.length - paid;

  const duesEntries = ledger.filter((l) => l.category === 'Dues');
  const collected = duesEntries
    .filter((l) => l.status === 'approved' || l.status === 'anchored')
    .reduce((s, e) => s + e.amount, 0);

  const handleTogglePaid = async (m: Member) => {
    await setDuesPaid(org.id, m.id, !m.duesPaid);
    const updated = await import('@/services/members').then((mod) => mod.listMembers(org.id));
    setMembers(updated);
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <KPI label="Dues collected" value={fmt(collected, org.currency)} icon={Wallet} accent="emerald" />
        <KPI label="Members paid" value={`${paid} / ${activeMembers.length}`} icon={CheckCircle2} accent="indigo" />
        <KPI label="Outstanding" value={`${unpaid}`} icon={AlertCircle} accent="rose" />
      </div>

      {/* Outstanding members */}
      {unpaid > 0 && isAdmin && (
        <Panel title={`Outstanding (${unpaid})`}>
          <div className="divide-y divide-stone-100">
            {activeMembers.filter((m) => !m.duesPaid).map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-stone-900">{m.name}</div>
                  <div className="text-xs text-stone-500">{m.email}</div>
                </div>
                <button
                  onClick={() => handleTogglePaid(m)}
                  className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" /> Mark paid
                </button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Dues ledger */}
      <Panel
        title="Dues payment history"
        actions={
          isAdmin ? (
            <button
              onClick={() => setShowMarkPaid(true)}
              className="px-3 py-1.5 bg-stone-900 text-stone-50 text-xs font-medium flex items-center gap-1.5 hover:bg-stone-800"
            >
              <Plus className="w-3.5 h-3.5" /> Record payment
            </button>
          ) : null
        }
      >
        <div className="overflow-x-auto -mx-5 -mb-5">
          <table className="w-full text-sm min-w-[440px]">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-widest text-stone-500">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Member</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-right px-5 py-3 font-medium">Amount</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {duesEntries.map((e) => {
                const member = members.find((m) => m.id === e.memberId);
                return (
                  <tr key={e.id} className="hover:bg-stone-50">
                    <td className="px-5 py-3 text-stone-900">{member?.name ?? e.description}</td>
                    <td className="px-5 py-3 text-stone-600">{e.createdAt}</td>
                    <td className="px-5 py-3 text-right font-medium text-emerald-700">{fmt(e.amount, org.currency)}</td>
                    <td className="px-5 py-3"><StatusPill value={e.status} /></td>
                  </tr>
                );
              })}
              {duesEntries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-stone-400 text-sm">
                    No dues recorded yet. Use "New entry" in the top bar to log a dues payment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Quick mark-paid modal */}
      {showMarkPaid && (
        <MarkPaidModal
          members={activeMembers.filter((m) => !m.duesPaid)}
          onMarkPaid={handleTogglePaid}
          onClose={() => setShowMarkPaid(false)}
        />
      )}
    </div>
  );
}

function MarkPaidModal({
  members, onMarkPaid, onClose,
}: {
  members: Member[];
  onMarkPaid: (m: Member) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const handle = async (m: Member) => {
    setSaving(m.id);
    await onMarkPaid(m);
    setDone((prev) => new Set([...prev, m.id]));
    setSaving(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md border border-stone-200 shadow-2xl">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">Mark dues paid</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {members.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-4">All active members have paid dues.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-900">{m.name}</div>
                    <div className="text-xs text-stone-500">{m.email}</div>
                  </div>
                  {done.has(m.id) ? (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                    </span>
                  ) : (
                    <button
                      disabled={saving === m.id}
                      onClick={() => handle(m)}
                      className="px-3 py-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {saving === m.id ? '…' : 'Mark paid'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <button onClick={onClose} className="mt-6 w-full py-2 border border-stone-200 text-sm text-stone-600 hover:bg-stone-50">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
