import { statusStyles } from '@/lib/format';

interface Props {
  value: string;
}

export function StatusPill({ value }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${
        statusStyles[value] ?? 'bg-stone-100 text-stone-700 ring-stone-200'
      }`}
    >
      {value.replace('_', ' ')}
    </span>
  );
}
