import { useEffect, useState } from 'react';
import { Hash } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { fmt } from '@/lib/format';
import { listDuesPeriods } from '@/services/dues';
import type { DuesPeriod, LedgerEntry, LedgerStatus, Organization } from '@/types';

interface Props {
  ledger: LedgerEntry[];
  org: Organization;
}

type StatusFilter = 'all' | LedgerStatus;

const STATUS_FILTERS: StatusFilter[] = ['all', 'draft', 'pending', 'approved', 'rejected', 'anchored'];

export function Ledger({ ledger, org }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [periods, setPeriods] = useState<DuesPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  // Load dues periods once for membership orgs
  useEffect(() => {
    if (org.type !== 'membership') return;
    listDuesPeriods(org.id).then(setPeriods);
  }, [org.id, org.type]);

  const filtered = ledger.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (selectedPeriodId && e.duesPeriodId !== selectedPeriodId) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl space-y-4">

      <div className="flex items-center gap-2 flex-wrap">
        {/* Dues period picker — membership orgs only */}
        {org.type === 'membership' && periods.length > 0 && (
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-900"
          >
            <option value="">All periods</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {/* Status filter pills */}
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${
              statusFilter === f
                ? 'bg-stone-900 text-stone-50'
                : 'bg-white ring-1 ring-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {f}
          </button>
        ))}

        <div className="ml-auto text-xs text-stone-500">
          {filtered.length} of {ledger.length}
        </div>
      </div>

      <div className="bg-white rounded-xl ring-1 ring-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-widest text-stone-500">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Date</th>
              <th className="text-left px-5 py-3 font-medium">Description</th>
              <th className="text-left px-5 py-3 font-medium">Category</th>
              <th className="text-right px-5 py-3 font-medium">Amount</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-left px-5 py-3 font-medium">Proof</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-stone-50">
                <td className="px-5 py-3 text-stone-600 whitespace-nowrap">{e.createdAt}</td>
                <td className="px-5 py-3">
                  <div className="text-stone-900">{e.description}</div>
                  <div className="text-[11px] text-stone-500">{e.id} · {e.createdBy}</div>
                </td>
                <td className="px-5 py-3 text-stone-600">{e.category}</td>
                <td className={`px-5 py-3 text-right font-medium whitespace-nowrap ${
                  e.type === 'income' ? 'text-emerald-700' : 'text-stone-900'
                }`}>
                  {e.type === 'income' ? '+' : '−'}{fmt(e.amount, e.currency)}
                </td>
                <td className="px-5 py-3"><StatusPill value={e.status} /></td>
                <td className="px-5 py-3">
                  {e.hash ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-stone-600">
                      <Hash className="w-3 h-3" /> {e.hash}
                    </div>
                  ) : (
                    <span className="text-[11px] text-stone-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-stone-500 text-sm">
                  No entries match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
