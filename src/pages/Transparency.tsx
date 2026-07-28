import { Globe, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { fmt } from '@/lib/format';
import type { LedgerEntry, Organization } from '@/types';

interface Props {
  org: Organization;
  ledger: LedgerEntry[];
}

export function Transparency({ org, ledger }: Props) {
  const visible = ledger.filter((l) => l.status === 'approved' || l.status === 'anchored');
  const income = visible.filter((l) => l.type === 'income').reduce((s, l) => s + l.amount, 0);
  const expense = visible.filter((l) => l.type === 'expense').reduce((s, l) => s + l.amount, 0);
  const net = income - expense;
  const anchoredCount = visible.filter((v) => v.anchorStatus === 'anchored').length;

  const incomeByCategory: Record<string, number> = {};
  visible
    .filter((l) => l.type === 'income')
    .forEach((l) => {
      incomeByCategory[l.category] = (incomeByCategory[l.category] ?? 0) + l.amount;
    });

  return (
    <div className="max-w-7xl">
      <div className="border-b border-stone-300/60 px-8 py-3 bg-[var(--ink)] text-[var(--bone)] flex items-center gap-3 text-[11px]">
        <Globe className="w-3.5 h-3.5 text-emerald-300" />
        <span className="uppercase tracking-[0.22em] font-mono text-stone-300">Published publicly at</span>
        <span className="font-mono text-emerald-300">scribb.net/p/{org.id}</span>
        <button className="ml-auto text-stone-300 hover:text-[var(--bone)] flex items-center gap-1 font-mono uppercase tracking-wider">
          <Copy className="w-3 h-3" />Copy link
        </button>
        <button className="text-stone-300 hover:text-[var(--bone)] flex items-center gap-1 font-mono uppercase tracking-wider">
          <ExternalLink className="w-3 h-3" />Preview
        </button>
      </div>

      <div className="p-8 space-y-8">
        {/* Cover */}
        <div className="bg-[var(--bone)] border-2 border-[var(--ink)] relative overflow-hidden">
          <div className="absolute inset-0 grid-paper opacity-40 pointer-events-none" />
          <div className="absolute inset-0 grain opacity-25 mix-blend-multiply pointer-events-none" />

          <div className="relative px-10 md:px-14 py-14">
            <div className="flex items-center justify-between mb-12 text-[10px] uppercase tracking-[0.3em] text-stone-500 font-mono">
              <span>The Public Record</span>
              <span>A Scribb transparency report</span>
              <span>2026 · Q2</span>
            </div>

            <div className="grid md:grid-cols-12 gap-8 items-end">
              <div className="md:col-span-8">
                <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono mb-3">{org.tagline}</div>
                <h2 className="font-display text-6xl md:text-7xl leading-[0.92] font-medium tracking-[-0.03em]">{org.name}</h2>
                <p className="mt-6 font-editorial text-xl italic text-stone-700 max-w-xl leading-snug">
                  Every figure on this page corresponds to an approved ledger entry. Every approved entry carries a cryptographic proof that cannot be quietly altered after the fact.
                </p>
              </div>
              <div className="md:col-span-4 text-right">
                <div className="inline-block">
                  <div className="font-editorial italic text-stone-500 text-sm">As certified, period to date —</div>
                  <div className="mt-2 font-display text-4xl tracking-tight">
                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute top-10 right-10 hidden lg:block">
              <div className="w-28 h-28 rounded-full border-2 border-[var(--ledger-red)] flex items-center justify-center rotate-12 opacity-90">
                <div className="text-center">
                  <ShieldCheck className="w-6 h-6 mx-auto text-[var(--ledger-red)]" />
                  <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--ledger-red)] mt-1">Anchored</div>
                  <div className="font-display italic text-xs text-[var(--ledger-red)] mt-0.5">of record</div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative grid md:grid-cols-4 divide-x divide-stone-300/70 border-t-2 border-[var(--ink)]">
            <div className="p-7">
              <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono">Income received</div>
              <div className="mt-3 font-display text-4xl text-emerald-700 tracking-tight">{fmt(income)}</div>
              <div className="text-xs text-stone-500 mt-1 font-editorial italic">{visible.filter((l) => l.type === 'income').length} entries</div>
            </div>
            <div className="p-7">
              <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono">Funds deployed</div>
              <div className="mt-3 font-display text-4xl text-stone-900 tracking-tight">{fmt(expense)}</div>
              <div className="text-xs text-stone-500 mt-1 font-editorial italic">{visible.filter((l) => l.type === 'expense').length} entries</div>
            </div>
            <div className="p-7">
              <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono">Net position</div>
              <div className="mt-3 font-display text-4xl tracking-tight">{fmt(net)}</div>
              <div className="text-xs text-stone-500 mt-1 font-editorial italic">Income less expense</div>
            </div>
            <div className="p-7 bg-[var(--ink)] text-[var(--bone)]">
              <div className="text-[10px] uppercase tracking-[0.25em] text-stone-400 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-300" />Records anchored
              </div>
              <div className="mt-3 font-display text-4xl text-emerald-300 tracking-tight">
                {anchoredCount}<span className="text-stone-500 text-2xl">/{visible.length}</span>
              </div>
              <div className="text-xs text-stone-400 mt-1 font-editorial italic">Verifiable on-chain</div>
            </div>
          </div>
        </div>

        {/* Composition */}
        {Object.keys(incomeByCategory).length > 0 && (
          <div>
            <div className="flex items-baseline gap-4 mb-5 pb-3 border-b border-stone-300/60">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--ledger-red)] font-mono">Where it came from</span>
              <span className="flex-1 h-px bg-stone-300/60" />
              <span className="text-xs text-stone-500 font-editorial italic">Income, by category</span>
            </div>
            <div className="bg-white border border-stone-300/60 p-7">
              <div className="space-y-4">
                {Object.entries(incomeByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt]) => {
                    const pct = (amt / income) * 100;
                    return (
                      <div key={cat} className="flex items-center gap-5">
                        <div className="w-28 text-sm font-editorial">{cat}</div>
                        <div className="flex-1 relative h-6 bg-stone-100">
                          <div className="absolute inset-y-0 left-0 bg-emerald-700/90 flex items-center px-2" style={{ width: `${pct}%` }}>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-50">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="w-28 text-right font-display text-xl tracking-tight">{fmt(amt)}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Verified ledger */}
        <div>
          <div className="flex items-baseline gap-4 mb-5 pb-3 border-b border-stone-300/60">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--ledger-red)] font-mono">The verified ledger</span>
            <span className="flex-1 h-px bg-stone-300/60" />
            <span className="text-xs text-stone-500 font-editorial italic">{visible.length} entries, in chronological order</span>
          </div>

          <div className="bg-white border border-stone-300/60">
            <table className="w-full">
              <thead className="bg-[var(--paper)]/60 border-b-2 border-[var(--ink)]">
                <tr className="text-[10px] uppercase tracking-[0.25em] text-stone-700 font-mono">
                  <th className="text-left px-5 py-3 font-medium w-28">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Particulars</th>
                  <th className="text-left px-5 py-3 font-medium w-28">Category</th>
                  <th className="text-right px-5 py-3 font-medium w-40">Amount</th>
                  <th className="text-left px-5 py-3 font-medium w-48">Proof of record</th>
                </tr>
              </thead>
              <tbody className="ledger-rule">
                {visible.map((e) => (
                  <tr key={e.id} className="border-b border-stone-200/70 last:border-0 hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-4 text-stone-600 font-mono text-xs whitespace-nowrap align-top">{e.createdAt}</td>
                    <td className="px-5 py-4 align-top">
                      <div className="font-editorial text-base text-stone-900 leading-snug">{e.description}</div>
                      <div className="text-[10px] text-stone-500 font-mono uppercase tracking-wider mt-1">{e.id}</div>
                    </td>
                    <td className="px-5 py-4 text-stone-600 text-sm align-top">{e.category}</td>
                    <td className={`px-5 py-4 text-right font-display text-xl tracking-tight align-top ${e.type === 'income' ? 'text-emerald-700' : 'text-stone-900'}`}>
                      {e.type === 'income' ? '+' : '−'}{fmt(e.amount)}
                    </td>
                    <td className="px-5 py-4 align-top">
                      {e.txHash ? (
                        <div className="flex items-start gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 mt-0.5 flex-none" />
                          <div className="font-mono text-[11px] text-stone-700">
                            <div className="text-emerald-700">{e.txHash}</div>
                            <div className="text-stone-400 mt-0.5">verified on-chain</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-500 italic font-editorial">approved · awaiting anchor</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t-2 border-[var(--ink)] pt-6 flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono">
          <span>Compiled by Scribb · v1.0</span>
          <span className="font-editorial italic normal-case tracking-normal text-stone-600">"That those who come after may know."</span>
          <span>Last refresh · just now</span>
        </div>
      </div>
    </div>
  );
}
