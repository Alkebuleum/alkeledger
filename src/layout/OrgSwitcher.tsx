import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { Organization } from '@/types';

interface Props {
  orgs: Organization[];
  pendingOrgs?: Organization[];
  current: Organization;
  onSwitch: (id: string) => void;
}

function OrgAvatar({ org, size }: { org: Organization; size: 'sm' | 'md' }) {
  const dim   = size === 'md' ? 'w-8 h-8 text-[11px]' : 'w-6 h-6 text-[10px]';
  const inner = org.logoUrl
    ? <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain rounded-md" />
    : <span className="font-semibold">{org.logoInitials}</span>;

  return (
    <div className={`${dim} rounded-md bg-stone-900 text-stone-50 flex items-center justify-center overflow-hidden shrink-0`}>
      {inner}
    </div>
  );
}

export function OrgSwitcher({ orgs, pendingOrgs = [], current, onSwitch }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="px-3 py-3 border-b border-stone-200 relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-stone-100"
      >
        <OrgAvatar org={current} size="md" />
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
              onClick={() => { onSwitch(o.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-stone-50 ${
                o.id === current.id ? 'bg-stone-50' : ''
              }`}
            >
              <OrgAvatar org={o} size="sm" />
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
                  <OrgAvatar org={o} size="sm" />
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
