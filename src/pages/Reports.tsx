import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, X, FileCheck, Download, Printer, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { Panel } from '@/components/Panel';
import { fmt } from '@/lib/format';
import { listDuesPeriods } from '@/services/dues';
import { listMembers } from '@/services/members';
import type { DuesPeriod, LedgerEntry, Member, Organization } from '@/types';

interface Props {
  org: Organization;
  ledger: LedgerEntry[];
}

type MemberDuesStatus = 'paid' | 'pending' | 'unpaid';

type DelinquencyRow = {
  member: Member;
  statuses: Record<string, MemberDuesStatus>; // periodId → status
  delinquentCount: number;
};

function exportDelinquencyCsv(
  rows: DelinquencyRow[],
  periods: DuesPeriod[],
  orgName: string,
) {
  const headers = ['Member', 'Email', 'Type', ...periods.map((p) => p.name), 'Unpaid Count'];
  const body = rows.map(({ member, statuses, delinquentCount }) => [
    member.name,
    member.email,
    member.memberType ?? 'individual',
    ...periods.map((p) => statuses[p.id] ?? 'unpaid'),
    String(delinquentCount),
  ]);

  const csv = [headers, ...body]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `${orgName.replace(/\s+/g, '-')}-delinquency-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildDelinquencyRows(
  activeMembers: Member[],
  ledger: LedgerEntry[],
  periods: DuesPeriod[],
): DelinquencyRow[] {
  return activeMembers.map((member) => {
    const statuses: Record<string, MemberDuesStatus> = {};

    for (const period of periods) {
      const entries = ledger.filter(
        (e) => e.category === 'Dues' && e.duesPeriodId === period.id && e.memberId === member.id,
      );
      const approved = entries.find((e) => e.status === 'approved' || e.status === 'anchored');
      const pending  = entries.find((e) => e.status === 'pending');

      if (approved)      statuses[period.id] = 'paid';
      else if (pending)  statuses[period.id] = 'pending';
      else               statuses[period.id] = 'unpaid';
    }

    const delinquentCount = Object.values(statuses).filter((s) => s === 'unpaid').length;
    return { member, statuses, delinquentCount };
  });
}

const STATUS_ICON: Record<MemberDuesStatus, React.ReactNode> = {
  paid:    <Check className="w-3.5 h-3.5 text-emerald-600" />,
  pending: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  unpaid:  <X className="w-3.5 h-3.5 text-red-500" />,
};

const STATUS_LABEL: Record<MemberDuesStatus, string> = {
  paid:    'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  unpaid:  'bg-red-50 text-red-600',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Reports({ org, ledger }: Props) {
  const isDuesOrg = org.type === 'membership';

  // ── Delinquency report state ────────────────────────────────────────────────
  const [periods, setPeriods] = useState<DuesPeriod[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const [showOnlyDelinquent, setShowOnlyDelinquent] = useState(true);

  useEffect(() => {
    if (!isDuesOrg) return;
    setLoading(true);
    Promise.all([listDuesPeriods(org.id), listMembers(org.id)]).then(([ps, ms]) => {
      setPeriods(ps);
      setMembers(ms);
      // auto-select up to 3 most recent periods
      setSelectedPeriodIds(ps.slice(0, 3).map((p) => p.id));
      setLoading(false);
    });
  }, [org.id, isDuesOrg]);

  function togglePeriod(id: string) {
    setSelectedPeriodIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const selectedPeriods = periods.filter((p) => selectedPeriodIds.includes(p.id));
  const activeMembers   = members.filter((m) => m.status === 'active');

  const allRows = useMemo(
    () => buildDelinquencyRows(activeMembers, ledger, selectedPeriods),
    [activeMembers, ledger, selectedPeriods],
  );

  const rows = showOnlyDelinquent ? allRows.filter((r) => r.delinquentCount > 0) : allRows;

  const summary = useMemo(() => ({
    delinquent: allRows.filter((r) => r.delinquentCount > 0).length,
    fullyCurrent: allRows.filter((r) => r.delinquentCount === 0).length,
  }), [allRows]);

  // ── Financial summary ───────────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set(ledger.map((e) => e.createdAt?.slice(0, 4)).filter(Boolean));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [ledger]);

  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);

  const approvedEntries = useMemo(
    () => ledger.filter(
      (e) => (e.status === 'approved' || e.status === 'anchored') &&
        (selectedYear === 'all' || e.createdAt?.startsWith(selectedYear))
    ),
    [ledger, selectedYear],
  );

  const financialKPIs = useMemo(() => {
    const income   = approvedEntries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const expenses = approvedEntries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    return { income, expenses, net: income - expenses };
  }, [approvedEntries]);

  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    approvedEntries.filter((e) => e.type === 'income').forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [approvedEntries]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    approvedEntries.filter((e) => e.type === 'expense').forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [approvedEntries]);

  const monthlyBreakdown = useMemo(() => {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const map: Record<string, { income: number; expenses: number }> = {};
    approvedEntries.forEach((e) => {
      const ym = e.createdAt?.slice(0, 7);
      if (!ym) return;
      if (!map[ym]) map[ym] = { income: 0, expenses: 0 };
      if (e.type === 'income')  map[ym].income   += e.amount;
      if (e.type === 'expense') map[ym].expenses += e.amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, vals]) => {
        const [y, m] = ym.split('-');
        return { label: `${MONTHS[parseInt(m, 10) - 1]} ${y}`, ...vals, net: vals.income - vals.expenses };
      });
  }, [approvedEntries]);

  const maxMonthlyVal = useMemo(
    () => Math.max(...monthlyBreakdown.flatMap((r) => [r.income, r.expenses]), 1),
    [monthlyBreakdown],
  );

  const reports = [
    { name: "Q2 2026 Treasurer's Report", date: '2026-05-15', anchored: true },
    { name: 'Annual Financial Statement 2025', date: '2026-02-28', anchored: true },
    { name: 'Grant Compliance — EPA', date: '2026-04-20', anchored: false },
  ];

  return (
    <div className="p-8 max-w-6xl space-y-6">

      {/* ── Delinquency report (membership orgs only) ── */}
      {isDuesOrg && (
        <div className="bg-white rounded-xl ring-1 ring-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-display text-xl">Delinquency report</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Select dues periods to compare member payment status.
              </p>
            </div>
            <div className="flex items-center gap-4">
              {!loading && selectedPeriods.length > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-red-600 font-medium">{summary.delinquent} delinquent</span>
                  <span className="text-emerald-700 font-medium">{summary.fullyCurrent} current</span>
                </div>
              )}
              {!loading && rows.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportDelinquencyCsv(rows, selectedPeriods, org.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white ring-1 ring-stone-200 rounded-md hover:bg-stone-50"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white ring-1 ring-stone-200 rounded-md hover:bg-stone-50"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-b border-stone-100 space-y-3">
            {/* Period toggle chips */}
            {loading ? (
              <p className="text-sm text-stone-400">Loading periods…</p>
            ) : periods.length === 0 ? (
              <p className="text-sm text-stone-400">No dues periods configured yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {periods.map((p) => {
                  const active = selectedPeriodIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePeriod(p.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-stone-900 text-stone-50 border-stone-900'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      {p.name}
                      <span className={`ml-1.5 capitalize ${active ? 'text-stone-400' : 'text-stone-400'}`}>
                        · {p.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Show filter */}
            {!loading && selectedPeriods.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOnlyDelinquent(true)}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    showOnlyDelinquent ? 'bg-red-100 text-red-700' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Delinquent only
                </button>
                <button
                  onClick={() => setShowOnlyDelinquent(false)}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    !showOnlyDelinquent ? 'bg-stone-100 text-stone-800' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  All members
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          {!loading && selectedPeriods.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-[11px] uppercase tracking-widest text-stone-500">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Member</th>
                  <th className="text-left px-5 py-3 font-medium">Type</th>
                  {selectedPeriods.map((p) => (
                    <th key={p.id} className="text-center px-4 py-3 font-medium max-w-[120px]">
                      <div className="truncate">{p.name}</div>
                    </th>
                  ))}
                  <th className="text-center px-5 py-3 font-medium">Unpaid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map(({ member, statuses, delinquentCount }) => (
                  <tr key={member.id} className={`hover:bg-stone-50 ${delinquentCount > 0 ? '' : 'opacity-60'}`}>
                    <td className="px-5 py-3">
                      <div className="text-stone-900 font-medium">{member.name}</div>
                      <div className="text-[11px] text-stone-500">{member.email}</div>
                    </td>
                    <td className="px-5 py-3 text-xs text-stone-500 capitalize">
                      {member.memberType ?? 'individual'}
                    </td>
                    {selectedPeriods.map((p) => {
                      const s = statuses[p.id] ?? 'unpaid';
                      return (
                        <td key={p.id} className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_LABEL[s]}`}>
                            {STATUS_ICON[s]}
                            <span className="capitalize">{s}</span>
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-5 py-3 text-center">
                      {delinquentCount > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
                          {delinquentCount}
                        </span>
                      ) : (
                        <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3 + selectedPeriods.length} className="px-5 py-10 text-center text-stone-400 text-sm">
                      {showOnlyDelinquent ? 'No delinquent members for the selected periods.' : 'No active members found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Financial summary ── */}
      <div className="bg-white rounded-xl ring-1 ring-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-display text-xl">Financial summary</h3>
            <p className="text-xs text-stone-500 mt-0.5">Approved and anchored entries only.</p>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-900"
          >
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            <option value="all">All time</option>
          </select>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 divide-x divide-stone-100 border-b border-stone-100">
          <div className="px-6 py-5">
            <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Total income</div>
            <div className="text-2xl font-semibold text-emerald-700">{fmt(financialKPIs.income, org.currency)}</div>
          </div>
          <div className="px-6 py-5">
            <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Total expenses</div>
            <div className="text-2xl font-semibold text-stone-900">{fmt(financialKPIs.expenses, org.currency)}</div>
          </div>
          <div className="px-6 py-5">
            <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Net balance</div>
            <div className={`text-2xl font-semibold flex items-center gap-2 ${
              financialKPIs.net > 0 ? 'text-emerald-700' : financialKPIs.net < 0 ? 'text-red-600' : 'text-stone-500'
            }`}>
              {financialKPIs.net > 0
                ? <TrendingUp className="w-5 h-5" />
                : financialKPIs.net < 0
                  ? <TrendingDown className="w-5 h-5" />
                  : <Minus className="w-5 h-5" />}
              {fmt(Math.abs(financialKPIs.net), org.currency)}
            </div>
          </div>
        </div>

        {/* Category breakdowns */}
        {(incomeByCategory.length > 0 || expenseByCategory.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-stone-100 border-b border-stone-100">
            {/* Income */}
            <div className="px-6 py-5">
              <h4 className="text-xs font-medium uppercase tracking-widest text-stone-500 mb-4">Income by category</h4>
              {incomeByCategory.length === 0 ? (
                <p className="text-sm text-stone-400">No income recorded.</p>
              ) : (
                <div className="space-y-3">
                  {incomeByCategory.map(([cat, amt]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-stone-700">{cat}</span>
                        <span className="font-medium text-emerald-700">{fmt(amt, org.currency)}</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(amt / financialKPIs.income) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expenses */}
            <div className="px-6 py-5">
              <h4 className="text-xs font-medium uppercase tracking-widest text-stone-500 mb-4">Expenses by category</h4>
              {expenseByCategory.length === 0 ? (
                <p className="text-sm text-stone-400">No expenses recorded.</p>
              ) : (
                <div className="space-y-3">
                  {expenseByCategory.map(([cat, amt]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-stone-700">{cat}</span>
                        <span className="font-medium text-stone-900">{fmt(amt, org.currency)}</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-stone-700 rounded-full" style={{ width: `${(amt / financialKPIs.expenses) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Monthly breakdown */}
        {monthlyBreakdown.length > 0 && (
          <div className="px-6 py-5">
            <h4 className="text-xs font-medium uppercase tracking-widest text-stone-500 mb-4">Month by month</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-widest text-stone-400">
                    <th className="text-left py-1 font-medium w-24">Month</th>
                    <th className="text-left py-1 font-medium" colSpan={2}>Income</th>
                    <th className="text-left py-1 font-medium pl-6" colSpan={2}>Expenses</th>
                    <th className="text-right py-1 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {monthlyBreakdown.map((row) => (
                    <tr key={row.label} className="group">
                      <td className="py-2 text-stone-500 text-xs">{row.label}</td>
                      <td className="py-2 pr-3 text-emerald-700 font-medium whitespace-nowrap w-24">{fmt(row.income, org.currency)}</td>
                      <td className="py-2 w-32">
                        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(row.income / maxMonthlyVal) * 100}%` }} />
                        </div>
                      </td>
                      <td className="py-2 pr-3 pl-6 text-stone-700 font-medium whitespace-nowrap w-24">{fmt(row.expenses, org.currency)}</td>
                      <td className="py-2 w-32">
                        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-stone-400 rounded-full" style={{ width: `${(row.expenses / maxMonthlyVal) * 100}%` }} />
                        </div>
                      </td>
                      <td className={`py-2 text-right font-medium whitespace-nowrap ${row.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {row.net >= 0 ? '+' : '−'}{fmt(Math.abs(row.net), org.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {approvedEntries.length === 0 && (
          <div className="px-6 py-12 text-center text-stone-400 text-sm">
            No approved entries for {selectedYear === 'all' ? 'any period' : selectedYear}.
          </div>
        )}
      </div>

      {/* ── Generated reports ── */}
      <Panel title="Generated reports">
        <div className="space-y-2">
          {reports.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
              <div className="flex items-center gap-3">
                <FileCheck className="w-4 h-4 text-stone-500" />
                <div>
                  <div className="text-sm text-stone-900">{r.name}</div>
                  <div className="text-[11px] text-stone-500">Generated {r.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {r.anchored && <StatusPill value="anchored" />}
                <button className="text-xs text-stone-700 hover:text-stone-900 flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
