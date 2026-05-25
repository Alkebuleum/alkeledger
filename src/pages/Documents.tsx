import { Upload, FileText, Eye, Download } from 'lucide-react';
import { Panel } from '@/components/Panel';
import { MOCK_DOCUMENTS } from '@/data/mock';
import type { Organization } from '@/types';

interface Props {
  org: Organization;
}

export function Documents({ org }: Props) {
  const docs = MOCK_DOCUMENTS.filter((d) => d.orgId === org.id);

  return (
    <div className="p-8 max-w-6xl">
      <Panel
        title="Documents & policies"
        actions={
          <button className="px-3 py-1.5 bg-stone-900 text-stone-50 rounded-md text-xs font-medium flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
        }
      >
        {/* 🔌 FIREBASE — wire to services/documents.ts → uploadDocument() */}
        <div className="divide-y divide-stone-100 -mx-5 -mb-5">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-9 h-9 rounded-md bg-stone-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-stone-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-stone-900 truncate">{d.name}</div>
                <div className="text-[11px] text-stone-500">
                  {d.category} · {d.size} · uploaded {d.uploaded}
                </div>
              </div>
              <button className="text-stone-500 hover:text-stone-900 px-2 py-1 text-xs flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> View
              </button>
              <button className="text-stone-500 hover:text-stone-900 px-2 py-1 text-xs flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
