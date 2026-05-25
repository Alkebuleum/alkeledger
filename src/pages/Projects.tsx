import { Plus, Lock, ExternalLink } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { fmt } from '@/lib/format';
import { MOCK_PROJECTS } from '@/data/mock';
import type { Organization } from '@/types';

interface Props {
  org: Organization;
}

export function Projects({ org }: Props) {
  const items = MOCK_PROJECTS.filter((p) => p.orgId === org.id);

  return (
    <div className="p-8 max-w-7xl space-y-4">
      <div className="flex justify-end">
        <button className="px-3 py-2 bg-stone-900 text-stone-50 rounded-md text-sm font-medium flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New project
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {items.map((p) => {
          const pct = Math.round((p.spent / p.budget) * 100);
          return (
            <div key={p.id} className="bg-white rounded-xl ring-1 ring-stone-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl text-stone-900">{p.name}</h3>
                  <div className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                    <StatusPill value={p.status} />
                    {p.restricted && (
                      <span className="inline-flex items-center gap-1 text-amber-800">
                        <Lock className="w-3 h-3" />Restricted
                      </span>
                    )}
                  </div>
                </div>
                <button className="text-stone-400 hover:text-stone-900">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Spent</span>
                  <span className="font-medium text-stone-900">
                    {fmt(p.spent)} / {fmt(p.budget)}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="mt-3 text-xs text-stone-500">
                  {p.completedMilestones} of {p.milestones} milestones complete
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
