import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useMatch, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrgs } from '@/hooks/useOrg';
import { useLedger } from '@/hooks/useLedger';
import { AppShell } from '@/layout/AppShell';
import type { PageId } from '@/layout/Sidebar';
import { Landing } from '@/pages/Landing';
import { SignIn } from '@/pages/SignIn';
import { JoinPreview } from '@/pages/JoinPreview';
import { OrgSetup } from '@/pages/OrgSetup';
import { Dashboard } from '@/pages/Dashboard';
import { Ledger } from '@/pages/Ledger';
import { Members } from '@/pages/Members';
import { Dues } from '@/pages/Dues';
import { Announcements } from '@/pages/Announcements';
import { Events } from '@/pages/Events';
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

// Backward-compat redirect for old-style /join?invite=CODE links.
function RedirectOldInvite() {
  const location = useLocation();
  const code = new URLSearchParams(location.search).get('invite');
  if (code) return <Navigate to={`/join/${code}`} replace />;
  return <Navigate to="/" replace />;
}

export default function App() {
  const { user, loading: authLoading, requestOtp, verifyOtp, signInWithToken, signOut } = useAuth();
  const { orgs, pendingOrgs, addOrg, joinOrg, removeOrg, saveOrgSettings, loading: orgsLoading, refreshOrgs } = useOrgs(user);
  const navigate = useNavigate();


  if (authLoading || (user && orgsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500 font-editorial italic">
        {orgsLoading ? 'Loading workspace…' : 'Loading…'}
      </div>
    );
  }

  const joinPreviewRoute = (
    <Route path="/join/:code" element={
      <JoinPreview
        user={user}
        orgs={orgs}
        onRequestOtp={requestOtp}
        onVerifyOtp={verifyOtp}
        onSignInWithToken={signInWithToken}
        onJoinWithCode={joinOrg}
      />
    } />
  );

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
        {joinPreviewRoute}
        {/* Backward-compat: old /join?invite=CODE links */}
        <Route path="/join" element={<RedirectOldInvite />} />
        <Route path="*" element={
          <Landing onStart={() => navigate('/signin')} onDemo={() => navigate('/signin')} />
        } />
      </Routes>
    );
  }

  // ── Signed in, pending approval only (no active orgs) ─────────────────────
  if (orgs.length === 0 && pendingOrgs.length > 0) {
    return (
      <Routes>
        {joinPreviewRoute}
        <Route path="*" element={
          <PendingApprovalScreen
            pendingOrgs={pendingOrgs}
            onSignOut={signOut}
            onRefresh={refreshOrgs}
          />
        } />
      </Routes>
    );
  }

  // ── Signed in, no orgs yet ──────────────────────────────────────────────────
  if (orgs.length === 0) {
    return (
      <Routes>
        {joinPreviewRoute}
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
      {joinPreviewRoute}
      {/* Old /join route — now just redirects to OrgSetup (manual code entry) */}
      <Route path="/join" element={
        <OrgSetup
          onCreate={async (data) => { const org = await addOrg(data); navigate(orgPath(org)); }}
          onJoin={async (code) => { const org = await joinOrg(code); navigate(orgPath(org)); }}
          onCancel={() => navigate(orgPath(orgs[0]))}
          user={user}
        />
      } />
      <Route path="/:slug/*" element={
        <OrgShell orgs={orgs} pendingOrgs={pendingOrgs} user={user} signOut={signOut} removeOrg={removeOrg} saveOrgSettings={saveOrgSettings} />
      } />
      <Route path="*" element={<Navigate to={orgPath(orgs[0])} replace />} />
    </Routes>
  );
}

// ── PendingApprovalScreen ─────────────────────────────────────────────────────

function PendingApprovalScreen({
  pendingOrgs,
  onSignOut,
  onRefresh,
}: {
  pendingOrgs: Organization[];
  onSignOut: () => Promise<void>;
  onRefresh: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    onRefresh();
    // Give the fetch a moment then clear the spinner.
    setTimeout(() => setRefreshing(false), 1500);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-[var(--bone)]">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-stone-200 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
          </div>

          <h2 className="font-display text-2xl mb-2">Pending approval</h2>
          <p className="text-stone-500 text-sm mb-1">
            Your request{pendingOrgs.length > 1 ? 's are' : ' is'} waiting for admin review:
          </p>

          <ul className="my-4 space-y-1">
            {pendingOrgs.map((org) => (
              <li key={org.id} className="text-sm font-medium text-stone-800 bg-stone-50 border border-stone-200 px-3 py-2">
                {org.name}
              </li>
            ))}
          </ul>

          <p className="text-stone-400 text-xs mb-6">
            You'll receive an email when you're approved. Check back here anytime.
          </p>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full py-2.5 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-50 mb-3"
          >
            {refreshing ? 'Checking…' : 'Check approval status'}
          </button>
          <button
            onClick={onSignOut}
            className="w-full text-sm text-stone-400 hover:text-stone-700 py-1"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// ── OrgShell ──────────────────────────────────────────────────────────────────

interface OrgShellProps {
  orgs: Organization[];
  pendingOrgs: Organization[];
  user: AuthUser;
  signOut: () => Promise<void>;
  removeOrg: (orgId: string) => Promise<void>;
  saveOrgSettings: (orgId: string, s: { allowedMemberTypes?: MemberType[]; duesRates?: DuesRates }) => Promise<void>;
}

function OrgShell({ orgs, pendingOrgs, user, signOut, removeOrg, saveOrgSettings }: OrgShellProps) {
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
        pendingOrgs={pendingOrgs}
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
          onCreateEntry={createEntry}
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
  onCreateEntry: (entry: LedgerEntry) => Promise<void>;
}

function PageContent({ page, ledger, org, user, onApprove, onAnchor, onDeleteOrg, onSaveOrgSettings, onCreateEntry }: PageContentProps) {
  switch (page) {
    case 'dashboard':     return <Dashboard org={org} ledger={ledger} />;
    case 'ledger':        return <Ledger ledger={ledger} org={org} />;
    case 'members':       return <Members org={org} user={user} />;
    case 'dues':          return <Dues org={org} ledger={ledger} user={user} onRecordPayment={onCreateEntry} onApprove={onApprove} />;
    case 'announcements': return <Announcements org={org} user={user} />;
    case 'events':        return <Events org={org} user={user} />;
    case 'requests':      return <Requests org={org} user={user} onCreateEntry={onCreateEntry} />;
    case 'projects':      return <Projects org={org} />;
    case 'budgets':       return <Budgets org={org} />;
    case 'income':        return <Ledger ledger={ledger.filter((l) => l.type === 'income')} org={org} />;
    case 'expenses':      return <Ledger ledger={ledger.filter((l) => l.type === 'expense')} org={org} />;
    case 'approvals':     return <Approvals ledger={ledger} onDecide={onApprove} />;
    case 'documents':     return <Documents org={org} user={user} />;
    case 'reports':       return <Reports org={org} ledger={ledger} />;
    case 'transparency':  return <Transparency org={org} ledger={ledger} />;
    case 'anchors':       return <Anchors ledger={ledger} onAnchor={onAnchor} />;
    case 'settings':      return <Settings org={org} user={user} onDelete={onDeleteOrg} onSaveSettings={onSaveOrgSettings} />;
    default:              return <Dashboard org={org} ledger={ledger} />;
  }
}
