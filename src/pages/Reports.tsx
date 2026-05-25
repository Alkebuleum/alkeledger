import { FileCheck, Download } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { Panel } from '@/components/Panel';
import { fmt } from '@/lib/format';
import type { LedgerEntry, Organization } from '@/types';

interface Props {
  org: Organization;
  ledger: LedgerEntry[];
}

export function Reports({ org, ledger }: Props) {
  const categories: Record<string, number> = {};
  ledger
    .filter((l) => l.status === 'approved' || l.status === 'anchored')
    .forEach((l) => {
      categories[l.category] = (categories[l.category] ?? 0) + (l.type === 'expense' ? l.amount : 0);
    });
  const maxCat = Math.max(...Object.values(categories), 1);

  const reports = [
    { name: "Q2 2026 Treasurer's Report", date: '2026-05-15', anchored: true },
    { name: 'Annual Financial Statement 2025', date: '2026-02-28', anchored: true },
    { name: 'Grant Compliance — EPA', date: '2026-04-20', anchored: false },
  ];

  return (
    <div className="p-8 max-w-6xl space-y-6">
      <div className="bg-white rounded-xl ring-1 ring-stone-200 p-6">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="font-display text-xl">Financial summary</h3>
          <span className="text-xs text-stone-500">2026 year-to-date</span>
        </div>
        <p className="text-sm text-stone-600 mb-5">Based on approved and anchored ledger entries.</p>
        <div className="space-y-3">
          {Object.entries(categories).map(([cat, amt]) => (
            <div key={cat}>
              <div className="flex justify-between text-sm">
                <span className="text-stone-800">{cat}</span>
                <span className="text-stone-900 font-medium">{fmt(amt, org.currency)}</span>
              </div>
              <div className="mt-1.5 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-stone-900" style={{ width: `${(amt / maxCat) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

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
