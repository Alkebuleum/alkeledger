import { useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { fmtDate, recordTypeOf } from '@/lib/format';
import { RecordChips } from '@/components/RecordChips';
import { CopyHashButton } from '@/components/CopyHashButton';
import { AnchorAction } from '@/components/AnchorAction';
import type { LedgerEntry, LedgerStatus } from '@/types';

interface Props {
  ledger: LedgerEntry[];
  onIssue: () => void;
  onAnchor: (id: string) => void | Promise<void>;
}

type StatusFilter = 'all' | LedgerStatus;

const STATUS_FILTERS: StatusFilter[] = ['all', 'draft', 'pending', 'approved', 'rejected', 'anchored'];

function Thumb({ url }: { url?: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className="w-11 h-11 rounded-md bg-[#EFECE2] flex items-center justify-center shrink-0">
        <FileText className="w-4.5 h-4.5 text-[#8A8F99]" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      onError={() => setFailed(true)}
      className="w-11 h-11 rounded-md object-cover shrink-0 border border-[#DCD6C6]"
    />
  );
}

export function LedgerDocuments({ ledger, onIssue, onAnchor }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const documents = ledger.filter((e) => recordTypeOf(e) === 'document');
  const filtered = statusFilter === 'all' ? documents : documents.filter((e) => e.status === statusFilter);
  const selected = filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="p-4 sm:p-8 max-w-[1160px] grid xl:grid-cols-[1fr_350px] gap-6 items-start">
      <div className="min-w-0">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-1">
          <div>
            <h1 className="font-serif font-semibold text-[27px] text-[#171B21] tracking-[-0.01em]">Documents</h1>
            <div className="font-plex text-[11px] text-[#8A8F99] tracking-[0.04em] mt-1">
              {documents.length} UPLOADED · ANCHORABLE EVIDENCE
            </div>
          </div>
          <button
            onClick={onIssue}
            className="inline-flex items-center gap-2 border border-[#DCD6C6] text-[#171B21] text-sm font-medium px-4 py-2 rounded-md hover:bg-[#F6F4ED] transition-colors"
          >
            <Upload className="w-4 h-4" /> Upload document
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none mt-5 mb-4">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                statusFilter === f
                  ? 'bg-[#171B21] border border-[#171B21] text-[#EFE9DC]'
                  : 'border border-[#DCD6C6] text-[#5A5F67] hover:bg-[#FDFCF8]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg py-16 text-center">
            <FileText className="w-7 h-7 mx-auto text-[#8A8F99] mb-3" strokeWidth={1.5} />
            <p className="text-sm text-[#5A5F67]">No documents match this filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`w-full flex items-center gap-3.5 text-left bg-[#FDFCF8] border rounded-lg px-4 py-3.5 transition-colors ${
                  selected?.id === e.id
                    ? 'border-[#171B21] shadow-[0_6px_18px_-10px_rgba(23,27,33,0.3)]'
                    : 'border-[#DCD6C6] hover:border-[#C8C1AD]'
                }`}
              >
                <Thumb url={e.receiptUrl} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#171B21] leading-[1.35]">{e.description}</div>
                  <div className="text-[12.5px] text-[#5A5F67] mt-0.5">{e.category} · Uploaded by {e.createdBy}</div>
                  <div className="mt-1.5"><RecordChips status={e.status} /></div>
                </div>
                <div className="text-right shrink-0 font-plex text-[10.5px] text-[#8A8F99]">
                  {fmtDate(e.createdAt)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <aside className="hidden xl:block bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-[22px] sticky top-[78px]">
          <div className="font-plex text-[10px] tracking-[0.14em] text-[#8A1E2D]">
            DOCUMENT · {selected.category.toUpperCase()}
          </div>
          <h2 className="font-serif font-semibold text-[20px] text-[#171B21] leading-[1.25] mt-2 mb-3">
            {selected.description}
          </h2>

          <Thumb url={selected.receiptUrl} />

          <div className="grid grid-cols-[86px_1fr] gap-x-3 gap-y-1.5 text-[12.5px] py-3.5 mt-3.5 border-t border-b border-[#EAE6D9]">
            <span className="font-plex text-[10.5px] text-[#8A8F99] tracking-[0.06em] pt-px">uploaded</span>
            <span className="text-[#171B21]">{fmtDate(selected.createdAt)} · {selected.createdBy}</span>
            {selected.approvedBy && (
              <>
                <span className="font-plex text-[10.5px] text-[#8A8F99] tracking-[0.06em] pt-px">approved</span>
                <span className="text-[#171B21]">{selected.approvedBy}{selected.approvedAt ? ` · ${fmtDate(selected.approvedAt)}` : ''}</span>
              </>
            )}
            {selected.fileHash && (
              <>
                <span className="font-plex text-[10.5px] text-[#8A8F99] tracking-[0.06em] pt-px">file hash</span>
                <span className="font-plex text-[11px] text-[#171B21] break-all">{selected.fileHash}</span>
              </>
            )}
            {selected.hash && (
              <>
                <span className="font-plex text-[10.5px] text-[#8A8F99] tracking-[0.06em] pt-px">hash</span>
                <span className="font-plex text-[11px] text-[#171B21] break-all">{selected.hash}</span>
              </>
            )}
            {selected.txHash && (
              <>
                <span className="font-plex text-[10.5px] text-[#8A8F99] tracking-[0.06em] pt-px">on-chain</span>
                <span className="font-plex text-[11px] text-[#171B21] break-all">{selected.txHash}</span>
              </>
            )}
          </div>

          {selected.hash && (
            <div className="mt-4 grid gap-1.5">
              <CopyHashButton hash={selected.hash} />
            </div>
          )}

          <AnchorAction key={selected.id} entry={selected} onAnchor={onAnchor} />
        </aside>
      )}
    </div>
  );
}
