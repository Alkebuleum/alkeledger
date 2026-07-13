import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { isDemoOrgId } from '@/lib/demo';
import type { Organization } from '@/types';

function DemoBadge() {
  return (
    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
      Demo
    </span>
  );
}

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
    <div className={`${dim} rounded-md bg-[#3E6257] text-[#EFE9DC] flex items-center justify-center overflow-hidden shrink-0`}>
      {inner}
    </div>
  );
}

export function OrgSwitcher({ orgs, pendingOrgs = [], current, onSwitch }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="px-3 py-3 border-b border-[rgba(239,233,220,0.1)] relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md bg-[#232935] border border-[rgba(239,233,220,0.1)] hover:bg-[#2A303C] transition-colors"
      >
        <OrgAvatar org={current} size="md" />
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-medium text-[#EFE9DC] truncate">{current.name}</div>
            {isDemoOrgId(current.id) && <DemoBadge />}
          </div>
          <div className="text-[11px] text-[#8A8F99] capitalize">
            {current.type === 'membership' ? 'Membership' : current.type === 'cooperative' ? 'Community Cooperative' : 'Project / Nonprofit'}
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-[#8A8F99]" />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-[#FDFCF8] ring-1 ring-[#DCD6C6] rounded-md shadow-lg z-30 py-1">
          {orgs.map((o) => (
            <button
              key={o.id}
              onClick={() => { onSwitch(o.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-stone-50 ${
                o.id === current.id ? 'bg-stone-50' : ''
              }`}
            >
              <OrgAvatar org={o} size="sm" />
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="text-stone-900 truncate">{o.name}</div>
                  {isDemoOrgId(o.id) && <DemoBadge />}
                </div>
                <div className="text-[10px] text-stone-500 capitalize">{o.type}</div>
              </div>
              {o.id === current.id && <Check className="w-4 h-4 text-stone-900 shrink-0" />}
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
