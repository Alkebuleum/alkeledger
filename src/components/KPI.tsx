import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: 'stone' | 'emerald' | 'rose' | 'indigo';
  sub?: string;
}

const accentMap = {
  emerald: 'text-emerald-700 bg-emerald-50',
  rose: 'text-rose-700 bg-rose-50',
  stone: 'text-stone-700 bg-stone-100',
  indigo: 'text-indigo-700 bg-indigo-50',
};

export function KPI({ label, value, icon: Icon, accent = 'stone', sub }: Props) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-stone-200 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-stone-500">{label}</span>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${accentMap[accent]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="font-display text-3xl text-stone-900 mt-3">{value}</div>
      {sub && <div className="text-[11px] text-stone-500 mt-1">{sub}</div>}
    </div>
  );
}
