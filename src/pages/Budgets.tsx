import { PieChart, TrendingDown, Wallet } from 'lucide-react';
import { Panel } from '@/components/Panel';
import { KPI } from '@/components/KPI';
import { fmt } from '@/lib/format';
import { MOCK_PROJECTS } from '@/data/mock';
import type { Organization } from '@/types';

interface Props {
  org: Organization;
}

export function Budgets({ org }: Props) {
  const items = MOCK_PROJECTS.filter((p) => p.orgId === org.id);
  const total = items.reduce((s, p) => s + p.budget, 0);
  const spent = items.reduce((s, p) => s + p.spent, 0);

  return (
    <div className="p-8 max-w-6xl space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <KPI label="Total budgeted" value={fmt(total)} icon={PieChart} accent="indigo" />
        <KPI label="Spent to date" value={fmt(spent)} icon={TrendingDown} accent="rose" />
        <KPI label="Remaining" value={fmt(total - spent)} icon={Wallet} accent="emerald" />
      </div>
      <Panel title="Budget by project">
        <div className="space-y-4">
          {items.map((p) => {
            const pct = Math.round((p.spent / p.budget) * 100);
            return (
              <div key={p.id}>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-800">{p.name}</span>
                  <span className="text-stone-500">{pct}%</span>
                </div>
                <div className="mt-1.5 h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  {fmt(p.spent)} of {fmt(p.budget)}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
