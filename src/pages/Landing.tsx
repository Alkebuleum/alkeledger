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

const HERO_ENTRIES = [
  { what: 'Board resolution 2026-14 recorded', hash: 'sha-256 · 8f3a41…c21e', when: '09:41:07', sealed: false },
  { what: 'Credential issued — J. Okafor, Director', hash: 'sha-256 · 5d17be…09bb', when: '09:42:19', sealed: false },
  { what: 'Contract v3 attached · 2.4 MB', hash: 'sha-256 · e0c4a8…77ad', when: '09:44:02', sealed: false },
  { what: 'Entry sealed to chain', hash: '', when: '09:44:03', sealed: true },
];

const RECORD_TYPES = [
  { name: 'Decisions', desc: 'Board votes, approvals and sign-offs. Who decided what, when, and with what supporting context.', idx: 'REC-TYPE / 01' },
  { name: 'Transactions', desc: 'Payments, transfers and settlements — recorded with the paper trail attached, not scattered across inboxes.', idx: 'REC-TYPE / 02' },
  { name: 'Credentials', desc: 'Certificates, licenses and memberships that a counterparty can check in seconds — no phone calls, no PDFs.', idx: 'REC-TYPE / 03' },
  { name: 'Documents', desc: 'Contracts and filings, fingerprinted at the moment of record. Any later change to the file is evident.', idx: 'REC-TYPE / 04' },
];

const CHAIN_ENTRIES = [
  { entry: '#01847 — board-resolution-2026-14', hash: '8f3a41d9…c21e', prev: '2b90ffae…5510 ⇠ #01846' },
  { entry: '#01846 — credential-issue-okafor', hash: '2b90ffae…5510', prev: '77cd0e12…9a3f ⇠ #01845' },
  { entry: '#01845 — contract-v3-attach', hash: '77cd0e12…9a3f', prev: 'e0c4a8b1…77ad ⇠ #01844' },
];

export function Landing({ onStart, onDemo }: Props) {
  const [visibleEntries, setVisibleEntries] = useState(0);
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setVisibleEntries(HERO_ENTRIES.length);
      return;
    }
    const timers = HERO_ENTRIES.map((_, i) =>
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
          <a href="#" aria-label="Scribe home" className="flex items-center gap-[11px] font-serif text-[21px] font-semibold tracking-[0.01em]">
            <svg width="26" height="26" viewBox="0 0 96 96" aria-hidden="true">
              <rect x="20" y="11.75" width="56" height="9" rx="2" fill="#171B21"/>
              <rect x="20" y="27.25" width="26" height="9" rx="2" fill="#171B21"/>
              <rect x="20" y="42.75" width="56" height="9" rx="2" fill="#171B21"/>
              <rect x="50" y="58.25" width="26" height="9" rx="2" fill="#171B21"/>
              <rect x="20" y="73.75" width="56" height="9" rx="2" fill="#171B21"/>
              <rect x="80" y="73.75" width="5" height="9" rx="2" fill="#8A1E2D"/>
            </svg>
            Scribe
          </a>
          <div className="hidden md:flex gap-[26px] text-[13.5px] font-medium text-[#4B5058] ml-2">
            <a href="#record" className="hover:text-[#171B21] transition-colors">What you can record</a>
            <a href="#how" className="hover:text-[#171B21] transition-colors">How it works</a>
            <a href="#security" className="hover:text-[#171B21] transition-colors">Tamper-evidence</a>
            <a href="#verify" className="hover:text-[#171B21] transition-colors">Verify</a>
          </div>
          <div className="ml-auto flex items-center gap-[18px]">
            <button onClick={onDemo} className="text-[13.5px] font-medium text-[#4B5058] hover:text-[#171B21] transition-colors">
              Sign in
            </button>
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 bg-[#171B21] text-[#EFE9DC] text-sm font-medium px-5 py-[11px] rounded border border-[#171B21] hover:bg-[#232935] transition-colors"
            >
              Open Scribe
            </button>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <header className="border-b border-[#DCD6C6] py-[88px]">
        <div className="max-w-[1160px] mx-auto px-6 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div>
            <EntryTag n="001" label="The record begins" />
            <h1 className="font-serif font-medium text-[clamp(40px,5.6vw,64px)] leading-[1.06] tracking-[-0.015em]">
              Every action.<br />A <em className="italic text-[#8A1E2D] font-medium">verifiable</em> record.
            </h1>
            <p className="text-[17.5px] text-[#43484F] max-w-[52ch] mt-6 mb-[34px]">
              Scribe is the shared record for your organization. Decisions, transactions, credentials and documents — written once, sealed against tampering, and verifiable by anyone you choose.
            </p>
            <div className="flex flex-wrap items-center gap-[14px]">
              <button
                onClick={onStart}
                className="inline-flex items-center gap-2 bg-[#8A1E2D] text-[#EFE9DC] text-sm font-medium px-5 py-[11px] rounded border border-[#8A1E2D] hover:bg-[#761826] transition-colors"
              >
                Start your record
              </button>
              <a href="#how" className="text-[14.5px] font-medium border-b border-[#DCD6C6] pb-0.5 hover:border-[#171B21] transition-colors">
                How sealing works ↓
              </a>
            </div>
            <div className="font-plex text-[11.5px] text-[#8A8F99] tracking-[0.04em] mt-[30px]">
              alkescribe.com · app.alkescribe.com
            </div>
          </div>

          <div className="bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg shadow-[0_24px_60px_-30px_rgba(23,27,33,0.25)] overflow-hidden">
            <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-[#DCD6C6] font-plex text-[11px] tracking-[0.08em] text-[#8A8F99]">
              <b className="text-[#171B21] font-medium">acme-holdings / record</b>
              <span>append-only</span>
            </div>
            {HERO_ENTRIES.map((entry, i) => (
              <div
                key={entry.what}
                className={`grid grid-cols-[20px_1fr_auto] gap-[14px] items-start px-[18px] py-[15px] border-b border-[#EAE6D9] last:border-none transition-all duration-500 ${
                  i < visibleEntries ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5'
                }`}
              >
                <div className={`w-5 h-[5px] rounded-sm mt-2 ${entry.sealed ? 'bg-[#8A1E2D]' : 'bg-[#171B21]'}`} />
                <div>
                  <div className="text-sm font-medium leading-[1.4]">{entry.what}</div>
                  {entry.sealed ? (
                    <div className="flex gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-1.5 font-plex text-[10.5px] tracking-[0.1em] px-[9px] py-1 rounded-[3px] bg-[#8A1E2D] text-[#EFE9DC]">■ SEALED</span>
                      <span className="inline-flex items-center gap-1.5 font-plex text-[10.5px] tracking-[0.1em] px-[9px] py-1 rounded-[3px] bg-[rgba(62,98,87,0.12)] text-[#3E6257] border border-[rgba(62,98,87,0.35)]">✓ VERIFIABLE</span>
                    </div>
                  ) : (
                    <div className="font-plex text-[11px] text-[#8A8F99] mt-[3px] tracking-[0.02em]">{entry.hash}</div>
                  )}
                </div>
                <div className="font-plex text-[11px] text-[#8A8F99] mt-1.5">{entry.when}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ============ RECORD TYPES ============ */}
      <section className="py-24" id="record">
        <div className="max-w-[1160px] mx-auto px-6">
          <EntryTag n="002" label="What you can record" />
          <h2 className="font-serif font-medium text-[clamp(30px,4vw,44px)] leading-[1.12] tracking-[-0.01em] max-w-[22ch]">
            One ledger for everything your organization needs to stand behind.
          </h2>
          <p className="text-[16.5px] text-[#43484F] max-w-[56ch] mt-4">
            Each entry captures who, what, when — with files, people and context attached. Once sealed, it can be corrected by a new entry, but never silently rewritten.
          </p>

          <div className="mt-14 border-t border-[#DCD6C6]">
            {RECORD_TYPES.map((row) => (
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

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-24 bg-[#EFECE2] border-t border-b border-[#DCD6C6]" id="how">
        <div className="max-w-[1160px] mx-auto px-6">
          <EntryTag n="003" label="How it works" />
          <h2 className="font-serif font-medium text-[clamp(30px,4vw,44px)] leading-[1.12] tracking-[-0.01em] max-w-[22ch]">
            Record. Seal. Verify.
          </h2>

          <div className="grid md:grid-cols-3 gap-5 mt-[52px]">
            <div className="js-reveal bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-[30px] px-[26px]">
              <div className="h-14 mb-[18px] flex items-center">
                <svg width="64" height="44" viewBox="0 0 64 44" aria-hidden="true">
                  <rect x="2" y="6" width="44" height="6" rx="2" fill="#171B21"/>
                  <rect x="2" y="19" width="30" height="6" rx="2" fill="#171B21"/>
                  <rect x="2" y="32" width="38" height="6" rx="2" fill="#8A8F99"/>
                </svg>
              </div>
              <div className="font-plex text-xs text-[#8A1E2D] tracking-[0.14em] font-medium">01 / RECORD</div>
              <h3 className="font-serif text-2xl font-semibold mt-3 mb-2.5">Write the entry</h3>
              <p className="text-[14.5px] text-[#43484F]">From the app, the API, or the tools you already use. Attach files, link the people involved, add context while it's fresh.</p>
            </div>

            <div className="js-reveal bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-[30px] px-[26px]">
              <div className="h-14 mb-[18px] flex items-center">
                <svg width="64" height="44" viewBox="0 0 64 44" aria-hidden="true">
                  <rect x="2" y="6" width="44" height="6" rx="2" fill="#171B21"/>
                  <rect x="2" y="19" width="44" height="6" rx="2" fill="#171B21"/>
                  <rect x="2" y="32" width="44" height="6" rx="2" fill="#171B21"/>
                  <rect x="50" y="32" width="5" height="6" rx="2" fill="#8A1E2D"/>
                </svg>
              </div>
              <div className="font-plex text-xs text-[#8A1E2D] tracking-[0.14em] font-medium">02 / SEAL</div>
              <h3 className="font-serif text-2xl font-semibold mt-3 mb-2.5">Chain it to history</h3>
              <p className="text-[14.5px] text-[#43484F]">Scribe fingerprints the entry and links it to everything before it. From that second on, any alteration — to the entry or its files — is evident.</p>
            </div>

            <div className="js-reveal bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-[30px] px-[26px]">
              <div className="h-14 mb-[18px] flex items-center">
                <svg width="64" height="44" viewBox="0 0 64 44" aria-hidden="true">
                  <circle cx="22" cy="22" r="17" fill="none" stroke="#3E6257" strokeWidth="4"/>
                  <path d="M14 22 l6 6 l11 -12" fill="none" stroke="#3E6257" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="font-plex text-xs text-[#8A1E2D] tracking-[0.14em] font-medium">03 / VERIFY</div>
              <h3 className="font-serif text-2xl font-semibold mt-3 mb-2.5">Let anyone confirm it</h3>
              <p className="text-[14.5px] text-[#43484F]">Share a link or export a proof. Auditors, partners and regulators can confirm a record is authentic and unaltered — no Scribe account needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TAMPER-EVIDENCE ============ */}
      <section className="py-24 bg-[#171B21] text-[#EFE9DC]" id="security">
        <div className="max-w-[1160px] mx-auto px-6">
          <EntryTag n="004" label="Tamper-evidence" dark />
          <h2 className="font-serif font-medium text-[clamp(30px,4vw,44px)] leading-[1.12] tracking-[-0.01em] max-w-[22ch] text-[#EFE9DC]">
            You are never asked to just trust us.
          </h2>
          <p className="text-[16.5px] text-[#B9BDC6] max-w-[56ch] mt-4">
            Scribe is built so that the record proves itself. Trust comes from the structure of the ledger, not from our word.
          </p>

          <div className="grid md:grid-cols-2 gap-10 md:gap-[60px] items-center mt-14">
            <div className="border-t border-[rgba(239,233,220,0.14)]">
              {[
                { h: 'Hash-chained history', p: 'Every entry carries the fingerprint of the entry before it. Rewriting the past breaks the chain — visibly, for everyone.' },
                { h: 'Append-only by design', p: 'Mistakes are corrected by new entries that reference the old, never by silent edits. The correction is part of the record too.' },
                { h: 'Independently verifiable', p: 'Exported proofs verify with standard, open cryptography — outside Scribe, without our servers, forever.' },
                { h: 'Yours to take', p: 'Export the complete chain at any time. Your organization\'s history is your property, not our lock-in.' },
              ].map((claim) => (
                <div key={claim.h} className="js-reveal py-6 px-1 border-b border-[rgba(239,233,220,0.14)]">
                  <h4 className="font-serif text-[19px] font-semibold mb-[7px]">{claim.h}</h4>
                  <p className="text-sm text-[#A9AEB8] max-w-[52ch]">{claim.p}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#232935] border border-[rgba(239,233,220,0.1)] rounded-lg p-[26px] font-plex text-xs leading-[2.05] text-[#8A8F99] overflow-hidden">
              {CHAIN_ENTRIES.map((c, i) => (
                <div key={c.entry}>
                  <div className="flex gap-3.5 whitespace-nowrap">
                    <span className="text-[#5F6570] w-16 flex-shrink-0">entry</span>
                    <span className="text-[#C9CDD5]">{c.entry}</span>
                  </div>
                  <div className="flex gap-3.5 whitespace-nowrap">
                    <span className="text-[#5F6570] w-16 flex-shrink-0">hash</span>
                    <span className="text-[#C9CDD5]">{c.hash}</span>
                  </div>
                  <div className="flex gap-3.5 whitespace-nowrap">
                    <span className="text-[#5F6570] w-16 flex-shrink-0">prev</span>
                    <span className="text-[#B3453C]">{c.prev}</span>
                  </div>
                  <div className="flex gap-3.5 whitespace-nowrap">
                    <span className="text-[#5F6570] w-16 flex-shrink-0">status</span>
                    <span className="text-[#7FA99A]">sealed · verified ✓</span>
                  </div>
                  {i < CHAIN_ENTRIES.length - 1 && <hr className="border-none border-t border-dashed border-[rgba(239,233,220,0.15)] my-2.5" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ VERIFY ============ */}
      <section className="py-24 text-center" id="verify">
        <div className="max-w-[1160px] mx-auto px-6">
          <EntryTag n="005" label="Verification" />
          <h2 className="font-serif font-medium text-[clamp(30px,4vw,44px)] leading-[1.12] tracking-[-0.01em] mx-auto">
            A record anyone can check.
          </h2>
          <p className="text-[16.5px] text-[#43484F] max-w-[56ch] mt-4 mx-auto">
            This is what a shared Scribe record looks like to the outside world: the fact, its fingerprint, and a verdict.
          </p>

          <div className="max-w-[640px] mx-auto mt-[52px] bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-[26px]">
            <div className="flex justify-between gap-3.5 items-start flex-wrap">
              <div className="text-left">
                <div className="font-serif text-xl font-semibold">Series B closing — recorded</div>
                <div className="font-plex text-[11.5px] text-[#8A8F99] mt-2.5 leading-[2] break-all">
                  org &nbsp;&nbsp;acme-holdings<br />
                  time &nbsp;2026-03-02 · 16:22:41 UTC<br />
                  hash &nbsp;e0c4a8b1f290…77ad
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 font-plex text-[10.5px] tracking-[0.1em] px-[9px] py-1 rounded-[3px] bg-[rgba(62,98,87,0.12)] text-[#3E6257] border border-[rgba(62,98,87,0.35)] mt-0.5">
                ✓ VERIFIED · UNALTERED
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="border-t border-[#DCD6C6]">
        <div className="max-w-[1160px] mx-auto px-6 py-[110px] text-center">
          <h2 className="font-serif font-medium text-[clamp(34px,5vw,54px)] leading-[1.12] tracking-[-0.01em]">
            Start your organization's record.
          </h2>
          <p className="text-[#43484F] max-w-[46ch] mx-auto mt-[18px] mb-[34px]">
            The best time to start keeping a verifiable history was your first decision. The second-best time is your next one.
          </p>
          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 bg-[#8A1E2D] text-[#EFE9DC] text-[15px] font-medium px-7 py-3.5 rounded border border-[#8A1E2D] hover:bg-[#761826] transition-colors"
          >
            Open Scribe →
          </button>
          <div className="font-plex text-[11.5px] text-[#8A8F99] tracking-[0.04em] mt-[26px]">
            app.alkescribe.com · free for your first 100 records
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-[#171B21] text-[#A9AEB8] text-[13.5px]">
        <div className="max-w-[1160px] mx-auto px-6">
          <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-9 py-16">
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
                Scribe
              </a>
              <p className="mt-3.5 text-[13px] max-w-[30ch]">Every action. A verifiable record.</p>
            </div>
            <div>
              <h5 className="font-plex text-[10.5px] tracking-[0.18em] uppercase text-[#5F6570] mb-3.5">Product</h5>
              <ul className="space-y-2.5">
                <li><a href="#record" className="hover:text-[#EFE9DC] transition-colors">What you can record</a></li>
                <li><a href="#how" className="hover:text-[#EFE9DC] transition-colors">How it works</a></li>
                <li><a href="#security" className="hover:text-[#EFE9DC] transition-colors">Tamper-evidence</a></li>
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
            <span>© 2026 Scribe · alkescribe.com</span>
            <span>record integrity: chain intact ✓</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
