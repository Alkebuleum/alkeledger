import { useEffect, useRef, useState } from 'react';
import {
  Upload, FileText, FileImage, FileSpreadsheet, File,
  Download, Eye, Trash2, X, FolderOpen, Search,
} from 'lucide-react';
import { listDocuments, uploadDocument, deleteDocument } from '@/services/documents';
import { can, useRole } from '@/hooks/useRole';
import type { DocumentRecord, Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  user: AuthUser;
}

const CATEGORIES = ['Constitution / Bylaws', 'Minutes', 'Financial', 'Contracts', 'Policies', 'Reports', 'Other'];

// ─── File type helpers ────────────────────────────────────────────────────────

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext))
    return <FileText className="w-4 h-4 text-red-500" />;
  if (['doc', 'docx', 'odt', 'txt', 'rtf'].includes(ext))
    return <FileText className="w-4 h-4 text-blue-500" />;
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext))
    return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext))
    return <FileImage className="w-4 h-4 text-purple-500" />;
  return <File className="w-4 h-4 text-stone-500" />;
}

function isViewable(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Documents({ org, user }: Props) {
  const role    = useRole(org.id, user.uid);
  const isAdmin = can.manage(role);

  const [docs,       setDocs]       = useState<DocumentRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);

  const reload = () => {
    setLoading(true);
    listDocuments(org.id).then((d) => { setDocs(d); setLoading(false); });
  };

  useEffect(() => { reload(); }, [org.id]);

  const handleDelete = async (d: DocumentRecord) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    await deleteDocument(org.id, d.id, d.storagePath);
    reload();
  };

  const categories = ['all', ...CATEGORIES.filter((c) => docs.some((d) => d.category === c))];

  const filtered = docs.filter((d) => {
    if (catFilter !== 'all' && d.category !== catFilter) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-8 max-w-5xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono">§ Files</div>
          <h2 className="font-display text-2xl mt-0.5">Documents</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="px-3 py-2 bg-stone-900 text-stone-50 text-sm font-medium flex items-center gap-1.5 hover:bg-stone-800 rounded"
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
        )}
      </div>

      {/* Search + category filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="pl-8 pr-3 py-1.5 border border-stone-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-stone-900 w-48"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${
                catFilter === c
                  ? 'bg-stone-900 text-stone-50'
                  : 'bg-white ring-1 ring-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              {c === 'all' ? `All (${docs.length})` : c}
            </button>
          ))}
        </div>
      </div>

      {/* Document list */}
      <div className="bg-white rounded-xl ring-1 ring-stone-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-stone-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            <FolderOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{search || catFilter !== 'all' ? 'No files match this filter.' : 'No documents uploaded yet.'}</p>
            {isAdmin && !search && catFilter === 'all' && (
              <button onClick={() => setShowUpload(true)} className="mt-3 text-sm text-stone-600 underline">
                Upload the first one
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-widest text-stone-500 border-b border-stone-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Category</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Uploaded</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Size</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-stone-50 group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-stone-100 flex items-center justify-center shrink-0">
                        {fileIcon(d.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-stone-900 font-medium truncate max-w-[200px] sm:max-w-xs">{d.name}</div>
                        {d.uploadedBy && (
                          <div className="text-[11px] text-stone-400">by {d.uploadedBy}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-stone-500 text-xs hidden sm:table-cell">{d.category}</td>
                  <td className="px-5 py-3 text-stone-500 text-xs hidden md:table-cell whitespace-nowrap">{d.uploaded}</td>
                  <td className="px-5 py-3 text-stone-500 text-xs hidden md:table-cell">{d.size}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.url && isViewable(d.name) && (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-stone-400 hover:text-stone-900 hover:bg-stone-100"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {d.url && (
                        <a
                          href={d.url}
                          download={d.name}
                          className="p-1.5 rounded-md text-stone-400 hover:text-stone-900 hover:bg-stone-100"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(d)}
                          className="p-1.5 rounded-md text-stone-300 hover:text-red-500 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showUpload && (
        <UploadModal
          org={org}
          user={user}
          onClose={() => setShowUpload(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

// ─── UploadModal ──────────────────────────────────────────────────────────────

function UploadModal({
  org, user, onClose, onSaved,
}: {
  org: Organization;
  user: AuthUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [file,     setFile]     = useState<File | null>(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [uploading, setUploading] = useState(false);
  const [error,    setError]    = useState('');

  const handleFile = (f: File) => {
    if (f.size > 25 * 1024 * 1024) { setError('File must be under 25 MB.'); return; }
    setError('');
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await uploadDocument(org.id, file, category, user.displayName);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md border border-stone-200 shadow-2xl rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">Upload document</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              file ? 'border-emerald-400 bg-emerald-50' : 'border-stone-300 hover:border-stone-400 hover:bg-stone-50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                {fileIcon(file.name)}
                <span className="text-sm font-medium text-stone-900 truncate max-w-[250px]">{file.name}</span>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 mx-auto mb-2 text-stone-400" />
                <p className="text-sm text-stone-600">Drop a file here or click to browse</p>
                <p className="text-xs text-stone-400 mt-1">Max 25 MB</p>
              </>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-between items-center">
          <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-900">Cancel</button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-40 rounded flex items-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Uploading…
              </>
            ) : (
              <><Upload className="w-4 h-4" /> Upload</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
