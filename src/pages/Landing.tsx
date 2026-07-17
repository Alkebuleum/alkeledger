import { useEffect, useRef, useState } from 'react';

interface Props {
  onStart: () => void;
  onDemo: () => void;
}

function EntryTag({ n, label, dark = false }: { n: string; label: string; dark?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 mb-[18px] font-plex text-[11px] tracking-[0.14em] uppercase ${
        dark ? 'text-[#7C828D]' : 'text-[#8A8F99]'
      }`}
    >
      <b className="text-[#8A1E2D] font-medium not-italic whitespace-nowrap">Entry {n}</b>
      <span className="whitespace-nowrap">{label}</span>
      <span className={`flex-1 h-px ${dark ? 'bg-[rgba(239,233,220,0.14)]' : 'bg-[#DCD6C6]'}`} />
    </div>
  );
}

type LedgerVariant = 'score' | 'plain' | 'flag' | 'seal';

const READINESS_ENTRIES: { variant: LedgerVariant; what: string; sub: string; when: string }[] = [
  { variant: 'score', what: '92% ready', sub: 'Q2 reporting readiness score', when: 'as of today' },
  { variant: 'plain', what: 'Annual compliance filing due', sub: 'obligation · finance', when: '12 days' },
  { variant: 'flag', what: 'Board resolution — March, missing', sub: '', when: 'needs record' },
  { variant: 'seal', what: 'Q2 board report', sub: '', when: 'generate →' },
];

const CAPABILITIES = [
  { name: 'Record', desc: 'Capture critical records in one place — financial records, board decisions, contracts, projects, compliance files, policies, memberships and supporting documents.', idx: 'CAPABILITY / 01' },
  { name: 'Organize', desc: 'Structure records around your real operations. Attach every record to the right project, department, fund, member, vendor, obligation or reporting period.', idx: 'CAPABILITY / 02' },
  { name: 'Monitor', desc: "Stay ahead of deadlines and obligations. Know what's missing, what's due, what's expiring, and what requires review or approval.", idx: 'CAPABILITY / 03' },
  { name: 'Report', desc: 'Generate reports without last-minute scrambling. Prepare tax, audit, board, grant, compliance and institutional reports from records already captured during the year.', idx: 'CAPABILITY / 04' },
  { name: 'Verify', desc: 'Maintain evidence and accountability. Track approvals, supporting documents, record history and proof behind important institutional actions.', idx: 'CAPABILITY / 05' },
  { name: 'Gain Insight', desc: 'Turn records into intelligence. Ask Scribb what needs attention, what risks exist, what reports are due, and whether your organization is ready.', idx: 'CAPABILITY / 06' },
];

const FLOW = ['Record', 'Relate', 'Review', 'Report', 'Readiness'];

const STEPS = [
  { num: '01 / RECORD', h: 'Record', p: 'Capture transactions, documents, decisions, activities and evidence as they happen, while the context is still fresh.' },
  { num: '02 / RELATE', h: 'Relate', p: "Connect each record to its project, obligation, fund, member or reporting requirement — nothing floats on its own." },
  { num: '03 / REVIEW', h: 'Review', p: 'Scribb identifies missing information, approaching deadlines, risks and incomplete records before they become problems.' },
  { num: '04 / REPORT', h: 'Report', p: "Generate the outputs your institution needs for management, boards, donors, audits, taxes and regulators." },
];

const ORG_CARDS = [
  { h: 'Nonprofits', p: 'Track grants, programs, board actions, expenses, reports and audit evidence.' },
  { h: 'Membership Organizations', p: 'Manage dues, resolutions, committees, compliance and annual filings, and member accountability.' },
  { h: 'Cooperatives', p: 'Record pooled contributions, proposals, voting, benefits and project implementation.' },
  { h: 'Businesses', p: 'Track approvals, contracts, compliance documents, reporting obligations and critical operational records.' },
  { h: 'Councils and Networks', p: 'Capture institutional decisions, representative voting, initiatives and permanent records.' },
];

const WITHOUT = [
  'Records scattered across tools',
  'Reports created manually',
  'Missing documentation',
  'Difficult audit preparation',
  'Little visibility into obligations',
  'Institutional memory lost during transitions',
];

const WITH = [
  'One home for critical records',
  'Report-ready data all year',
  'Built-in accountability',
  'Better compliance visibility',
  'Faster audits and reviews',
  'Stronger institutional continuity',
];

const QUESTIONS = [
  'What reports are due this month?',
  'Which transactions are missing evidence?',
  'Are we ready for our tax filing?',
  'Which grants require reporting soon?',
  'What board decisions remain unimplemented?',
  'Which records are expired or incomplete?',
];

const REPORT_TAGS = [
  'Board reports',
  'Annual reports',
  'Grant reports',
  'Compliance summaries',
  'Audit-ready packages',
  'Tax preparation workbooks',
  'Membership & contribution summaries',
];

const TRUST_ITEMS = [
  { h: 'Role-based access', p: 'Give people exactly the access their role requires — no more, no less.' },
  { h: 'Record history & traceability', p: 'Every entry keeps its history. Corrections are new entries, not silent edits.' },
  { h: 'Secure document storage', p: 'Files and supporting evidence live alongside the records they support.' },
  { h: 'Structured approvals', p: 'Route decisions and sign-offs through the people who need to weigh in.' },
  { h: 'Audit-friendly organization', p: 'Records are structured so an auditor can find what they need, fast.' },
  { h: 'Controlled access to sensitive information', p: 'Sensitive records stay visible only to the people who should see them.' },
];

export function Landing({ onStart, onDemo }: Props) {
  const [visibleEntries, setVisibleEntries] = useState(0);
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setVisibleEntries(READINESS_ENTRIES.length);
      return;
    }
    const timers = READINESS_ENTRIES.map((_, i) =>
      setTimeout(() => setVisibleEntries((v) => Math.max(v, i + 1)), 500 + i * 650)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window) || !revealRef.current) return;
    const targets = revealRef.current.querySelectorAll<HTMLElement>('.js-reveal');
    targets.forEach((t) => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(10px)';
      t.style.transition = 'opacity .5s ease, transform .5s ease';
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.style.opacity = '1';
            el.style.transform = 'none';
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={revealRef} className="min-h-screen bg-[#F6F4ED] text-[#171B21] font-sans text-base leading-relaxed scroll-smooth">

      {/* ============ NAV ============ */}
      <nav className="sticky top-0 z-50 bg-[#F6F4ED]/[0.88] backdrop-blur-md border-b border-[#DCD6C6]">
        <div className="max-w-[1160px] mx-auto px-6 h-16 flex items-center gap-8">
          <a href="#" aria-label="Scribb home" className="flex items-center gap-[11px] font-serif text-[21px] font-semibold tracking-[0.01em]">
            <svg width="26" height="26" viewBox="0 0 96 96" aria-hidden="true">
              <rect x="20" y="11.75" width="56" height="9" rx="2" fill="#171B21"/>
              <rect x="20" y="27.25" width="26" height="9" rx="2" fill="#171B21"/>
              <rect x="20" y="42.75" width="56" height="9" rx="2" fill="#171B21"/>
              <rect x="50" y="58.25" width="26" height="9" rx="2" fill="#171B21"/>
              <rect x="20" y="73.75" width="56" height="9" rx="2" fill="#171B21"/>
              <rect x="80" y="73.75" width="5" height="9" rx="2" fill="#8A1E2D"/>
            </svg>
            Scribb
          </a>
          <div className="hidden md:flex gap-[26px] text-[13.5px] font-medium text-[#4B5058] ml-2">
            <a href="#what" className="hover:text-[#171B21] transition-colors">What it does</a>
            <a href="#how" className="hover:text-[#171B21] transition-colors">How it works</a>
            <a href="#orgs" className="hover:text-[#171B21] transition-colors">For your organization</a>
            <a href="#reporting" className="hover:text-[#171B21] transition-colors">Reporting</a>
          </div>
          <div className="ml-auto flex items-center gap-[18px]">
            <button onClick={onDemo} className="text-[13.5px] font-medium text-[#4B5058] hover:text-[#171B21] transition-colors">
              Sign in
            </button>
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 bg-[#171B21] text-[#EFE9DC] text-sm font-medium px-5 py-[11px] rounded border border-[#171B21] hover:bg-[#232935] transition-colors"
            >
              Open Scribb
            </button>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <header className="border-b border-[#DCD6C6] py-[88px]">
        <div className="max-w-[1160px] mx-auto px-6 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div>
            <EntryTag n="001" label="The record begins" />
            <h1 className="font-serif font-medium text-[clamp(35px,4.7vw,56px)] leading-[1.1] tracking-[-0.015em]">
              Critical records.<br />Intelligent <em className="italic text-[#8A1E2D] font-medium">reporting</em>.<br />Continuous readiness.
            </h1>
            <p className="text-[17.5px] text-[#43484F] max-w-[54ch] mt-6 mb-[30px]">
              Scribb helps organizations record critical activities, manage obligations, generate reports, and stay ready for compliance, audits, taxes, and accountability.
            </p>
            <div className="flex flex-wrap items-center gap-[14px]">
              <button
                onClick={onStart}
                className="inline-flex items-center gap-2 bg-[#8A1E2D] text-[#EFE9DC] text-sm font-medium px-5 py-[11px] rounded border border-[#8A1E2D] hover:bg-[#761826] transition-colors"
              >
                Start your record
              </button>
              <a href="#how" className="text-[14.5px] font-medium border-b border-[#DCD6C6] pb-0.5 hover:border-[#171B21] transition-colors">
                See how it works ↓
              </a>
            </div>
            <div className="mt-[22px] text-[13px] text-[#8A8F99] max-w-[48ch]">
              Built for nonprofits, membership organizations, cooperatives, businesses, and institutional networks.
            </div>
            <div className="font-plex text-[11.5px] text-[#8A8F99] tracking-[0.04em] mt-4">
              scribb.net · app.scribb.net
            </div>
          </div>

          <div className="bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg shadow-[0_24px_60px_-30px_rgba(23,27,33,0.25)] overflow-hidden" aria-label="Example readiness dashboard">
            <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-[#DCD6C6] font-plex text-[11px] tracking-[0.08em] text-[#8A8F99]">
              <b className="text-[#171B21] font-medium">acme-holdings / readiness</b>
              <span>updated 09:41</span>
            </div>
            {READINESS_ENTRIES.map((entry, i) => (
              <div
                key={entry.what}
                className={`grid grid-cols-[20px_1fr_auto] gap-[14px] items-start px-[18px] py-[15px] border-b border-[#EAE6D9] last:border-none transition-all duration-500 ${
                  entry.variant === 'score' ? 'bg-[rgba(62,98,87,0.05)]' : ''
                } ${i < visibleEntries ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5'}`}
              >
                <div
                  className={`w-5 h-[5px] rounded-sm mt-2 ${
                    entry.variant === 'score'
                      ? 'bg-[#3E6257]'
                      : entry.variant === 'seal'
                      ? 'bg-[#8A1E2D]'
                      : entry.variant === 'flag'
                      ? 'bg-[#B3453C]'
                      : 'bg-[#171B21]'
                  }`}
                />
                <div>
                  <div
                    className={
                      entry.variant === 'score'
                        ? 'font-serif text-2xl font-semibold'
                        : 'text-sm font-medium leading-[1.4]'
                    }
                  >
                    {entry.what}
                  </div>
                  {entry.variant === 'flag' && (
                    <span className="inline-flex items-center gap-1.5 font-plex text-[10.5px] tracking-[0.1em] px-[9px] py-1 rounded-[3px] mt-1.5 bg-[rgba(138,30,45,0.1)] text-[#8A1E2D] border border-[rgba(138,30,45,0.3)]">⚑ FLAGGED</span>
                  )}
                  {entry.variant === 'seal' && (
                    <div className="flex gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-1.5 font-plex text-[10.5px] tracking-[0.1em] px-[9px] py-1 rounded-[3px] bg-[#8A1E2D] text-[#EFE9DC]">■ READY</span>
                      <span className="inline-flex items-center gap-1.5 font-plex text-[10.5px] tracking-[0.1em] px-[9px] py-1 rounded-[3px] bg-[rgba(62,98,87,0.12)] text-[#3E6257] border border-[rgba(62,98,87,0.35)]">✓ RECORDS COMPLETE</span>
                    </div>
                  )}
                  {entry.sub && entry.variant !== 'flag' && (
                    <div className="font-plex text-[11px] text-[#8A8F99] mt-[3px] tracking-[0.02em]">{entry.sub}</div>
                  )}
                </div>
                <div className="font-plex text-[11px] text-[#8A8F99] mt-1.5 whitespace-nowrap">{entry.when}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ============ WHAT SCRIBB DOES ============ */}
      <section className="py-24" id="what">
        <div className="max-w-[1160px] mx-auto px-6">
          <EntryTag n="002" label="What you can do" />
          <h2 className="font-serif font-medium text-[clamp(30px,4vw,44px)] leading-[1.12] tracking-[-0.01em] max-w-[24ch]">
            What can Scribb do for your organization?
          </h2>
          <p className="text-[16.5px] text-[#43484F] max-w-[58ch] mt-4">
            From recordkeeping to reporting, Scribb turns critical institutional activity into usable intelligence.
          </p>

          <div className="mt-14 border-t border-[#DCD6C6]">
            {CAPABILITIES.map((row) => (
              <div
                key={row.name}
                className="js-reveal group grid md:grid-cols-[200px_1fr_auto] gap-2 md:gap-7 items-center md:items-center py-[26px] px-1.5 border-b border-[#DCD6C6] hover:bg-[#EFECE2] transition-colors"
              >
                <div className="font-serif text-[23px] font-semibold flex items-center gap-3.5 order-1">
                  <span className="w-[26px] h-[6px] rounded-sm bg-[#171B21] group-hover:bg-[#8A1E2D] transition-colors flex-shrink-0" />
                  {row.name}
                </div>
                <div className="text-[14.5px] text-[#43484F] max-w-[58ch] order-3 md:order-2">{row.desc}</div>
                <div className="font-plex text-[11px] text-[#8A8F99] tracking-[0.1em] order-2 md:order-3">{row.idx}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ AGENT OF RECORDS ============ */}
      <section className="py-24 text-center">
        <div className="max-w-[1160px] mx-auto px-6">
          <EntryTag n="003" label="What Scribb is" />
          <h2 className="font-serif font-medium text-[clamp(30px,4vw,44px)] leading-[1.12] tracking-[-0.01em] max-w-[20ch] mx-auto">
            Scribb is the Agent of Records.
          </h2>
          <p className="text-[16.5px] text-[#43484F] max-w-[58ch] mt-5 mx-auto">
            Most organizations already have the information they need — but it's spread across spreadsheets, emails, folders, finance tools and staff memory. Scribb brings critical records into one intelligent system that helps your organization understand what happened, what is required, and what must be reported.
          </p>
          <div className="flex justify-center items-center gap-3.5 flex-wrap mt-11 font-plex text-[12.5px] tracking-[0.08em] text-[#8A8F99] uppercase">
            {FLOW.map((node, i) => (
              <span key={node} className="flex items-center gap-3.5">
                <span className="text-[#171B21] font-medium">{node}</span>
                {i < FLOW.length - 1 && <span className="text-[#8A1E2D]">→</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-24 bg-[#EFECE2] border-t border-b border-[#DCD6C6]" id="how">
        <div className="max-w-[1160px] mx-auto px-6">
          <EntryTag n="004" label="How it works" />
          <h2 className="font-serif font-medium text-[clamp(30px,4vw,44px)] leading-[1.12] tracking-[-0.01em] max-w-[22ch]">
            How Scribb works.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-[52px]">
            {STEPS.map((step) => (
              <div key={step.h} className="js-reveal bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-[30px] px-[26px]">
                <div className="font-plex text-xs text-[#8A1E2D] tracking-[0.14em] font-medium">{step.num}</div>
                <h3 className="font-serif text-2xl font-semibold mt-3 mb-2.5">{step.h}</h3>
                <p className="text-[14.5px] text-[#43484F]">{step.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BUILT FOR ORGANIZATIONS ============ */}
      <section className="py-24" id="orgs">
        <div className="max-w-[1160px] mx-auto px-6">
          <EntryTag n="005" label="Who it's for" />
          <h2 className="font-serif font-medium text-[clamp(30px,4vw,44px)] leading-[1.12] tracking-[-0.01em] max-w-[22ch]">
            Built for institutions of many kinds.
          </h2>
          <p className="text-[16.5px] text-[#43484F] max-w-[58ch] mt-4">
            Different organizations, the same need: a reliable record of what happened and what's required next.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-[52px]">
            {ORG_CARDS.map((card) => (
              <div key={card.h} className="js-reveal bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-[26px] px-6">
                <div className="w-[26px] h-[6px] rounded-sm bg-[#8A1E2D] mb-4" />
                <h3 className="font-serif text-[19px] font-semibold mb-2">{card.h}</h3>
                <p className="text-sm text-[#43484F]">{card.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHY NOT SPREADSHEETS ============ */}
      <section className="py-24 bg-[#171B21] text-[#EFE9DC]">
        <div className="max-w-[1160px] mx-auto px-6">
          <EntryTag n="006" label="Why Scribb" dark />
          <h2 className="font-serif font-medium text-[clamp(30px,4vw,44px)] leading-[1.12] tracking-[-0.01em] max-w-[22ch] text-[#EFE9DC]">
            Why not just use spreadsheets, folders and accounting tools?
          </h2>
          <p className="text-[16.5px] text-[#B9BDC6] max-w-[58ch] mt-4">
            Because scattered tools weren't built to answer the question an auditor, board or regulator actually asks: show me.
          </p>

          <div className="grid md:grid-cols-2 gap-9 md:gap-14 mt-14">
            <div>
              <div className="font-plex text-[11px] tracking-[0.1em] uppercase text-[#7C828D]">Without Scribb</div>
              <h3 className="font-serif text-[19px] font-semibold mb-1.5 mt-1.5">Scattered and reactive</h3>
              <ul className="mt-5 border-t border-[rgba(239,233,220,0.14)]">
                {WITHOUT.map((item) => (
                  <li key={item} className="flex gap-3 items-baseline py-[13px] border-b border-[rgba(239,233,220,0.14)] text-[14.5px] text-[#B9BDC6]">
                    <span className="w-4 flex-shrink-0 font-semibold font-plex text-[#5F6570]">–</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-plex text-[11px] tracking-[0.1em] uppercase text-[#7C828D]">With Scribb</div>
              <h3 className="font-serif text-[19px] font-semibold mb-1.5 mt-1.5">Structured and report-ready</h3>
              <ul className="mt-5 border-t border-[rgba(239,233,220,0.14)]">
                {WITH.map((item) => (
                  <li key={item} className="flex gap-3 items-baseline py-[13px] border-b border-[rgba(239,233,220,0.14)] text-[14.5px] text-[#D8DBE1]">
                    <span className="w-4 flex-shrink-0 font-semibold font-plex text-[#7FA99A]">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============ RECORD INTELLIGENCE ============ */}
      <section className="py-24">
        <div className="max-w-[1160px] mx-auto px-6">
          <EntryTag n="007" label="Record intelligence" />
          <h2 className="font-serif font-medium text-[clamp(30px,4vw,44px)] leading-[1.12] tracking-[-0.01em] max-w-[24ch]">
            More than recordkeeping — record intelligence.
          </h2>
          <p className="text-[16.5px] text-[#43484F] max-w-[58ch] mt-4">
            Ask Scribb directly, and get an answer grounded in your own records.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-[52px]">
            {QUESTIONS.map((q) => (
              <div key={q} className="js-reveal bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-[17px] px-5 font-plex text-[13px] text-[#232935] flex gap-3 items-baseline leading-relaxed">
                <span className="text-[#8A1E2D] flex-shrink-0">›</span>
                {q}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ REPORTING ============ */}
      <section className="py-24 bg-[#EFECE2] border-t border-b border-[#DCD6C6]" id="reporting">
        <div className="max-w-[1160px] mx-auto px-6">
          <EntryTag n="008" label="Reporting" />
          <h2 className="font-serif font-medium text-[clamp(30px,4vw,44px)] leading-[1.12] tracking-[-0.01em] max-w-[22ch]">
            Stay ready for reporting all year.
          </h2>
          <p className="text-[16.5px] text-[#43484F] max-w-[58ch] mt-4">
            Scribb helps your organization prepare the records, supporting evidence, summaries and outputs needed for board reports, donor reports, compliance filings, audits and annual tax preparation.
          </p>

          <div className="flex flex-wrap gap-2.5 mt-[30px]">
            {REPORT_TAGS.map((tag) => (
              <span key={tag} className="font-plex text-xs px-4 py-[9px] border border-[#DCD6C6] rounded-full text-[#43484F] bg-[#FDFCF8]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TRUST ============ */}
      <section className="py-24">
        <div className="max-w-[1160px] mx-auto px-6">
          <EntryTag n="009" label="Trust" />
          <h2 className="font-serif font-medium text-[clamp(30px,4vw,44px)] leading-[1.12] tracking-[-0.01em] max-w-[24ch]">
            Built for trusted institutional recordkeeping.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-8 mt-[52px] border-t border-[#DCD6C6] pt-10">
            {TRUST_ITEMS.map((item) => (
              <div key={item.h} className="js-reveal">
                <h4 className="font-serif text-[17px] font-semibold mb-1.5">{item.h}</h4>
                <p className="text-[13.5px] text-[#43484F]">{item.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="border-t border-[#DCD6C6]">
        <div className="max-w-[1160px] mx-auto px-6 py-[110px] text-center">
          <h2 className="font-serif font-medium text-[clamp(34px,5vw,54px)] leading-[1.12] tracking-[-0.01em]">
            See what Scribb can do for your organization.
          </h2>
          <p className="text-[#43484F] max-w-[52ch] mx-auto mt-[18px] mb-[34px]">
            Whether you manage grants, dues, projects, decisions, compliance obligations or critical operational records, Scribb helps your organization stay structured, accountable and report-ready.
          </p>
          <div className="flex gap-3.5 justify-center flex-wrap items-center">
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 bg-[#8A1E2D] text-[#EFE9DC] text-[15px] font-medium px-7 py-3.5 rounded border border-[#8A1E2D] hover:bg-[#761826] transition-colors"
            >
              Open Scribb →
            </button>
            <button
              onClick={onDemo}
              className="inline-flex items-center gap-2 bg-transparent text-[#171B21] text-[15px] font-medium px-7 py-3.5 rounded border border-[#DCD6C6] hover:bg-[#EFECE2] transition-colors"
            >
              Talk to Us
            </button>
          </div>
          <div className="font-plex text-[11.5px] text-[#8A8F99] tracking-[0.04em] mt-[26px]">
            scribb.net · <button onClick={onStart} className="text-[14.5px] font-medium border-b border-[#DCD6C6] pb-0.5 hover:border-[#171B21] transition-colors align-baseline">get early access →</button>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-[#171B21] text-[#A9AEB8] text-[13.5px]">
        <div className="max-w-[1160px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-9 py-16">
            <div>
              <a href="#" className="flex items-center gap-[11px] font-serif text-[19px] font-semibold text-[#EFE9DC]">
                <svg width="24" height="24" viewBox="0 0 96 96" aria-hidden="true">
                  <rect x="20" y="11.75" width="56" height="9" rx="2" fill="#EFE9DC"/>
                  <rect x="20" y="27.25" width="26" height="9" rx="2" fill="#EFE9DC"/>
                  <rect x="20" y="42.75" width="56" height="9" rx="2" fill="#EFE9DC"/>
                  <rect x="50" y="58.25" width="26" height="9" rx="2" fill="#EFE9DC"/>
                  <rect x="20" y="73.75" width="56" height="9" rx="2" fill="#EFE9DC"/>
                  <rect x="80" y="73.75" width="5" height="9" rx="2" fill="#B3453C"/>
                </svg>
                Scribb
              </a>
              <p className="mt-3.5 text-[13px] max-w-[30ch]">Critical records. Intelligent reporting. Continuous readiness.</p>
            </div>
            <div>
              <h5 className="font-plex text-[10.5px] tracking-[0.18em] uppercase text-[#5F6570] mb-3.5">Product</h5>
              <ul className="space-y-2.5">
                <li><a href="#what" className="hover:text-[#EFE9DC] transition-colors">What it does</a></li>
                <li><a href="#how" className="hover:text-[#EFE9DC] transition-colors">How it works</a></li>
                <li><a href="#orgs" className="hover:text-[#EFE9DC] transition-colors">For your organization</a></li>
                <li><button onClick={onStart} className="hover:text-[#EFE9DC] transition-colors text-left">Open the app</button></li>
              </ul>
            </div>
            <div>
              <h5 className="font-plex text-[10.5px] tracking-[0.18em] uppercase text-[#5F6570] mb-3.5">Company</h5>
              <ul className="space-y-2.5">
                <li><a href="#" className="hover:text-[#EFE9DC] transition-colors">About</a></li>
                <li><a href="#" className="hover:text-[#EFE9DC] transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-[#EFE9DC] transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-plex text-[10.5px] tracking-[0.18em] uppercase text-[#5F6570] mb-3.5">Legal</h5>
              <ul className="space-y-2.5">
                <li><a href="#" className="hover:text-[#EFE9DC] transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-[#EFE9DC] transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[rgba(239,233,220,0.1)] py-5 flex justify-between gap-4 flex-wrap font-plex text-[11px] text-[#5F6570] tracking-[0.04em]">
            <span>© 2026 Scribb · scribb.net</span>
            <span>reporting readiness: on track</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
