import { BadgeCheck } from 'lucide-react';

export function Verify() {
  return (
    <div className="max-w-[640px] mx-auto px-6 py-16 text-center">
      <h1 className="font-serif font-semibold text-[27px] text-[#171B21] tracking-[-0.01em]">
        Verify a record
      </h1>
      <p className="text-[#5A5F67] text-[14.5px] mt-3 max-w-[48ch] mx-auto">
        Paste a verify link, a record hash, or drop a proof file. Scribb checks it against the
        chain — the same check anyone outside your organization can run.
      </p>

      <div className="mt-8 bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-8 flex flex-col items-center gap-3">
        <BadgeCheck className="w-8 h-8 text-[#8A8F99]" strokeWidth={1.5} />
        <p className="text-sm text-[#5A5F67]">Verification tooling is coming soon.</p>
      </div>
    </div>
  );
}
