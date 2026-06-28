import React, { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Check, Users, FolderKanban, BookOpen, BarChart3, FileCheck } from 'lucide-react';

interface Props {
  onStart: () => void;
  onDemo: () => void;
}

const VERIFY_SAMPLES = [
  { id: 'le_001', desc: 'EPA watershed grant disbursement', amount: '$50,000', hash: '0x9f2c…a41b' },
  { id: 'le_004', desc: 'Wellspring Trust donation',        amount: '$8,500',  hash: '0x88c0…12fd' },
  { id: 'le_101', desc: 'Annual dues — E. Vance',           amount: '$350',    hash: '0x2a4f…77bc' },
];

export function Landing({ onStart, onDemo }: Props) {
  const [verifyIdx, setVerifyIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setVerifyIdx((i) => (i + 1) % VERIFY_SAMPLES.length), 4200);
    return () => clearInterval(t);
  }, []);

  const current = VERIFY_SAMPLES[verifyIdx];

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#0E1015]">

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-end gap-2.5">
            <img src="/logo.svg" alt="AlkeLedger" className="h-7 w-auto" />
            <span className="font-display text-2xl leading-none tracking-tight">
              <span className="font-bold text-[#0E1015]">Alke</span><span className="font-light text-[#0E1015]">Ledger</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-stone-500">
            <a href="#features" className="hover:text-[#0E1015] transition-colors">Features</a>
            <a href="#how"      className="hover:text-[#0E1015] transition-colors">How it works</a>
            <a href="#who"      className="hover:text-[#0E1015] transition-colors">Who it's for</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={onDemo} className="text-sm text-stone-500 hover:text-[#0E1015] px-4 py-2 rounded-md transition-colors hidden sm:block">
              Sign in
            </button>
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 bg-[#0E1015] text-[#FAF8F4] text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-stone-800 transition-colors"
            >
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="hero-gradient relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: copy */}
            <div>
              <h1 className="font-display text-5xl md:text-6xl lg:text-[4.25rem] font-semibold leading-[1.04] tracking-[-0.03em] text-[#0E1015]">
                Financial records<br />
                your stakeholders<br />
                <span className="text-[#B23A2A]">can trust.</span>
              </h1>
              <p className="mt-6 text-lg text-stone-500 leading-relaxed max-w-lg">
                AlkeLedger is the modern bookkeeping platform for organizations that need more than a spreadsheet — with every approved record backed by cryptographic proof.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button
                  onClick={onStart}
                  className="inline-flex items-center gap-2 bg-[#0E1015] text-[#FAF8F4] text-sm font-medium px-6 py-3.5 rounded-lg hover:bg-stone-800 transition-colors group"
                >
                  Start for free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={onDemo}
                  className="inline-flex items-center gap-2 text-sm font-medium text-stone-700 px-6 py-3.5 rounded-lg border border-stone-300 hover:border-stone-400 hover:bg-white transition-colors"
                >
                  View demo
                </button>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2">
                {['No credit card required', 'Setup in 90 seconds', 'Free to start'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-stone-400">
                    <Check className="w-4 h-4 text-[#2F5D50]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: product mockup */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl shadow-stone-200/80 border border-stone-200 overflow-hidden">
                {/* Browser chrome */}
                <div className="bg-stone-100 border-b border-stone-200 px-4 py-3 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-stone-300" />
                    <div className="w-3 h-3 rounded-full bg-stone-300" />
                    <div className="w-3 h-3 rounded-full bg-stone-300" />
                  </div>
                  <div className="flex-1 bg-white rounded text-xs text-stone-400 px-3 py-1.5 mx-2 border border-stone-200">
                    app.alkeledger.com
                  </div>
                </div>

                {/* Mock ledger UI */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div className="text-[11px] text-stone-400 font-medium uppercase tracking-wider mb-1">Ledger</div>
                      <div className="font-semibold text-[#0E1015]">Cedar Creek Community Foundation</div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#EEF4F1] text-[#2F5D50] text-xs px-3 py-1.5 rounded-full border border-[#C2D9D1]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { desc: 'EPA watershed grant disbursement', amount: '+$50,000', income: true,  verified: true  },
                      { desc: 'Q2 operational expenses',          amount: '−$12,480', income: false, verified: true  },
                      { desc: 'Annual member dues — batch',       amount: '+$8,750',  income: true,  verified: true  },
                      { desc: 'Consulting services — pending',    amount: '−$3,200',  income: false, verified: false },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors">
                        <div>
                          <div className="text-sm font-medium text-stone-800">{row.desc}</div>
                          <div className={`text-[11px] mt-0.5 font-mono ${row.verified ? 'text-[#2F5D50]' : 'text-amber-600'}`}>
                            {row.verified ? '✓ On-chain proof' : '● Pending approval'}
                          </div>
                        </div>
                        <div className={`text-sm font-semibold font-mono ${row.income ? 'text-[#2F5D50]' : 'text-stone-500'}`}>
                          {row.amount}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-xs text-stone-400">4 records · 3 verified</span>
                    <div className="flex items-center gap-1.5 text-xs text-[#2F5D50] font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Last anchored 2m ago
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating proof badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border border-stone-200 px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-[#EEF4F1] rounded-full flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-[#2F5D50]" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#0E1015]">Cryptographic proof</div>
                  <div className="text-[11px] text-stone-400 font-mono">0x9f2c…a41b</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ──────────────────────────────────────────────────────── */}
      <section className="border-y border-stone-200 py-8 bg-[#F2EFE8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-5">
            Built for organizations that answer to others
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Nonprofits', 'Foundations', 'Membership associations', 'Professional councils', 'Community organizations', 'Grant-funded programs'].map((org) => (
              <span key={org} className="text-sm text-stone-600 bg-white border border-stone-200 px-4 py-1.5 rounded-full">
                {org}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 md:py-32 bg-[#FAF8F4]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="text-sm font-semibold text-[#B23A2A] uppercase tracking-wider mb-4">Features</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-[#0E1015] leading-tight">
              Everything a modern ledger should be
            </h2>
            <p className="mt-4 text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
              From entry to audit trail, every workflow your organization needs — with blockchain proof built in from day one.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { Icon: BookOpen,     title: 'Full ledger management',   desc: 'Income, expenses, dues, grants, and donations. Organize by project, member, or budget. Attach receipts to every entry.' },
              { Icon: ShieldCheck,  title: 'Tamper-evident records',   desc: 'Every approved entry is cryptographically hashed and anchored on-chain. A proof that cannot be quietly rewritten.' },
              { Icon: Users,        title: 'Role-based approvals',     desc: 'Five roles from Owner to Viewer. Approval workflows ensure a second set of eyes before any record is finalized.' },
              { Icon: BarChart3,    title: 'Reports & transparency',   desc: 'Auto-generated financial summaries, budget tracking, and a public transparency page for donors and members.' },
              { Icon: FolderKanban, title: 'Projects & budgets',       desc: 'Create projects with budgets and milestones. Track spending against goals. Link restricted grant funds to programs.' },
              { Icon: FileCheck,    title: 'Member & dues management', desc: 'Member directory, dues tracking, payment receipts, and custom rates for different membership tiers.' },
            ].map(({ Icon, title, desc }, i) => (
              <div key={i} className="bg-white border border-stone-200 rounded-2xl p-7 hover:border-stone-300 hover:shadow-md transition-all group">
                <div className="w-11 h-11 bg-stone-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-stone-200 transition-colors">
                  <Icon className="w-5 h-5 text-[#0E1015]" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-[#0E1015] mb-2">{title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="how" className="py-24 md:py-28 bg-[#F2EFE8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="text-sm font-semibold text-[#B23A2A] uppercase tracking-wider mb-4">How it works</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-[#0E1015] leading-tight">
              From record to proof in seconds
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { n: '01', title: 'Enter a record',      desc: 'Log income, expenses, dues, or donations. Attach receipts. Tag projects, budgets, or members.' },
              { n: '02', title: 'Get it approved',      desc: 'A role-gated reviewer approves or rejects the entry. Reasons are captured in the full audit trail.' },
              { n: '03', title: 'The record is hashed', desc: 'On approval, the canonical record is SHA-256 hashed. The hash is public and reveals nothing private.' },
              { n: '04', title: 'Proof goes on-chain',  desc: 'The hash is anchored to the Alkebuleum blockchain. Anyone can verify the record has not changed.' },
            ].map((s, i) => (
              <div key={i}>
                <div className="w-14 h-14 bg-white rounded-full border-2 border-stone-300 flex items-center justify-center font-display text-lg font-semibold text-[#B23A2A] mb-5 shadow-sm">
                  {s.n}
                </div>
                <h3 className="font-semibold text-[#0E1015] mb-2">{s.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ───────────────────────────────────────────────────── */}
      <section id="who" className="py-24 md:py-32 bg-[#FAF8F4]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="text-sm font-semibold text-[#B23A2A] uppercase tracking-wider mb-4">Who it's for</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-[#0E1015] leading-tight">
              Built for organizations that answer to others
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                Icon: Users,
                title: 'Membership organizations',
                subtitle: 'Associations, professional societies, alumni groups, unions, chambers, clubs',
                features: ['Member directory & profiles', 'Dues tracking & receipts', 'Member portal & announcements', 'Approved financial transparency'],
              },
              {
                Icon: FolderKanban,
                title: 'Projects & nonprofits',
                subtitle: 'NGOs, foundations, grant-funded programs, public agencies, community projects',
                features: ['Projects with budgets & milestones', 'Grant & restricted-fund tracking', 'Vendor / beneficiary records', 'Public transparency page'],
              },
            ].map(({ Icon, title, subtitle, features }, i) => (
              <div key={i} className="bg-white border border-stone-200 rounded-2xl p-8 md:p-10 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mb-6">
                  <Icon className="w-6 h-6 text-[#0E1015]" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-2xl font-semibold text-[#0E1015] mb-2">{title}</h3>
                <p className="text-stone-400 text-sm mb-6 italic">{subtitle}</p>
                <ul className="space-y-3">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-stone-700">
                      <Check className="w-4 h-4 text-[#2F5D50] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF CALLOUT ──────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-[#0E1015] text-white relative overflow-hidden">
        <div className="absolute inset-0 ledger-rule opacity-[0.06] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/70 text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 mb-8">
                <ShieldCheck className="w-3.5 h-3.5" />
                Blockchain verification
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-semibold leading-tight mb-6">
                The ledger you can prove hasn't changed.
              </h2>
              <p className="text-white/60 text-lg leading-relaxed mb-10">
                Not a crypto product. A bookkeeping system where every approved record carries a cryptographic fingerprint — anchored on-chain, verifiable forever, with your private data staying entirely in your workspace.
              </p>
              <ul className="space-y-4">
                {[
                  'Records hashed at the moment of approval',
                  'Anchored to Alkebuleum mainnet',
                  'Public verification — no account needed',
                  'Private records stay in your workspace',
                ].map((point) => (
                  <li key={point} className="flex items-center gap-3 text-sm text-white/70">
                    <Check className="w-4 h-4 text-[#8CC5B0] flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: verification widget */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-2 h-2 bg-[#8CC5B0] rounded-full animate-pulse" />
                <span className="text-xs font-mono uppercase tracking-wider text-white/50">
                  Live verification · Alkebuleum mainnet
                </span>
              </div>

              <div key={current.id} className="reveal-slow">
                <div className="text-[11px] text-white/40 font-mono uppercase tracking-wider mb-1">Record ID</div>
                <div className="font-mono text-sm text-white/50 mb-5">{current.id}</div>
                <div className="text-xl text-white font-medium mb-2">"{current.desc}"</div>
                <div className="font-display text-4xl font-semibold text-[#8CC5B0] mb-6">{current.amount}</div>
                <div className="border-t border-white/10 pt-5">
                  <div className="text-[11px] text-white/40 font-mono uppercase tracking-wider mb-2">Cryptographic proof</div>
                  <div className="font-mono text-sm text-[#8CC5B0] cursor-blink">{current.hash}</div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  { l: 'Record canonicalized', d: '0s' },
                  { l: 'SHA-256 computed',     d: '0.3s' },
                  { l: 'Anchor submitted',     d: '0.6s' },
                  { l: 'Verified on-chain',    d: '0.9s' },
                ].map((step) => (
                  <div key={step.l} className="flex items-center gap-3 text-sm">
                    <Check className="w-3.5 h-3.5 text-[#8CC5B0] flex-shrink-0" />
                    <span className="text-white/60 flex-1">{step.l}</span>
                    <span className="font-mono text-xs text-white/30">+{step.d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-[#FAF8F4]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-display text-5xl md:text-6xl font-semibold leading-tight mb-6 text-[#0E1015]">
            Keep the books.<br />
            <span className="text-[#B23A2A]">Keep the proof.</span>
          </h2>
          <p className="text-stone-500 text-xl leading-relaxed mb-12 max-w-2xl mx-auto">
            A workspace takes about ninety seconds to create. The trust you build with the people who rely on you compounds for years.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 bg-[#0E1015] text-[#FAF8F4] text-sm font-medium px-8 py-4 rounded-xl hover:bg-stone-800 transition-colors group"
            >
              Start for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={onDemo}
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 px-8 py-4 rounded-xl border border-stone-300 hover:border-stone-400 hover:bg-white transition-colors"
            >
              View demo
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-end gap-2 mb-4">
                <img src="/logo.svg" alt="" className="h-6 w-auto" />
                <span className="font-display text-xl leading-none tracking-tight">
                  <span className="font-bold text-[#0E1015]">Alke</span><span className="font-light text-[#0E1015]">Ledger</span>
                </span>
              </div>
              <p className="text-sm text-stone-500 leading-relaxed max-w-xs">
                A modern instrument of record. Ledgers for organizations that intend to be trusted.
              </p>
            </div>
            {[
              { heading: 'Product',    links: ['Ledger', 'Approvals', 'Transparency', 'Proof & anchoring'] },
              { heading: 'For',        links: ['Membership orgs', 'Nonprofits', 'Grants & programs', 'Councils & DAOs'] },
              { heading: 'Foundation', links: ['Alkebuleum chain', 'Audit trail', 'Open verification'] },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-4">{heading}</div>
                <ul className="space-y-2">
                  {links.map((l) => (
                    <li key={l} className="text-sm text-stone-600">{l}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400">
            <span>© 2026 AlkeLedger. All rights reserved.</span>
            <span className="italic text-stone-400">"Set down in honest fashion, that those who come after may know."</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
