import { useMemo } from 'react';
import { TrendingUp, ShieldCheck, Lock } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { fmt } from '@/lib/format';
import { MOCK_AUDIT, MOCK_MEMBERS, MOCK_PROJECTS, MOCK_ANNOUNCEMENTS } from '@/data/mock';
import type { LedgerEntry, Organization } from '@/types';

interface Props {
  org: Organization;
  ledger: LedgerEntry[];
}

export function Dashboard({ org, ledger }: Props) {
  const totals = useMemo(() => {
    const income = ledger
      .filter((l) => l.type === 'income' && (l.status === 'approved' || l.status === 'anchored'))
      .reduce((s, l) => s + l.amount, 0);
    const expense = ledger
      .filter((l) => l.type === 'expense' && (l.status === 'approved' || l.status === 'anchored'))
      .reduce((s, l) => s + l.amount, 0);
    const pending = ledger.filter((l) => l.status === 'pending').length;
    const anchored = ledger.filter((l) => l.anchorStatus === 'anchored').length;
    const ready = ledger.filter((l) => l.anchorStatus === 'ready').length;
    return { income, expense, net: income - expense, pending, anchored, ready };
  }, [ledger]);

  const spark = [12, 18, 14, 22, 28, 24, 35, 41];
  const sparkMax = Math.max(...spark);
  const sparkPath = spark.map((v, i) => `${(i / (spark.length - 1)) * 100},${100 - (v / sparkMax) * 100}`).join(' ');

  return (
    <div className="max-w-7xl">
      <div className="border-b border-stone-300/60 px-4 sm:px-8 py-3 bg-[var(--paper)]/40 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-stone-600 font-mono">
        <span className="truncate">The Daily Brief · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        <span className="hidden md:flex items-center gap-2 shrink-0 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          All systems · ledger synced · proofs current
        </span>
      </div>

      <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Hero KPI block */}
        <div className="bg-white border border-stone-300/70">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-300/70">
            <div className="p-5 sm:p-7 sm:col-span-2 relative">
              <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono">Net position · YTD</div>
              <div className="mt-3 font-display text-4xl sm:text-6xl leading-none tracking-[-0.03em]">{fmt(totals.net, org.currency)}</div>
              <div className="mt-3 flex items-center gap-3 text-xs text-stone-600">
                <span className="inline-flex items-center gap-1 text-emerald-700"><TrendingUp className="w-3.5 h-3.5" /> +18% vs prior period</span>
                <span className="text-stone-400">·</span>
                <span>across {ledger.length} records</span>
              </div>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute right-7 bottom-7 w-32 h-12 opacity-60">
                <polyline points={sparkPath} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
                <polyline points={`${sparkPath} 100,100 0,100`} fill="var(--ink)" opacity="0.06" />
              </svg>
            </div>

            <div className="p-5 sm:p-7">
              <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono">Income</div>
              <div className="mt-3 font-display text-2xl sm:text-3xl text-emerald-700">{fmt(totals.income, org.currency)}</div>
              <div className="mt-4 sm:mt-6 text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono">Expense</div>
              <div className="mt-2 font-display text-2xl sm:text-3xl text-stone-900">{fmt(totals.expense, org.currency)}</div>
            </div>

            <div className="p-5 sm:p-7 bg-[var(--ink)] text-[var(--bone)]">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-stone-400 font-mono">
                <ShieldCheck className="w-3 h-3" /> Proof of record
              </div>
              <div className="mt-3 font-display text-4xl sm:text-5xl tracking-tight">
                {totals.anchored}
                <span className="text-stone-500 text-2xl"> / {ledger.length}</span>
              </div>
              <div className="text-xs text-stone-400 mt-1">records anchored</div>
              <div className="mt-5 pt-4 border-t border-[var(--bone)]/10 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-stone-400">Pending review</span><span className="font-mono">{totals.pending}</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Ready to anchor</span><span className="font-mono text-[var(--archival)]">{totals.ready}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Lead story + audit trail */}
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-stone-300/60">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono">The ledger · Lead story</div>
                <h3 className="font-display text-2xl mt-1">Recent activity</h3>
              </div>
              <span className="text-xs text-stone-500 font-editorial italic">Last 30 days · {ledger.length} entries</span>
            </div>

            <div className="bg-white border border-stone-300/70">
              <div className="divide-y divide-stone-200/70">
                {ledger.slice(0, 6).map((e) => (
                  <div key={e.id} className="px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-2 sm:gap-4 hover:bg-stone-50/60 transition-colors">
                    <div className={`w-1 self-stretch shrink-0 ${e.type === 'income' ? 'bg-emerald-600' : 'bg-[var(--ledger-red)]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-editorial text-sm sm:text-base text-stone-900 truncate leading-snug">{e.description}</div>
                      <div className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 font-mono uppercase tracking-wider truncate">
                        {e.category} · {e.createdAt}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-display text-base sm:text-xl tracking-tight ${e.type === 'income' ? 'text-emerald-700' : 'text-stone-900'}`}>
                        {e.type === 'income' ? '+' : '−'}{fmt(e.amount, e.currency)}
                      </div>
                    </div>
                    <div className="shrink-0 hidden sm:block">
                      <StatusPill value={e.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-stone-300/60">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono">Of record</div>
                <h3 className="font-display text-2xl mt-1">Audit trail</h3>
              </div>
            </div>

            <div className="bg-[var(--paper)]/40 border border-stone-300/60 p-5 relative">
              <div className="absolute left-7 top-5 bottom-5 w-px bg-stone-300" />
              <div className="space-y-4">
                {MOCK_AUDIT.map((a) => (
                  <div key={a.id} className="relative pl-8">
                    <div className="absolute left-[18px] top-1.5 w-2 h-2 bg-[var(--ink)] rounded-full ring-4 ring-[var(--paper)]" />
                    <div className="text-xs text-stone-800 font-editorial leading-snug">{a.action}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5 font-mono uppercase tracking-wider">{a.at} · {a.who}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Org-type-specific row */}
        {org.type === 'membership' ? (
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono mb-1">§ The roster</div>
              <h3 className="font-display text-2xl mb-4 pb-3 border-b border-stone-300/60">Membership at a glance</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-stone-300/60 border border-stone-300/60">
                {[
                  { l: 'Active',    v: MOCK_MEMBERS.filter((m) => m.status === 'active').length,    c: 'text-emerald-700' },
                  { l: 'Pending',   v: MOCK_MEMBERS.filter((m) => m.status === 'pending').length,   c: 'text-amber-700' },
                  { l: 'Expired',   v: MOCK_MEMBERS.filter((m) => m.status === 'expired').length,   c: 'text-stone-500' },
                  { l: 'Suspended', v: MOCK_MEMBERS.filter((m) => m.status === 'suspended').length, c: 'text-[var(--ledger-red)]' },
                ].map((b) => (
                  <div key={b.l} className="p-4 sm:p-6 bg-white">
                    <div className={`font-display text-4xl sm:text-5xl ${b.c}`}>{b.v}</div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 mt-2 font-mono">{b.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono mb-1">§ Notices</div>
              <h3 className="font-display text-2xl mb-4 pb-3 border-b border-stone-300/60">Recent announcements</h3>
              <div className="space-y-4">
                {MOCK_ANNOUNCEMENTS.map((a) => (
                  <article key={a.id} className="bg-white border border-stone-300/60 p-5">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-mono mb-2">{a.date}</div>
                    <h4 className="font-display text-xl leading-tight">{a.title}</h4>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono mb-1">§ Portfolio</div>
            <h3 className="font-display text-2xl mb-4 pb-3 border-b border-stone-300/60">Projects in motion</h3>

            <div className="grid md:grid-cols-2 gap-px bg-stone-300/60 border border-stone-300/60">
              {MOCK_PROJECTS.map((p) => {
                const pct = Math.round((p.spent / p.budget) * 100);
                return (
                  <div key={p.id} className="bg-white p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-display text-xl leading-tight">{p.name}</h4>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400">{p.id}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <StatusPill value={p.status} />
                      {p.restricted && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-800 ring-1 ring-amber-200 inline-flex items-center gap-1 font-mono uppercase tracking-wider">
                          <Lock className="w-2.5 h-2.5" />Restricted
                        </span>
                      )}
                    </div>
                    <div className="font-display text-2xl tracking-tight">
                      {fmt(p.spent)} <span className="text-stone-400 text-lg">/ {fmt(p.budget)}</span>
                    </div>
                    <div className="mt-3 h-1.5 bg-stone-100 overflow-hidden">
                      <div
                        className={`h-full ${pct >= 100 ? 'bg-[var(--ledger-red)]' : pct >= 80 ? 'bg-[var(--archival)]' : 'bg-emerald-600'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-stone-500 mt-2 font-mono uppercase tracking-wider">
                      <span>{pct}% deployed</span>
                      <span>{p.completedMilestones}/{p.milestones} milestones</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
