import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fmt, fmtDate, recordTypeOf } from '@/lib/format';
import { listDuesPeriods } from '@/services/dues';
import { StatusPill } from '@/components/StatusPill';
import { CopyHashButton } from '@/components/CopyHashButton';
import { AnchorAction } from '@/components/AnchorAction';
import type { DuesPeriod, LedgerEntry, LedgerStatus, Organization } from '@/types';

interface Props {
  org: Organization;
  ledger: LedgerEntry[];
  onAnchor: (id: string) => void | Promise<void>;
}

type StatusFilter = 'all' | LedgerStatus;

const STATUS_FILTERS: StatusFilter[] = ['all', 'draft', 'pending', 'approved', 'rejected', 'anchored'];

function isPosted(e: LedgerEntry): boolean {
  return e.status === 'approved' || e.status === 'anchored';
}

export function Transactions({ org, ledger, onAnchor }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [periods, setPeriods] = useState<DuesPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (org.type !== 'membership') return;
    listDuesPeriods(org.id).then(setPeriods);
  }, [org.id, org.type]);

  const transactions = useMemo(() => ledger.filter((e) => recordTypeOf(e) === 'transaction'), [ledger]);

  const categories = useMemo(
    () => Array.from(new Set(transactions.map((e) => e.category))).sort((a, b) => a.localeCompare(b)),
    [transactions],
  );

  const filtered = transactions.filter((e) => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (selectedPeriodId && e.duesPeriodId !== selectedPeriodId) return false;
    return true;
  });

  const posted = useMemo(() => transactions.filter(isPosted), [transactions]);

  const kpis = useMemo(() => {
    const income = posted.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const expenses = posted.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    return { income, expenses, net: income - expenses };
  }, [posted]);

  const byCategory = useMemo(() => {
    const map: Record<string, { income: number; expenses: number }> = {};
    for (const e of posted) {
      if (!map[e.category]) map[e.category] = { income: 0, expenses: 0 };
      map[e.category][e.type === 'income' ? 'income' : 'expenses'] += e.amount;
    }
    return Object.entries(map)
      .map(([category, v]) => ({ category, ...v, total: v.income + v.expenses }))
      .sort((a, b) => b.total - a.total);
  }, [posted]);

  const maxCategoryTotal = Math.max(1, ...byCategory.map((c) => c.total));

  const selected = filtered.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="p-4 sm:p-8 max-w-[1160px]">
      <div className="flex items-end justify-between gap-3 flex-wrap mb-1">
        <div>
          <h1 className="font-serif font-semibold text-[27px] text-[#171B21] tracking-[-0.01em]">Transactions</h1>
          <div className="font-plex text-[11px] text-[#8A8F99] tracking-[0.04em] mt-1">
            {transactions.length} RECORDED · {posted.length} POSTED
          </div>
        </div>
      </div>

      {/* KPI band — posted (approved/anchored) only */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
        <div className="bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-4">
          <div className="font-plex text-[10px] tracking-[0.1em] text-[#8A8F99] uppercase">Income · posted</div>
          <div className="text-xl font-semibold text-[#3E6257] mt-1">{fmt(kpis.income, org.currency)}</div>
        </div>
        <div className="bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-4">
          <div className="font-plex text-[10px] tracking-[0.1em] text-[#8A8F99] uppercase">Expenses · posted</div>
          <div className="text-xl font-semibold text-[#171B21] mt-1">{fmt(kpis.expenses, org.currency)}</div>
        </div>
        <div className="bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-4">
          <div className="font-plex text-[10px] tracking-[0.1em] text-[#8A8F99] uppercase">Net · posted</div>
          <div className={`text-xl font-semibold mt-1 flex items-center gap-1.5 ${
            kpis.net > 0 ? 'text-[#3E6257]' : kpis.net < 0 ? 'text-[#8A1E2D]' : 'text-[#8A8F99]'
          }`}>
            {kpis.net > 0 ? <TrendingUp className="w-4 h-4" /> : kpis.net < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            {fmt(Math.abs(kpis.net), org.currency)}
          </div>
        </div>
      </div>

      {/* Category breakdown — posted only */}
      {byCategory.length > 0 && (
        <div className="bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-4 mt-3">
          <div className="font-plex text-[10px] tracking-[0.1em] text-[#8A8F99] uppercase mb-3">By category · posted</div>
          <div className="space-y-2.5">
            {byCategory.map((c) => (
              <div key={c.category}>
                <div className="flex justify-between text-[12.5px] mb-1">
                  <span className="text-[#171B21]">{c.category}</span>
                  <span className="font-plex text-[#8A8F99]">
                    {c.income > 0 && <span className="text-[#3E6257]">+{fmt(c.income, org.currency)} </span>}
                    {c.expenses > 0 && <span>−{fmt(c.expenses, org.currency)}</span>}
                  </span>
                </div>
                <div className="h-1.5 bg-[#EAE6D9] rounded-full overflow-hidden flex">
                  {c.income > 0 && <div className="h-full bg-[#3E6257]" style={{ width: `${(c.income / maxCategoryTotal) * 100}%` }} />}
                  {c.expenses > 0 && <div className="h-full bg-[#171B21]" style={{ width: `${(c.expenses / maxCategoryTotal) * 100}%` }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category filter — primary */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none mt-5">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            categoryFilter === 'all'
              ? 'bg-[#171B21] border border-[#171B21] text-[#EFE9DC]'
              : 'border border-[#DCD6C6] text-[#5A5F67] hover:bg-[#FDFCF8]'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              categoryFilter === c
                ? 'bg-[#171B21] border border-[#171B21] text-[#EFE9DC]'
                : 'border border-[#DCD6C6] text-[#5A5F67] hover:bg-[#FDFCF8]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Status filter + dues period — secondary */}
      <div className="flex items-center gap-2 min-w-0 mt-2.5 mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 pb-0.5 scrollbar-none">
          {org.type === 'membership' && periods.length > 0 && (
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="shrink-0 px-2.5 py-1 border border-[#DCD6C6] rounded-full text-[11px] bg-transparent text-[#5A5F67] focus:outline-none focus:ring-2 focus:ring-[#171B21]/10"
            >
              <option value="">All periods</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium capitalize transition-colors ${
                statusFilter === f
                  ? 'bg-[#EFECE2] border border-[#DCD6C6] text-[#171B21]'
                  : 'border border-dashed border-[#DCD6C6] text-[#8A8F99] hover:bg-[#FDFCF8]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="shrink-0 text-xs text-[#8A8F99] whitespace-nowrap">
          {filtered.length} of {transactions.length}
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_350px] gap-6 items-start">
        <div className="bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-[#F6F4ED] font-plex text-[10px] uppercase tracking-[0.08em] text-[#8A8F99]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6D9]">
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`cursor-pointer transition-colors ${selected?.id === e.id ? 'bg-[#EFECE2]' : 'hover:bg-[#F6F4ED]'}`}
                >
                  <td className="px-4 py-3 text-[#5A5F67] whitespace-nowrap font-plex text-[11.5px]">{fmtDate(e.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="text-[#171B21]">{e.description}</div>
                    <div className="text-[11px] text-[#8A8F99]">by {e.createdBy}</div>
                  </td>
                  <td className="px-4 py-3 text-[#5A5F67]">{e.category}</td>
                  <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${e.type === 'income' ? 'text-[#3E6257]' : 'text-[#171B21]'}`}>
                    {e.type === 'income' ? '+' : '−'}{fmt(e.amount, e.currency)}
                  </td>
                  <td className="px-4 py-3"><StatusPill value={e.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[#5A5F67] text-sm">
                    No transactions match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <aside className="hidden xl:block bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-[22px] sticky top-[78px]">
            <div className="font-plex text-[10px] tracking-[0.14em] text-[#8A1E2D]">{selected.category.toUpperCase()}</div>
            <h2 className="font-serif font-semibold text-[20px] text-[#171B21] leading-[1.25] mt-2 mb-3">
              {selected.description}
            </h2>

            <div className="grid grid-cols-[86px_1fr] gap-x-3 gap-y-1.5 text-[12.5px] py-3.5 border-t border-b border-[#EAE6D9]">
              <span className="font-plex text-[10.5px] text-[#8A8F99] tracking-[0.06em] pt-px">recorded</span>
              <span className="text-[#171B21]">{fmtDate(selected.createdAt)} · {selected.createdBy}</span>
              <span className="font-plex text-[10.5px] text-[#8A8F99] tracking-[0.06em] pt-px">amount</span>
              <span className="text-[#171B21]">{selected.type === 'income' ? '+' : '−'}{fmt(selected.amount, selected.currency)}</span>
              {selected.approvedBy && (
                <>
                  <span className="font-plex text-[10.5px] text-[#8A8F99] tracking-[0.06em] pt-px">approved</span>
                  <span className="text-[#171B21]">{selected.approvedBy}{selected.approvedAt ? ` · ${fmtDate(selected.approvedAt)}` : ''}</span>
                </>
              )}
              {selected.hash && (
                <>
                  <span className="font-plex text-[10.5px] text-[#8A8F99] tracking-[0.06em] pt-px">hash</span>
                  <span className="font-plex text-[11px] text-[#171B21] break-all">{selected.hash}</span>
                </>
              )}
              {selected.txHash && (
                <>
                  <span className="font-plex text-[10.5px] text-[#8A8F99] tracking-[0.06em] pt-px">on-chain</span>
                  <span className="font-plex text-[11px] text-[#171B21] break-all">{selected.txHash}</span>
                </>
              )}
            </div>

            {selected.hash && (
              <div className="mt-4 grid gap-1.5">
                <CopyHashButton hash={selected.hash} />
              </div>
            )}

            <AnchorAction key={selected.id} entry={selected} onAnchor={onAnchor} />
          </aside>
        )}
      </div>
    </div>
  );
}
