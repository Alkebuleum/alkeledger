import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
}

export function Row({ label, value }: Props) {
  return (
    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
      <span className="text-stone-500">{label}</span>
      <span className="text-stone-900 font-medium">{value}</span>
    </div>
  );
}
