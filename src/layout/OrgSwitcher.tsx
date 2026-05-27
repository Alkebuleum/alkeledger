import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { Organization } from '@/types';

interface Props {
  orgs: Organization[];
  pendingOrgs?: Organization[];
  current: Organization;
  onSwitch: (id: string) => void;
}

export function OrgSwitcher({ orgs, pendingOrgs = [], current, onSwitch }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="px-3 py-3 border-b border-stone-200 relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-stone-100"
      >
        <div className="w-8 h-8 rounded-md bg-stone-900 text-stone-50 flex items-center justify-center text-[11px] font-semibold">
          {current.logoInitials}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium text-stone-900 truncate">{current.name}</div>
          <div className="text-[11px] text-stone-500 capitalize">
            {current.type === 'membership' ? 'Membership' : 'Project / Nonprofit'}
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-stone-400" />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white ring-1 ring-stone-200 rounded-md shadow-lg z-30 py-1">
          {orgs.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                onSwitch(o.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-stone-50 ${
                o.id === current.id ? 'bg-stone-50' : ''
              }`}
            >
              <div className="w-6 h-6 rounded bg-stone-900 text-stone-50 flex items-center justify-center text-[10px]">
                {o.logoInitials}
              </div>
              <div className="flex-1 text-left">
                <div className="text-stone-900">{o.name}</div>
                <div className="text-[10px] text-stone-500 capitalize">{o.type}</div>
              </div>
              {o.id === current.id && <Check className="w-4 h-4 text-stone-900" />}
            </button>
          ))}

          {pendingOrgs.length > 0 && (
            <>
              {orgs.length > 0 && <div className="my-1 border-t border-stone-100" />}
              {pendingOrgs.map((o) => (
                <div
                  key={o.id}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm opacity-60 cursor-default"
                >
                  <div className="w-6 h-6 rounded bg-stone-300 text-stone-600 flex items-center justify-center text-[10px]">
                    {o.logoInitials}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-stone-700 truncate">{o.name}</div>
                    <div className="text-[10px] text-stone-400">Pending approval</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
