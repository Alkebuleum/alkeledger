import { useState } from 'react';
import { X, CheckCircle2, Paperclip, ShieldCheck } from 'lucide-react';
import type { LedgerEntry, LedgerStatus, Organization } from '@/types';

interface Props {
  org: Organization;
  user?: { uid: string; displayName: string };
  onClose: () => void;
  onSave: (entry: LedgerEntry) => void | Promise<void>;
}

export function NewEntryModal({ org, user, onClose, onSave }: Props) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [hasReceipt, setHasReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const categories = org.type === 'membership'
    ? ['Dues', 'Donation', 'Venue', 'Equipment', 'Travel', 'Outreach', 'Other']
    : ['Grant', 'Donation', 'Equipment', 'Contractor', 'Travel', 'Outreach', 'Other'];

  const save = (status: LedgerStatus) => {
    if (!amount || !category || !description) return;
    setSubmitting(true);
    const entry: LedgerEntry = {
      id: 'le_' + Math.random().toString(36).slice(2, 7),
      orgId: org.id,
      type,
      amount: parseFloat(amount),
      currency: org.currency,
      category,
      description,
      receiptUrl: hasReceipt ? 'mock://receipt' : undefined,
      status,
      createdBy: user?.displayName ?? 'Unknown',
      createdByUid: user?.uid,
      createdAt: new Date().toISOString().slice(0, 10),
      anchorStatus: 'not_anchored',
    };
    setTimeout(() => onSave(entry), 250);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-2xl sm:rounded-xl ring-1 ring-stone-200 shadow-2xl w-full sm:max-w-lg overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">New ledger entry</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-md">
            <button
              onClick={() => setType('expense')}
              className={`py-2 rounded text-sm font-medium ${type === 'expense' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-600'}`}
            >
              Expense
            </button>
            <button
              onClick={() => setType('income')}
              className={`py-2 rounded text-sm font-medium ${type === 'income' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-600'}`}
            >
              Income
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-600">Amount</label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">{org.currency}</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-stone-600">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white"
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-600">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this for?"
              className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <button
            onClick={() => setHasReceipt(!hasReceipt)}
            className={`w-full px-3 py-2.5 rounded-md text-sm flex items-center justify-center gap-2 ring-1 ${
              hasReceipt ? 'bg-emerald-50 ring-emerald-200 text-emerald-800' : 'bg-stone-50 ring-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            {hasReceipt ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Receipt attached
              </>
            ) : (
              <>
                <Paperclip className="w-4 h-4" /> Attach receipt
              </>
            )}
          </button>

          <div className="text-[11px] text-stone-500 flex items-start gap-2 p-3 bg-stone-50 rounded-md">
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-none text-emerald-700" />
            Once approved, this record will be hashed and queued for blockchain anchoring.
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-200 flex justify-between">
          <button onClick={() => save('draft')} disabled={submitting} className="px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 rounded-md">
            Save as draft
          </button>
          <button
            onClick={() => save('pending')}
            disabled={submitting || !amount || !category || !description}
            className="px-4 py-2 bg-stone-900 text-stone-50 rounded-md text-sm font-medium disabled:opacity-40 hover:bg-stone-800"
          >
            Submit for approval
          </button>
        </div>
      </div>
    </div>
  );
}
