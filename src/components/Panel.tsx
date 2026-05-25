import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Panel({ title, children, actions }: Props) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-stone-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between">
        <h3 className="font-display text-lg">{title}</h3>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
