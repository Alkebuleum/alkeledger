import { useState } from 'react';
import { Copy } from 'lucide-react';

export function CopyHashButton({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={copy}
      className="w-full flex items-center justify-center gap-2 bg-[#171B21] text-[#EFE9DC] rounded-[5px] text-[13.5px] font-medium py-2.5 hover:bg-[#232935] transition-colors"
    >
      <Copy className="w-3.5 h-3.5" />
      {copied ? 'Copied!' : 'Copy hash'}
    </button>
  );
}
