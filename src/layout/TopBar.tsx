import { Search, Plus, Menu } from 'lucide-react';
import type { Organization } from '@/types';
import type { PageId } from './Sidebar';

interface Props {
  org: Organization;
  page: PageId;
  onNewEntry: () => void;
  onMenuToggle: () => void;
}

const titles: Record<PageId, string> = {
  dashboard: 'Dashboard',
  members: 'Members',
  dues: 'Dues',
  ledger: 'The Ledger',
  announcements: 'Announcements',
  requests: 'Member Requests',
  projects: 'Projects',
  budgets: 'Budgets',
  income: 'Income',
  expenses: 'Expenses',
  approvals: 'Approvals',
  documents: 'Documents',
  reports: 'Reports',
  transparency: 'Public Transparency',
  anchors: 'Proof & Anchoring',
  settings: 'Settings',
};

export function TopBar({ org, page, onNewEntry, onMenuToggle }: Props) {
  return (
    <header className="border-b-2 border-[var(--ink)] bg-[var(--bone)] shrink-0">
      <div className="px-4 sm:px-8 py-3 sm:py-5 flex items-center gap-3">
        {/* Hamburger — visible only on mobile */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-1 text-stone-700 hover:bg-stone-100 rounded"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono truncate">{org.name}</div>
          <h1 className="font-display text-2xl sm:text-3xl text-[var(--ink)] mt-0.5 tracking-[-0.02em] leading-tight">
            {titles[page]}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button className="hidden sm:flex px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 items-center gap-2 border border-stone-300">
            <Search className="w-4 h-4" /> Search
          </button>
          <button className="sm:hidden p-2 text-stone-700 hover:bg-stone-100 border border-stone-300">
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={onNewEntry}
            className="px-3 sm:px-4 py-2 bg-[var(--ink)] text-[var(--bone)] text-sm font-medium hover:bg-stone-800 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New entry</span>
          </button>
        </div>
      </div>
    </header>
  );
}
