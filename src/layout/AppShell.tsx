import { useState } from 'react';
import { Sidebar, type PageId } from './Sidebar';
import { TopBar } from './TopBar';
import type { Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

interface Props {
  org: Organization;
  orgs: Organization[];
  onSwitchOrg: (id: string) => void;
  page: PageId;
  setPage: (page: PageId) => void;
  onNewEntry: () => void;
  onExit: () => void;
  onNewOrg?: () => void;
  user: AuthUser;
  children: ReactNode;
}

export function AppShell({ org, orgs, onSwitchOrg, page, setPage, onNewEntry, onExit, onNewOrg, user, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNav = (p: PageId) => {
    setPage(p);
    setSidebarOpen(false); // close drawer on mobile after navigating
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static column on desktop */}
      <div
        className={`
          fixed inset-y-0 left-0 z-30 w-64 transition-transform duration-200
          lg:static lg:translate-x-0 lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          org={org}
          orgs={orgs}
          onSwitchOrg={onSwitchOrg}
          page={page}
          setPage={handleNav}
          onExit={onExit}
          onNewOrg={onNewOrg}
          onClose={() => setSidebarOpen(false)}
          user={user}
        />
      </div>

      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar
          org={org}
          page={page}
          onNewEntry={onNewEntry}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
        />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
