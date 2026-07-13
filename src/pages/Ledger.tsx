import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { fmt, fmtDate, RECORD_TYPES, RECORD_TYPE_LABELS, recordTypeOf } from '@/lib/format';
import { listDuesPeriods } from '@/services/dues';
import { RecordChips } from '@/components/RecordChips';
import { CopyHashButton } from '@/components/CopyHashButton';
import { AnchorAction } from '@/components/AnchorAction';
import type { DuesPeriod, LedgerEntry, LedgerStatus, Organization, RecordType } from '@/types';

interface Props {
  ledger: LedgerEntry[];
  org: Organization;
  onAnchor: (id: string) => void | Promise<void>;
}

type StatusFilter = 'all' | LedgerStatus;
type TypeFilter = 'all' | RecordType;

const STATUS_FILTERS: StatusFilter[] = ['all', 'draft', 'pending', 'approved', 'rejected', 'anchored'];

function truncateHash(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash;
}

function isSealed(status: LedgerStatus): boolean {
  return status === 'approved' || status === 'anchored';
}

function dayLabel(iso: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (iso === today) return `Today · ${fmtDate(iso)}`;
  if (iso === yesterday) return `Yesterday · ${fmtDate(iso)}`;
  return fmtDate(iso);
}

export function Ledger({ ledger, org, onAnchor }: Props) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [periods, setPeriods] = useState<DuesPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (org.type !== 'membership') return;
    listDuesPeriods(org.id).then(setPeriods);
  }, [org.id, org.type]);

  const filtered = ledger.filter((e) => {
    if (typeFilter !== 'all' && recordTypeOf(e) !== typeFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (selectedPeriodId && e.duesPeriodId !== selectedPeriodId) return false;
    return true;
  });

  const selected = filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null;
  const latest = ledger[0];

  // Group filtered entries by day, preserving incoming (most-recent-first) order
  const groups: { day: string; entries: LedgerEntry[] }[] = [];
  for (const e of filtered) {
    const day = e.createdAt?.slice(0, 10) ?? '';
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.entries.push(e);
    else groups.push({ day, entries: [e] });
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1160px] grid xl:grid-cols-[1fr_350px] gap-6 items-start">
      <div className="min-w-0">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-1">
          <div>
            <h1 className="font-serif font-semibold text-[27px] text-[#171B21] tracking-[-0.01em]">Ledger</h1>
            <div className="font-plex text-[11px] text-[#8A8F99] tracking-[0.04em] mt-1">
              {filtered.length !== ledger.length ? `${filtered.length} OF ${ledger.length} ENTRIES` : `${ledger.length} ENTRIES`}
              {latest ? ` · LATEST ${fmtDate(latest.createdAt).toUpperCase()}` : ''} · APPEND-ONLY
            </div>
          </div>
        </div>

        {/* Mobile: dropdown filters — a scrolling row of pills doesn't scale to
            5-6 options on a narrow screen (easy to miss options past the fold) */}
        <div className="sm:hidden flex items-center gap-2 mt-5">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="flex-1 min-w-0 px-3 py-2 border border-[#DCD6C6] rounded-md text-sm bg-[#FDFCF8] text-[#171B21] focus:outline-none focus:ring-2 focus:ring-[#171B21]/10"
          >
            <option value="all">All types</option>
            {RECORD_TYPES.map((rt) => (
              <option key={rt} value={rt}>{RECORD_TYPE_LABELS[rt]}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="flex-1 min-w-0 px-3 py-2 border border-[#DCD6C6] rounded-md text-sm bg-[#FDFCF8] text-[#171B21] focus:outline-none focus:ring-2 focus:ring-[#171B21]/10"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f} value={f}>{f === 'all' ? 'All statuses' : f[0].toUpperCase() + f.slice(1)}</option>
            ))}
          </select>
        </div>
        {org.type === 'membership' && periods.length > 0 && (
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="sm:hidden mt-2 w-full px-3 py-2 border border-[#DCD6C6] rounded-md text-sm bg-[#FDFCF8] text-[#171B21] focus:outline-none focus:ring-2 focus:ring-[#171B21]/10"
          >
            <option value="">All periods</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <div className="sm:hidden mb-2" />

        {/* Desktop: record type filter — primary */}
        <div className="hidden sm:block relative mt-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 pr-6 scrollbar-none">
            <button
              onClick={() => setTypeFilter('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilter === 'all'
                  ? 'bg-[#171B21] border border-[#171B21] text-[#EFE9DC]'
                  : 'border border-[#DCD6C6] text-[#5A5F67] hover:bg-[#FDFCF8]'
              }`}
            >
              All
            </button>
            {RECORD_TYPES.map((rt) => (
              <button
                key={rt}
                onClick={() => setTypeFilter(rt)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  typeFilter === rt
                    ? 'bg-[#171B21] border border-[#171B21] text-[#EFE9DC]'
                    : 'border border-[#DCD6C6] text-[#5A5F67] hover:bg-[#FDFCF8]'
                }`}
              >
                {RECORD_TYPE_LABELS[rt]}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: status filter + dues period — secondary */}
        <div className="hidden sm:block relative mt-2.5 mb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pr-6 scrollbar-none">
            {org.type === 'membership' && periods.length > 0 && (
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="shrink-0 px-2.5 py-1 border border-[#DCD6C6] rounded-full text-[11px] bg-transparent text-[#5A5F67] focus:outline-none focus:ring-2 focus:ring-[#171B21]/10"
              >
                <option value="">All periods</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium capitalize transition-colors ${
                  statusFilter === f
                    ? 'bg-[#EFECE2] border border-[#DCD6C6] text-[#171B21]'
                    : 'border border-dashed border-[#DCD6C6] text-[#8A8F99] hover:bg-[#FDFCF8]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.day}>
              <div className="flex items-center gap-3 font-plex text-[10.5px] tracking-[0.16em] uppercase text-[#8A8F99] mb-2">
                {dayLabel(group.day)}
                <span className="flex-1 h-px bg-[#DCD6C6]" />
              </div>
              <div className="space-y-2">
                {group.entries.map((e) => {
                  const rt = recordTypeOf(e);
                  const isTxn = rt === 'transaction';
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className={`w-full grid grid-cols-[18px_1fr_auto] gap-3 items-start text-left bg-[#FDFCF8] border rounded-lg px-4 py-3.5 transition-colors ${
                        selected?.id === e.id
                          ? 'border-[#171B21] shadow-[0_6px_18px_-10px_rgba(23,27,33,0.3)]'
                          : 'border-[#DCD6C6] hover:border-[#C8C1AD]'
                      }`}
                    >
                      <span className={`w-[18px] h-[5px] rounded-sm mt-1.5 ${isSealed(e.status) ? 'bg-[#8A1E2D]' : 'bg-[#8A8F99]'}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#171B21] leading-[1.35]">{e.description}</div>
                        <div className="text-[12.5px] text-[#5A5F67] mt-0.5">{e.category} · Recorded by {e.createdBy}</div>
                        <div className="mt-1.5"><RecordChips status={e.status} /></div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-plex text-[9.5px] tracking-[0.1em] text-[#8A8F99]">{rt.toUpperCase()}</div>
                        {isTxn && (
                          <div className={`text-sm font-medium mt-1 ${e.type === 'income' ? 'text-[#3E6257]' : 'text-[#171B21]'}`}>
                            {e.type === 'income' ? '+' : '−'}{fmt(e.amount, e.currency)}
                          </div>
                        )}
                        {e.hash && (
                          <div className="font-plex text-[10.5px] text-[#8A8F99] mt-1">{truncateHash(e.hash)}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg py-12 text-center text-[#5A5F67] text-sm">
              No entries match this filter.
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <aside className="hidden xl:block bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-[22px] sticky top-[78px]">
          <div className="font-plex text-[10px] tracking-[0.14em] text-[#8A1E2D]">
            {recordTypeOf(selected).toUpperCase()} · {selected.category.toUpperCase()}
          </div>
          <h2 className="font-serif font-semibold text-[20px] text-[#171B21] leading-[1.25] mt-2 mb-3">
            {selected.description}
          </h2>

          <div className="grid grid-cols-[86px_1fr] gap-x-3 gap-y-1.5 text-[12.5px] py-3.5 border-t border-b border-[#EAE6D9]">
            <span className="font-plex text-[10.5px] text-[#8A8F99] tracking-[0.06em] pt-px">recorded</span>
            <span className="text-[#171B21]">{fmtDate(selected.createdAt)} · {selected.createdBy}</span>
            {recordTypeOf(selected) === 'transaction' && (
              <>
                <span className="font-plex text-[10.5px] text-[#8A8F99] tracking-[0.06em] pt-px">amount</span>
                <span className="text-[#171B21]">{selected.type === 'income' ? '+' : '−'}{fmt(selected.amount, selected.currency)}</span>
              </>
            )}
            {selected.approvedBy && (
              <>
                <span className="font-plex text-[10.5px] text-[#8A8F99] tracking-[0.06em] pt-px">approved</span>
                <span className="text-[#171B21]">{selected.approvedBy}{selected.approvedAt ? ` · ${fmtDate(selected.approvedAt)}` : ''}</span>
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

          {selected.pollId && (
            <Link
              to={`/${org.slug ?? org.id}/proposals`}
              className="mt-4 flex items-center justify-center gap-1.5 text-[13.5px] font-medium text-[#171B21] border border-[#DCD6C6] rounded-[5px] py-2.5 hover:bg-[#F6F4ED] transition-colors"
            >
              View proposal <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}

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
