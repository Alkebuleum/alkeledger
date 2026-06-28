import { Check, X, CheckCircle2 } from 'lucide-react';
import { fmt } from '@/lib/format';
import type { LedgerEntry, LedgerStatus } from '@/types';

interface Props {
  ledger: LedgerEntry[];
  onDecide: (id: string, status: LedgerStatus) => void | Promise<void>;
}

export function Approvals({ ledger, onDecide }: Props) {
  const pending = ledger.filter((l) => l.status === 'pending');

  return (
    <div className="p-4 sm:p-8 max-w-5xl space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="text-stone-600 text-sm">
          {pending.length} record{pending.length === 1 ? '' : 's'} awaiting decision.
        </p>
        <span className="text-[11px] text-stone-500">Approvals create an immutable audit log entry.</span>
      </div>

      {pending.length === 0 && (
        <div className="bg-white rounded-xl ring-1 ring-stone-200 p-10 text-center text-stone-500 text-sm">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
          Nothing pending. The ledger is clear.
        </div>
      )}

      {pending.map((e) => (
        <div key={e.id} className="bg-white rounded-xl ring-1 ring-stone-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    e.type === 'income' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                  }`}
                >
                  {e.type}
                </span>
                <span className="text-xs text-stone-500">{e.id} · submitted {e.createdAt}</span>
              </div>
              <div className="font-display text-xl text-stone-900">{e.description}</div>
              <div className="text-sm text-stone-600 mt-1">
                {e.category} · submitted by {e.createdBy}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl text-stone-900">{fmt(e.amount, e.currency)}</div>
              <div className="text-[11px] text-stone-500">{e.currency}</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-stone-100 flex justify-end gap-2">
            <button
              onClick={() => onDecide(e.id, 'rejected')}
              className="px-4 py-2 bg-white ring-1 ring-stone-300 text-stone-700 rounded-md text-sm hover:bg-stone-50 flex items-center gap-1.5"
            >
              <X className="w-4 h-4" /> Reject
            </button>
            <button
              onClick={() => onDecide(e.id, 'approved')}
              className="px-4 py-2 bg-stone-900 text-stone-50 rounded-md text-sm hover:bg-stone-800 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Approve
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
