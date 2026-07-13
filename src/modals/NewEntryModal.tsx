import { useState, useEffect } from 'react';
import { X, CheckCircle2, Paperclip, ShieldCheck, Upload, FileText } from 'lucide-react';
import { RECORD_TYPES, RECORD_TYPE_LABELS } from '@/lib/format';

// Decisions only ever come from Votes' "Log as decision" action (which links a real
// pollId) — never offer it here, where it'd just be a free-text entry with no vote behind it.
const MANUAL_RECORD_TYPES = RECORD_TYPES.filter((rt) => rt !== 'decision');
import { hashFile } from '@/lib/anchor';
import { uploadLedgerDocument } from '@/services/documents';
import { listMembers } from '@/services/members';
import type { LedgerEntry, LedgerStatus, Organization, RecordType, Member } from '@/types';

interface Props {
  org: Organization;
  user?: { uid: string; displayName: string };
  initialRecordType?: RecordType;
  onClose: () => void;
  onSave: (entry: LedgerEntry) => void | Promise<void>;
}

export function NewEntryModal({ org, user, initialRecordType, onClose, onSave }: Props) {
  const [recordType, setRecordType] = useState<RecordType>(initialRecordType ?? 'transaction');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [hasReceipt, setHasReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Credential fields
  const [members, setMembers] = useState<Member[]>([]);
  const [holderId, setHolderId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  // Document fields
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const isTransaction = recordType === 'transaction';
  const isCredential  = recordType === 'credential';
  const isDocument    = recordType === 'document';

  useEffect(() => {
    if (isCredential) listMembers(org.id).then(setMembers);
  }, [isCredential, org.id]);

  const categories = org.type === 'membership'
    ? ['Dues', 'Donation', 'Venue', 'Equipment', 'Travel', 'Outreach', 'Other']
    : org.type === 'cooperative'
    ? ['Contribution', 'Project Fund', 'Donation', 'Grant', 'Distribution', 'Equipment', 'Other']
    : ['Grant', 'Donation', 'Equipment', 'Contractor', 'Travel', 'Outreach', 'Other'];

  function onFileChange(f: File | null) {
    setFile(f);
    if (f && f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setFilePreview(null);
    }
  }

  const canSave =
    (!isTransaction || !!amount) &&
    (!isDocument || !!file) &&
    !!category && !!description;

  async function save(status: LedgerStatus) {
    if (!canSave) return;
    setSubmitting(true);
    setSaveError('');
    try {
      let receiptUrl: string | undefined;
      let fileHash: string | undefined;
      if (isDocument && file) {
        fileHash = await hashFile(file);
        const uploaded = await uploadLedgerDocument(org.id, file);
        receiptUrl = uploaded.url;
      } else if (hasReceipt) {
        receiptUrl = 'mock://receipt';
      }

      const holder = isCredential ? members.find((m) => m.id === holderId) : undefined;

      const entry: LedgerEntry = {
        id: 'le_' + Math.random().toString(36).slice(2, 7),
        orgId: org.id,
        recordType,
        type,
        amount: isTransaction ? parseFloat(amount) : 0,
        currency: org.currency,
        category,
        description,
        receiptUrl,
        fileHash,
        status,
        createdBy: user?.displayName ?? 'Unknown',
        createdByUid: user?.uid,
        createdAt: new Date().toISOString().slice(0, 10),
        anchorStatus: 'not_anchored',
        ...(isCredential ? {
          holderId: holder?.id,
          holderName: holder?.name ?? org.name,
          expiresAt: expiresAt || undefined,
        } : {}),
      };
      await onSave(entry);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save this entry. Try again.');
      setSubmitting(false);
    }
  }

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
          <div>
            <label className="text-xs text-stone-600">Record type</label>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {MANUAL_RECORD_TYPES.map((rt) => (
                <button
                  key={rt}
                  onClick={() => setRecordType(rt)}
                  className={`py-1.5 rounded-md text-xs font-medium ring-1 ${
                    recordType === rt ? 'bg-stone-900 text-stone-50 ring-stone-900' : 'bg-white text-stone-600 ring-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {RECORD_TYPE_LABELS[rt].replace(/s$/, '')}
                </button>
              ))}
            </div>
          </div>

          {isTransaction && (
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
          )}

          <div className={`grid grid-cols-1 gap-3 ${isTransaction ? 'sm:grid-cols-2' : ''}`}>
            {isTransaction && (
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
            )}
            <div>
              <label className="text-xs text-stone-600">Category</label>
              {isTransaction ? (
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
              ) : (
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={isCredential ? 'e.g. Board, Compliance' : 'e.g. Identity, Legal'}
                  className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              )}
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

          {isCredential && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-600">Holder</label>
                <select
                  value={holderId}
                  onChange={(e) => setHolderId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white"
                >
                  <option value="">Organization-level ({org.name})</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-600">Expires (optional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>
          )}

          {isDocument && (
            <div>
              <label className="text-xs text-stone-600">File</label>
              <label className="mt-1 flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-stone-300 rounded-md cursor-pointer hover:bg-stone-50 transition-colors">
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className="max-h-32 rounded" />
                ) : file ? (
                  <FileText className="w-6 h-6 text-stone-500" />
                ) : (
                  <Upload className="w-6 h-6 text-stone-400" />
                )}
                <span className="text-xs text-stone-500">{file ? file.name : 'Click to choose an image or PDF'}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          )}

          {isTransaction && (
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
          )}

          {saveError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{saveError}</div>
          )}

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
            disabled={submitting || !canSave}
            className="px-4 py-2 bg-stone-900 text-stone-50 rounded-md text-sm font-medium disabled:opacity-40 hover:bg-stone-800"
          >
            {submitting ? 'Saving…' : 'Submit for approval'}
          </button>
        </div>
      </div>
    </div>
  );
}
