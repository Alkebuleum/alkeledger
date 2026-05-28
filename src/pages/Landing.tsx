import React, { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Check, Users, FolderKanban } from 'lucide-react';

interface Props {
  onStart: () => void;
  onDemo: () => void;
}

export function Landing({ onStart, onDemo }: Props) {
  const [verifyIdx, setVerifyIdx] = useState(0);
  const verifySamples = [
    { id: 'le_001', desc: 'EPA watershed grant disbursement', amount: '$50,000', hash: '0x9f2c…a41b' },
    { id: 'le_004', desc: 'Wellspring Trust donation',         amount: '$8,500',  hash: '0x88c0…12fd' },
    { id: 'le_101', desc: 'Annual dues — E. Vance',            amount: '$350',    hash: '0x2a4f…77bc' },
  ];

  useEffect(() => {
    const t = setInterval(() => setVerifyIdx((i) => (i + 1) % verifySamples.length), 4200);
    return () => clearInterval(t);
  }, [verifySamples.length]);

  const current = verifySamples[verifyIdx];

  return (
    <div className="min-h-screen bg-[var(--bone)] text-[var(--ink)] relative overflow-hidden">
      {/* HEADER (newspaper masthead) */}
      <header className="relative z-20 border-b-2 border-[var(--ink)]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between py-2 text-[10px] uppercase tracking-[0.25em] text-stone-600 border-b border-stone-300/60">
            <span className="font-mono">Vol. I · No. 001</span>
            <span className="hidden md:block font-editorial italic">Sunday, May 24, 2026 · A modern instrument of record</span>
            <span className="font-mono">Est. MMXXVI</span>
          </div>
          <div className="flex items-end justify-between py-5">
            <div className="flex items-end gap-3">
              <img src="/logo.svg" alt="AlkeLedger" className="h-12 w-auto pb-2" />
              <div className="font-display text-3xl md:text-4xl leading-none"><span className="font-bold">Alke</span><span className="font-light">Ledger</span></div>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.18em] text-stone-700">
              <a className="hover:text-[var(--ink)] border-b border-transparent hover:border-[var(--ink)] pb-0.5" href="#concept">The Idea</a>
              <a className="hover:text-[var(--ink)] border-b border-transparent hover:border-[var(--ink)] pb-0.5" href="#how">How It Works</a>
              <a className="hover:text-[var(--ink)] border-b border-transparent hover:border-[var(--ink)] pb-0.5" href="#who">Who It's For</a>
              <a className="hover:text-[var(--ink)] border-b border-transparent hover:border-[var(--ink)] pb-0.5" href="#proof">The Proof</a>
              <button onClick={onDemo} className="text-[var(--ink)] font-medium border-b border-[var(--ink)] pb-0.5">Sign in →</button>
            </nav>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 grid-paper opacity-50 pointer-events-none" />
        <div className="absolute inset-0 grain opacity-[0.35] mix-blend-multiply pointer-events-none" />
        <div className="absolute -top-32 -left-20 w-[500px] h-[500px] rounded-full bg-[var(--archival)]/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-12 pt-16 md:pt-24 pb-16">
          <div className="flex items-center gap-4 mb-12 reveal" style={{ animationDelay: '0.05s' }}>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--ledger-red)] font-mono">§ 01 — Front page</span>
            <span className="flex-1 h-px bg-[var(--ink)]/30 draw-line" style={{ animationDelay: '0.2s' }} />
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7">
              <h1 className="font-display text-[clamp(3rem,7.5vw,7.5rem)] leading-[0.92] tracking-[-0.035em] font-medium">
                <span className="block reveal" style={{ animationDelay: '0.1s' }}>The ledger,</span>
                <span className="block reveal" style={{ animationDelay: '0.25s' }}>
                  <em className="font-editorial italic font-light text-[var(--ledger-red)]">reconsidered</em>
                  <span className="text-[var(--ink)]">.</span>
                </span>
              </h1>

              <div className="mt-10 max-w-xl reveal" style={{ animationDelay: '0.5s' }}>
                <p className="font-editorial text-xl md:text-2xl leading-snug text-stone-800">
                  Every approval, leaves a mark. Every record, a proof.<br />
                  <span className="text-stone-500">A bookkeeping system for organizations that intend to be trusted — and want the receipts to show it.</span>
                </p>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-4 reveal" style={{ animationDelay: '0.7s' }}>
                <button onClick={onStart} className="group px-7 py-4 bg-[var(--ink)] text-[var(--bone)] text-sm font-medium tracking-wide hover:bg-stone-800 transition-colors flex items-center gap-3">
                  Open a workspace
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button onClick={onDemo} className="px-7 py-4 text-sm font-medium tracking-wide text-[var(--ink)] border-b-2 border-[var(--ink)]">
                  Read the demo issue
                </button>
              </div>

              <div className="mt-16 grid grid-cols-3 gap-px bg-[var(--ink)]/20 border border-[var(--ink)]/20 reveal" style={{ animationDelay: '0.85s' }}>
                {[
                  { k: '∞', l: 'Records', s: 'Tamper-evident' },
                  { k: '5', l: 'Roles',   s: 'Owner → Viewer' },
                  { k: '2', l: 'Org types', s: 'And growing' },
                ].map((s, i) => (
                  <div key={i} className="bg-[var(--bone)] p-5">
                    <div className="font-display text-4xl">{s.k}</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mt-2">{s.l}</div>
                    <div className="text-xs text-stone-700 mt-1 font-editorial italic">{s.s}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 reveal" style={{ animationDelay: '0.4s' }}>
              <div className="sticky top-8">
                <div className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-mono mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                  Live verification — public ledger
                </div>

                <div className="bg-[var(--ink)] text-[var(--bone)] p-7 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 border-l border-b border-[var(--bone)]/10" />
                  <div className="absolute top-3 right-3 text-[9px] uppercase tracking-[0.25em] text-stone-400 font-mono">Anchored</div>

                  <div className="flex items-center gap-2 mb-6">
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-mono">Alkebuleum mainnet</span>
                  </div>

                  <div key={current.id} className="reveal-slow">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono">Record</div>
                    <div className="font-mono text-xs text-stone-300 mt-1">{current.id}</div>
                    <div className="mt-5 font-editorial text-2xl leading-tight text-[var(--bone)]">"{current.desc}"</div>
                    <div className="mt-3 font-display text-4xl text-emerald-300 tracking-tight">{current.amount}</div>
                  </div>

                  <div className="mt-7 pt-5 border-t border-[var(--bone)]/10">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-2">Cryptographic proof</div>
                    <div className="font-mono text-sm text-emerald-300 break-all cursor-blink">{current.hash}</div>
                  </div>

                  <div className="mt-5 space-y-2">
                    {[
                      { l: 'Record canonicalized', d: '0s' },
                      { l: 'SHA-256 computed', d: '0.3s' },
                      { l: 'Anchor submitted', d: '0.6s' },
                      { l: 'Verified on-chain', d: '0.9s' },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs reveal" style={{ animationDelay: `${1 + i * 0.15}s` }}>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-stone-300 flex-1">{step.l}</span>
                        <span className="font-mono text-[10px] text-stone-500">+{step.d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-4 text-xs text-stone-600 font-editorial italic leading-relaxed">
                  Pictured: a real approved record, hashed and anchored. The private record stays in your workspace — only the proof becomes public.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <div className="border-y-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--bone)] py-3 overflow-hidden">
          <div className="ticker-track flex items-center gap-12 whitespace-nowrap font-mono text-xs uppercase tracking-[0.2em]">
            {[...Array(2)].map((_, dupe) => (
              <React.Fragment key={dupe}>
                <span>◆ Income recorded</span><span className="text-emerald-400">+$50,000</span>
                <span>◆ Hash 0x9f2c…a41b verified</span>
                <span className="text-[var(--archival)]">◆ Approval pending — Cedar Creek</span>
                <span>◆ Expense recorded</span><span className="text-stone-400">−$12,480</span>
                <span>◆ Tx 0x55ab…ff03 anchored</span>
                <span className="text-emerald-400">◆ Quarterly report published</span>
                <span>◆ Audit trail · 4 actions today</span>
                <span>◆ Receipt attached · le_004</span>
                <span className="text-[var(--archival)]">◆ Annual dues collected</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* §02 THE CASE */}
      <section id="concept" className="relative border-b border-[var(--ink)]/20">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-24 md:py-32">
          <div className="flex items-center gap-4 mb-16">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--ledger-red)] font-mono">§ 02 — The case</span>
            <span className="flex-1 h-px bg-[var(--ink)]/30" />
          </div>

          <div className="grid md:grid-cols-12 gap-12">
            <div className="md:col-span-3">
              <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono">Filed under</div>
              <div className="mt-2 font-editorial italic text-stone-700">Trust & transparency</div>
              <div className="mt-12 text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono">A note from the desk</div>
              <p className="mt-3 font-editorial text-sm text-stone-600 leading-relaxed">
                Boards lose minutes. Treasurers leave with the spreadsheet. Donors ask — where did it go — and the answer is "we'll get back to you."
              </p>
            </div>

            <div className="md:col-span-9">
              <h2 className="font-display text-5xl md:text-6xl leading-[1.02] font-medium">
                Every organization keeps a ledger.<br />
                <span className="text-stone-400">Very few keep one that</span><br />
                <em className="font-editorial italic text-[var(--ledger-red)] font-light">cannot be quietly rewritten.</em>
              </h2>

              <div className="mt-12 grid md:grid-cols-2 gap-12 max-w-4xl font-editorial text-lg leading-relaxed text-stone-700">
                <p>
                  AlkeLedger is the place an association, a nonprofit, a foundation, a council, or a community group puts its real numbers — income, expense, dues, donations, restricted grants, supporting receipts — and then proves, at the moment of approval, that the record has not since been changed.
                </p>
                <p>
                  Not a crypto wallet. Not a token. A bookkeeping system that looks and behaves the way a bookkeeping system should, with one quiet feature underneath: every approved entry leaves a mathematically verifiable trace.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* §03 HOW IT WORKS */}
      <section id="how" className="relative bg-[var(--paper)] border-y-2 border-[var(--ink)]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-24 md:py-28">
          <div className="flex items-center gap-4 mb-16">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--ledger-red)] font-mono">§ 03 — The mechanism</span>
            <span className="flex-1 h-px bg-[var(--ink)]/30" />
          </div>

          <h2 className="font-display text-5xl md:text-6xl mb-16 max-w-3xl leading-[1.02]">
            How a record becomes <em className="font-editorial italic font-light">unforgettable.</em>
          </h2>

          <div className="grid md:grid-cols-4 gap-px bg-[var(--ink)]/20 border border-[var(--ink)]/20">
            {[
              { n: 'I',   t: 'A record is entered',   d: 'Income, expense, dues, donation, grant. Attach the receipt. Tag the project or member. The treasurer is the one entering it; the system is the one keeping count.' },
              { n: 'II',  t: 'A reviewer approves',   d: 'Approvals are role-gated. An owner, admin, or auditor signs off. Reject and the entry is closed; approve and it moves forward — with reasons captured in the trail.' },
              { n: 'III', t: 'The record is hashed',  d: 'At the moment of approval the canonical record is hashed (SHA-256). The hash is short, public, and reveals nothing about what is in the record — only that it has not changed.' },
              { n: 'IV',  t: 'The proof is anchored', d: 'The hash is written to the Alkebuleum chain. Anyone holding the original record can later prove its integrity in seconds. Your books stay yours. The proof goes everywhere.' },
            ].map((s, i) => (
              <div key={i} className="bg-[var(--bone)] p-8 md:p-10">
                <div className="font-editorial italic text-6xl text-[var(--ledger-red)] mb-6">{s.n}.</div>
                <h3 className="font-display text-2xl mb-4">{s.t}</h3>
                <p className="text-sm text-stone-700 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* §04 WHO IT'S FOR */}
      <section id="who" className="relative">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-24 md:py-32">
          <div className="flex items-center gap-4 mb-16">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--ledger-red)] font-mono">§ 04 — The audience</span>
            <span className="flex-1 h-px bg-[var(--ink)]/30" />
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-[var(--ink)] border-2 border-[var(--ink)]">
            <div className="bg-[var(--bone)] p-10 md:p-12 relative hover:bg-[var(--paper)] transition-colors">
              <div className="absolute top-6 right-6 font-mono text-[10px] uppercase tracking-[0.25em] text-stone-400">No. 01</div>
              <Users className="w-8 h-8 mb-6 text-[var(--ink)]" strokeWidth={1.5} />
              <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono mb-3">For</div>
              <h3 className="font-display text-4xl mb-5">Membership organizations</h3>
              <p className="font-editorial text-lg text-stone-700 leading-snug mb-6 italic">
                Associations, professional societies, alumni groups, councils, unions, chambers, clubs.
              </p>
              <ul className="space-y-2 text-sm text-stone-800">
                {['Member directory & profiles', 'Dues tracking & receipts', 'Member portal & announcements', 'Approved financial transparency'].map((b) => (
                  <li key={b} className="flex items-baseline gap-3 py-2 border-b border-stone-300/50 last:border-0">
                    <span className="font-mono text-[10px] text-stone-400">→</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[var(--bone)] p-10 md:p-12 relative hover:bg-[var(--paper)] transition-colors">
              <div className="absolute top-6 right-6 font-mono text-[10px] uppercase tracking-[0.25em] text-stone-400">No. 02</div>
              <FolderKanban className="w-8 h-8 mb-6 text-[var(--ink)]" strokeWidth={1.5} />
              <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono mb-3">For</div>
              <h3 className="font-display text-4xl mb-5">Projects & nonprofits</h3>
              <p className="font-editorial text-lg text-stone-700 leading-snug mb-6 italic">
                NGOs, foundations, grant-funded programs, public agencies, community projects, startup initiatives.
              </p>
              <ul className="space-y-2 text-sm text-stone-800">
                {['Projects with budgets & milestones', 'Grant & restricted-fund tracking', 'Vendor / beneficiary records', 'Public transparency page'].map((b) => (
                  <li key={b} className="flex items-baseline gap-3 py-2 border-b border-stone-300/50 last:border-0">
                    <span className="font-mono text-[10px] text-stone-400">→</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-stone-500 font-editorial italic max-w-2xl mx-auto">
            More organization types — DAOs, public agencies, faith communities, cooperatives — arrive on the same foundation.
          </p>
        </div>
      </section>

      {/* §05 IN CLOSING */}
      <section id="proof" className="relative bg-[var(--ink)] text-[var(--bone)] overflow-hidden">
        <div className="absolute inset-0 ledger-rule opacity-[0.25] pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[var(--archival)]/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-12 py-28 md:py-36">
          <div className="flex items-center gap-4 mb-16">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--archival)] font-mono">§ 05 — In closing</span>
            <span className="flex-1 h-px bg-[var(--bone)]/30" />
          </div>

          <div className="max-w-4xl">
            <h2 className="font-display text-6xl md:text-8xl leading-[0.95] font-medium">
              Keep the books.<br />
              <em className="font-editorial italic font-light text-[var(--archival)]">Keep the proof.</em>
            </h2>

            <p className="mt-12 font-editorial text-2xl leading-snug text-stone-300 max-w-2xl">
              A workspace takes about ninety seconds to create. The first record takes another minute. The trust you build with the people who rely on you — that compounds for years.
            </p>

            <div className="mt-14 flex flex-wrap items-center gap-4">
              <button onClick={onStart} className="px-8 py-5 bg-[var(--bone)] text-[var(--ink)] text-sm font-medium tracking-wide hover:bg-white transition-colors flex items-center gap-3 group">
                Begin a workspace
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={onDemo} className="px-8 py-5 text-sm font-medium tracking-wide text-[var(--bone)] border-b-2 border-[var(--bone)]/60 hover:border-[var(--bone)]">
                Tour the demo first
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* COLOPHON */}
      <footer className="relative border-t-2 border-[var(--ink)] bg-[var(--bone)]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12">
          <div className="grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-5">
              <div className="font-display text-2xl"><span className="font-bold">Alke</span><span className="font-light">Ledger</span></div>
              <p className="text-xs text-stone-600 mt-2 font-editorial italic max-w-md">
                A modern instrument of record. Ledgers for organizations that intend to be trusted.
              </p>
            </div>
            <div className="md:col-span-7 grid grid-cols-3 gap-6 text-xs">
              <div>
                <div className="uppercase tracking-[0.2em] text-[10px] text-stone-500 mb-3 font-mono">Product</div>
                <ul className="space-y-1.5 text-stone-700">
                  <li>Ledger</li><li>Approvals</li><li>Transparency</li><li>Proof & anchoring</li>
                </ul>
              </div>
              <div>
                <div className="uppercase tracking-[0.2em] text-[10px] text-stone-500 mb-3 font-mono">For</div>
                <ul className="space-y-1.5 text-stone-700">
                  <li>Membership orgs</li><li>Nonprofits</li><li>Grants & programs</li><li>Councils & DAOs</li>
                </ul>
              </div>
              <div>
                <div className="uppercase tracking-[0.2em] text-[10px] text-stone-500 mb-3 font-mono">Foundation</div>
                <ul className="space-y-1.5 text-stone-700">
                  <li>Alkebuleum chain</li><li>Audit trail</li><li>Open verification</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-stone-300/60 flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono">
            <span>© MMXXVI · AlkeLedger</span>
            <span className="font-editorial italic normal-case tracking-normal text-stone-600">"Set down in honest fashion, that those who come after may know."</span>
            <span>Vol. I · No. 001</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
