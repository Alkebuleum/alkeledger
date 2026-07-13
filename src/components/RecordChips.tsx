import type { LedgerStatus } from '@/types';

export function RecordChips({ status }: { status: LedgerStatus }) {
  if (status === 'draft' || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 font-plex text-[9.5px] tracking-[0.09em] px-2 py-0.5 rounded-[3px] border border-dashed border-[#DCD6C6] text-[#8A8F99]">
        ◦ {status.toUpperCase()}
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 font-plex text-[9.5px] tracking-[0.09em] px-2 py-0.5 rounded-[3px] border border-[#DCD6C6] text-[#8A8F99]">
        REJECTED
      </span>
    );
  }
  return (
    <span className="inline-flex gap-1.5 flex-wrap">
      <span className="inline-flex items-center gap-1 font-plex text-[9.5px] tracking-[0.09em] px-2 py-0.5 rounded-[3px] bg-[#8A1E2D] text-[#EFE9DC]">
        ■ SEALED
      </span>
      {status === 'anchored' && (
        <span className="inline-flex items-center gap-1 font-plex text-[9.5px] tracking-[0.09em] px-2 py-0.5 rounded-[3px] bg-[rgba(62,98,87,0.12)] text-[#3E6257] border border-[rgba(62,98,87,0.35)]">
          ✓ VERIFIED
        </span>
      )}
    </span>
  );
}
