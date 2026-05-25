import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Panel } from '@/components/Panel';
import { Row } from '@/components/Row';
import type { Organization } from '@/types';

interface Props {
  org: Organization;
}

export function Settings({ org }: Props) {
  const roles = org.type === 'membership'
    ? ['Owner', 'Admin', 'Treasurer', 'Auditor', 'Member']
    : ['Owner', 'Admin', 'Finance Officer', 'Project Manager', 'Auditor', 'Viewer'];

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <Panel title="Workspace">
        <div className="space-y-4 text-sm">
          <Row label="Organization name" value={org.name} />
          <Row label="Type" value={org.type === 'membership' ? 'Membership' : 'Project / Nonprofit'} />
          <Row label="Default currency" value={org.currency} />
          <Row label="Created" value={org.createdAt} />
          <Row label="Workspace ID" value={<span className="font-mono text-xs">{org.id}</span>} />
        </div>
      </Panel>

      <Panel title="Roles & access">
        <p className="text-sm text-stone-600 mb-3">Roles control what each user can see, create, and approve.</p>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          {roles.map((r) => (
            <div key={r} className="px-3 py-2 bg-stone-50 rounded-md ring-1 ring-stone-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-stone-500" /> {r}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Blockchain anchoring">
        <div className="space-y-3 text-sm">
          <Row label="Network" value="Alkebuleum (placeholder)" />
          <Row
            label="Status"
            value={
              <span className="text-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            }
          />
          <Row label="Mode" value="Mock — proofs are simulated" />
        </div>
      </Panel>
    </div>
  );
}
