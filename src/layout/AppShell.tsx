import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar, type PageId } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';
import type { Organization, AppNotif } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

interface Props {
  org: Organization;
  orgs: Organization[];
  pendingOrgs?: Organization[];
  onSwitchOrg: (id: string) => void;
  page: PageId;
  onNewEntry: () => void;
  onExit: () => void;
  onNewOrg?: () => void;
  user: AuthUser;
  children: ReactNode;
  notifs: AppNotif[];
  totalUnread: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  unreadCounts: Partial<Record<PageId, number>>;
}

export function AppShell({ org, orgs, pendingOrgs, onSwitchOrg, page, onNewEntry, onExit, onNewOrg, user, children, notifs, totalUnread, onMarkRead, onMarkAllRead, unreadCounts }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar drawer on any navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const slug = org.slug ?? org.id;

  return (
    <div className="h-dvh flex overflow-hidden">
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
          pendingOrgs={pendingOrgs}
          slug={slug}
          onSwitchOrg={onSwitchOrg}
          page={page}
          onExit={onExit}
          onNewOrg={onNewOrg}
          onClose={() => setSidebarOpen(false)}
          user={user}
          unreadCounts={unreadCounts}
        />
      </div>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <TopBar
          org={org}
          page={page}
          onNewEntry={onNewEntry}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
          notifs={notifs}
          totalUnread={totalUnread}
          onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead}
        />
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-safe bg-[#F6F4ED]">{children}</div>
        <BottomNav
          org={org}
          page={page}
          slug={slug}
          onMore={() => setSidebarOpen(true)}
          unreadCounts={unreadCounts}
        />
      </main>
      <PWAInstallBanner />
    </div>
  );
}
