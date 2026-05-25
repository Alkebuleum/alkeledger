import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useMatch, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrgs } from '@/hooks/useOrg';
import { useLedger } from '@/hooks/useLedger';
import { AppShell } from '@/layout/AppShell';
import type { PageId } from '@/layout/Sidebar';
import { Landing } from '@/pages/Landing';
import { SignIn } from '@/pages/SignIn';
import { OrgSetup } from '@/pages/OrgSetup';
import { Dashboard } from '@/pages/Dashboard';
import { Ledger } from '@/pages/Ledger';
import { Members } from '@/pages/Members';
import { Dues } from '@/pages/Dues';
import { Announcements } from '@/pages/Announcements';
import { Requests } from '@/pages/Requests';
import { Projects } from '@/pages/Projects';
import { Budgets } from '@/pages/Budgets';
import { Approvals } from '@/pages/Approvals';
import { Documents } from '@/pages/Documents';
import { Reports } from '@/pages/Reports';
import { Transparency } from '@/pages/Transparency';
import { Anchors } from '@/pages/Anchors';
import { Settings } from '@/pages/Settings';
import { NewEntryModal } from '@/modals/NewEntryModal';
import type { LedgerEntry, LedgerStatus, Organization, MemberType, DuesRates } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

function orgPath(org: Organization) {
  return `/${org.slug ?? org.id}`;
}

// Saves invite code from /join?invite=CODE to sessionStorage then sends
// unauthenticated users to sign-in. After sign-in, App picks it back up.
function SaveInviteAndRedirectToSignIn() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const code = params.get('invite');
  const email = params.get('email');
  if (code) sessionStorage.setItem('pendingInvite', code);
  if (email) sessionStorage.setItem('pendingInviteEmail', email);
  return <Navigate to="/signin" replace />;
}

export default function App() {
  const { user, loading: authLoading, requestOtp, verifyOtp, signOut } = useAuth();
  const { orgs, addOrg, joinOrg, removeOrg, saveOrgSettings, loading: orgsLoading } = useOrgs(user);
  const navigate = useNavigate();

  // After sign-in + orgs loaded, check if user arrived via an invite link.
  // The invite code was saved to sessionStorage by SaveInviteAndRedirectToSignIn.
  useEffect(() => {
    if (!user || orgsLoading) return;
    const code = sessionStorage.getItem('pendingInvite');
    if (code) {
      sessionStorage.removeItem('pendingInvite');
      navigate(`/join?invite=${code}`, { replace: true });
    }
  }, [user?.uid, orgsLoading]);

  if (authLoading || (user && orgsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500 font-editorial italic">
        {orgsLoading ? 'Loading workspace…' : 'Loading…'}
      </div>
    );
  }

  // ── Not signed in ───────────────────────────────────────────────────────────
  if (!user) {
    return (
      <Routes>
        <Route path="/signin" element={
          <SignIn
            onBack={() => navigate('/')}
            onRequestOtp={requestOtp}
            onVerifyOtp={verifyOtp}
          />
        } />
        {/* Preserve invite code across sign-in */}
        <Route path="/join" element={<SaveInviteAndRedirectToSignIn />} />
        <Route path="*" element={
          <Landing onStart={() => navigate('/signin')} onDemo={() => navigate('/signin')} />
        } />
      </Routes>
    );
  }

  // ── Signed in, no orgs yet ──────────────────────────────────────────────────
  if (orgs.length === 0) {
    return (
      <Routes>
        <Route path="/join" element={
          <OrgSetup
            onCreate={async (data) => { const org = await addOrg(data); navigate(orgPath(org)); }}
            onJoin={async (code) => { const org = await joinOrg(code); navigate(orgPath(org)); }}
            user={user}
          />
        } />
        <Route path="*" element={
          <OrgSetup
            onCreate={async (data) => { const org = await addOrg(data); navigate(orgPath(org)); }}
            onJoin={async (code) => { const org = await joinOrg(code); navigate(orgPath(org)); }}
            user={user}
          />
        } />
      </Routes>
    );
  }

  // ── Signed in, has orgs ─────────────────────────────────────────────────────
  return (
    <Routes>
      <Route path="/setup" element={
        <OrgSetup
          onCreate={async (data) => { const org = await addOrg(data); navigate(orgPath(org)); }}
          onJoin={async (code) => { const org = await joinOrg(code); navigate(orgPath(org)); }}
          onCancel={() => navigate(orgPath(orgs[0]))}
          user={user}
        />
      } />
      {/* Dedicated join route — works for both new and existing users */}
      <Route path="/join" element={
        <OrgSetup
          onCreate={async (data) => { const org = await addOrg(data); navigate(orgPath(org)); }}
          onJoin={async (code) => { const org = await joinOrg(code); navigate(orgPath(org)); }}
          onCancel={() => navigate(orgPath(orgs[0]))}
          user={user}
        />
      } />
      <Route path="/:slug/*" element={
        <OrgShell orgs={orgs} user={user} signOut={signOut} removeOrg={removeOrg} saveOrgSettings={saveOrgSettings} />
      } />
      <Route path="*" element={<Navigate to={orgPath(orgs[0])} replace />} />
    </Routes>
  );
}

// ── OrgShell ──────────────────────────────────────────────────────────────────

interface OrgShellProps {
  orgs: Organization[];
  user: AuthUser;
  signOut: () => Promise<void>;
  removeOrg: (orgId: string) => Promise<void>;
  saveOrgSettings: (orgId: string, s: { allowedMemberTypes?: MemberType[]; duesRates?: DuesRates }) => Promise<void>;
}

function OrgShell({ orgs, user, signOut, removeOrg, saveOrgSettings }: OrgShellProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const pageMatch = useMatch('/:slug/:page');
  const pageId = (pageMatch?.params.page ?? 'dashboard') as PageId;

  const org = orgs.find((o) => (o.slug ?? o.id) === slug) ?? null;

  const { entries: ledger, createEntry, setStatus, anchor } = useLedger(org?.id ?? null);
  const [showNewEntry, setShowNewEntry] = useState(false);

  if (!org) {
    return <Navigate to={orgPath(orgs[0])} replace />;
  }

  const handleSwitchOrg = (id: string) => {
    const target = orgs.find((o) => o.id === id);
    if (target) navigate(orgPath(target));
  };

  const handleSaveEntry = async (entry: LedgerEntry) => {
    await createEntry(entry);
    setShowNewEntry(false);
  };

  return (
    <>
      <AppShell
        org={org}
        orgs={orgs}
        onSwitchOrg={handleSwitchOrg}
        page={pageId}
        onNewEntry={() => setShowNewEntry(true)}
        onExit={signOut}
        onNewOrg={() => navigate('/setup')}
        user={user}
      >
        <PageContent
          page={pageId}
          org={org}
          ledger={ledger}
          user={user}
          onApprove={setStatus}
          onAnchor={anchor}
          onDeleteOrg={async () => {
            await removeOrg(org.id);
            const next = orgs.find((o) => o.id !== org.id);
            navigate(next ? orgPath(next) : '/setup');
          }}
          onSaveOrgSettings={(s) => saveOrgSettings(org.id, s)}
        />
      </AppShell>

      {showNewEntry && (
        <NewEntryModal
          org={org}
          user={user}
          onClose={() => setShowNewEntry(false)}
          onSave={handleSaveEntry}
        />
      )}
    </>
  );
}

// ── Page content router ───────────────────────────────────────────────────────

interface PageContentProps {
  page: PageId;
  org: Organization;
  ledger: LedgerEntry[];
  user: AuthUser;
  onApprove: (entryId: string, status: LedgerStatus) => Promise<void>;
  onAnchor: (entryId: string) => Promise<void>;
  onDeleteOrg: () => Promise<void>;
  onSaveOrgSettings: (s: { allowedMemberTypes?: MemberType[]; duesRates?: DuesRates }) => Promise<void>;
}

function PageContent({ page, ledger, org, user, onApprove, onAnchor, onDeleteOrg, onSaveOrgSettings }: PageContentProps) {
  switch (page) {
    case 'dashboard':     return <Dashboard org={org} ledger={ledger} />;
    case 'ledger':        return <Ledger ledger={ledger} />;
    case 'members':       return <Members org={org} user={user} />;
    case 'dues':          return <Dues org={org} ledger={ledger} user={user} />;
    case 'announcements': return <Announcements org={org} user={user} />;
    case 'requests':      return <Requests org={org} user={user} />;
    case 'projects':      return <Projects org={org} />;
    case 'budgets':       return <Budgets org={org} />;
    case 'income':        return <Ledger ledger={ledger.filter((l) => l.type === 'income')} />;
    case 'expenses':      return <Ledger ledger={ledger.filter((l) => l.type === 'expense')} />;
    case 'approvals':     return <Approvals ledger={ledger} onDecide={onApprove} />;
    case 'documents':     return <Documents org={org} />;
    case 'reports':       return <Reports org={org} ledger={ledger} />;
    case 'transparency':  return <Transparency org={org} ledger={ledger} />;
    case 'anchors':       return <Anchors ledger={ledger} onAnchor={onAnchor} />;
    case 'settings':      return <Settings org={org} user={user} onDelete={onDeleteOrg} onSaveSettings={onSaveOrgSettings} />;
    default:              return <Dashboard org={org} ledger={ledger} />;
  }
}
