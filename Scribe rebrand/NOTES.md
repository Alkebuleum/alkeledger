# Scribe rebrand — status notes

Context for whoever (human or AI) picks this up next.

## What's happening

The app formerly called **AlkeLedger** is being rebranded to **Scribe**. This folder holds
the visual mockups (static HTML) that define the new design system. The brand name was
confirmed as "Scribe" (not "Stribe" — an early typo) directly against these mockup files,
which is why the folder itself was renamed from "Stribe rebrand" to "Scribe rebrand".

The actual codebase lives one level up, at the repo root (`alkeledger` project). This
folder is reference-only — nothing here is imported or built by the app.

## Design system (from the mockups in this folder)

```
--ink:      #171B21   (primary dark / sidebar / footer bg)
--ink-2:    #232935   (hover state for ink)
--vellum:   #EFE9DC   (light text on dark backgrounds)
--paper:    #F6F4ED   (page background, light mode)
--paper-2:  #EFECE2   (alternate section background)
--card:     #FDFCF8   (card surfaces)
--wax:      #8A1E2D   (primary accent / "sealed" red)
--wax-lt:   #B3453C   (lighter accent variant)
--verd:     #3E6257   (verified/success green)
--graphite: #8A8F99   (muted/secondary text)
--rule:     #DCD6C6   (borders)
--rule-soft:#EAE6D9   (softer borders, card interiors)

fonts: Spectral (serif, headings) · Inter (sans, body) · IBM Plex Mono (mono, hashes/labels)
```

Vocabulary/motifs used throughout: records are "entries," approval = "sealed," proof =
"verified," everything ties back to an append-only ledger / hash chain metaphor. Chips:
`■ SEALED` (wax bg) and `✓ VERIFIED`/`✓ VERIFIABLE` (green outline).

## Mockups in this folder

- `app-login.html` — sign-in screen, split layout (dark ink side panel + light form side)
- `app-dashboard.html` — main ledger view: sidebar (dark ink) + entry list + detail panel
- `app-credentials.html` — credentials grid (active/expiring/revoked cards)
- `app-drafts.html` — drafts list
- `app-verify.html` — public record verification page

Note: the **landing page** mockup (`alkescribe-landing.html`) is NOT in this folder — it
was provided separately (was in the user's Downloads folder). It has already been fully
ported into the app; see status below.

## What's done in the codebase

- `src/pages/Landing.tsx` — **fully rebuilt** to match `alkescribe-landing.html` 1:1
  (hero live-ledger widget, record types, how-it-works, tamper-evidence/hash-chain
  section, verify card, final CTA, footer). This is the reference implementation for how
  to port the remaining mockups — same technique: Tailwind arbitrary-value hex colors
  (no global token renames), `font-serif`/`font-plex` utility classes, React state +
  effects standing in for the mockups' inline `<script>` animations.
- `src/components/Brand.tsx` — shared brand lockup (logo + wordmark) renamed to Scribe,
  now uses `font-serif`. Used by Sidebar, SignIn, OrgSetup, JoinPreview, RsvpConfirm — so
  those pages already show "Scribe" even though their layout/colors are still the old
  AlkeLedger style.
- `public/logo.svg` — replaced with the ledger-bar mark (ink-colored bars + wax accent).
  Only a light-background variant exists so far — the dashboard mockup's dark sidebar
  needs a vellum-colored variant (see Next steps).
- `tailwind.config.js` / `src/index.css` — added new `serif` (Spectral) and `plex` (IBM
  Plex Mono) font families + their Google Fonts import. **Additive only** — the old
  `display`/`editorial`/`mono` tokens and the CSS variables (`--ink #0E1015`, `--bone`,
  `--paper`, `--ledger-red`, `--verdigris`, `--amber`/`--archival`) were left untouched,
  because those CSS vars are still consumed via inline `style={{color: 'var(--x)'}}` in
  ~13 other files (Anchors, Events, Votes, Announcements, Documents, Requests,
  RsvpConfirm, App.tsx, NotificationBell, PWAInstallBanner, JoinPreview, Transparency).
  **Do not repoint those variable names at the new palette** until those specific pages
  are being rebranded — it would silently re-theme them.
- `index.html`, `public/manifest.json` — title/meta/OG tags and PWA name/theme-color
  updated to Scribe. The real domain (`app.alkeledger.com`) in the PWA redirect logic was
  **deliberately left unchanged** — that's a DNS/infra decision, not a copy change, even
  though the mockups display `alkescribe.com` / `app.alkescribe.com` as plain text.
- `src/pages/SignIn.tsx` — **fully rebuilt** to match `app-login.html`: dark-ink side
  panel (brand, headline, animated mini-ledger widget, chain-intact footer) + light form
  side. Same arbitrary-hex-value technique as `Landing.tsx`; the ledger-bar SVG mark is
  inlined directly (vellum variant on the ink panel, ink variant for the mobile brand
  row) rather than pulled from `Brand.tsx`/`logo.svg`, since neither offers a
  dark-background variant yet. The mockup shows password + Google/Microsoft SSO fields,
  but the real app is email-OTP-only, no password, no separate signup/verify-without-
  account routes in `App.tsx` — the mockup's password field was dropped rather than added
  as dead UI, and the email→6-digit-code flow was restyled in place instead, including
  the OTP digit boxes and the "Change email"/"Resend code" affordances the real flow
  needs (which the mockup doesn't have, since it assumes password auth). Verified by
  screenshotting both the email step and code step, desktop and mobile widths, via a
  headless Playwright run against the Vite dev server.
- **Google sign-in** — wired for real via Firebase Auth (`GoogleAuthProvider` +
  `signInWithRedirect`/`getRedirectResult` in `src/hooks/useAuth.ts`, plumbed through
  `App.tsx` into `SignIn.tsx`). **Started redirect-only, then switched to popup-first**
  (`signInWithPopup`, redirect only as a fallback for installed/standalone PWA contexts
  or if the popup itself is blocked) after the first live test: redirect looked like it
  worked (bounced to Google, signed in, came back) but never actually logged the user in.
  Root cause — `VITE_FIREBASE_AUTH_DOMAIN` is `bracket-f99ff.firebaseapp.com`, a different
  origin from `localhost`/the app's real domain, and `signInWithRedirect` needs to persist
  state across that cross-origin round trip via third-party storage access, which modern
  Chrome/Safari increasingly block by default — `getRedirectResult` then just silently
  resolves with nothing, no error thrown. `signInWithPopup` doesn't have this failure mode
  (it resolves via `postMessage`, not a storage relay), so it's now the default; redirect
  is kept only for `window.matchMedia('(display-mode: standalone)')` /
  `navigator.standalone` contexts where popups themselves are the unreliable ones. See
  `isStandalonePwa()`/`signInWithSso()` in `useAuth.ts`. Google provider is already
  enabled in the Firebase console, so this works end-to-end now.
- **Microsoft sign-in — deliberately not implemented yet.** It needs an Azure AD /
  Microsoft Entra app registration (application ID + client secret) that the user hasn't
  set up. Don't add a "Continue with Microsoft" button or `signInWithMicrosoft` wiring
  until that's done — it was scoped out on request, not forgotten. When it's ready, mirror
  the Google wiring: `new OAuthProvider('microsoft.com')` through the same
  `signInWithSso()` helper, so it gets the popup-first/redirect-fallback behavior for
  free. The Microsoft console/Azure steps are already captured in this conversation's
  history if needed again.
- `src/components/LedgerMark.tsx` — the ledger-bar SVG mark (previously duplicated inline
  in `SignIn.tsx`) is now a shared component with a `vellum?` prop. `SignIn.tsx` and
  `Sidebar.tsx` both use it.
- **App shell reskinned to dark-ink + sidebar nav regrouped into General/Record/Registry/
  Organization.** This was a "meet the new design halfway" pass: the mockups' three
  headed groups (Record, Registry, Organization) were added on top of the existing
  org-type-specific business features, which now sit as an un-headed **General** block
  above them (membership: Dashboard/Dues/Requests/Votes/Events/Announcements; project:
  Dashboard/Projects/Budgets/Income/Expenses/Approvals — same items as before, just
  regrouped, `ledger`/`members`/`documents` pulled out into Record/Registry).
  - `src/layout/Sidebar.tsx` — rewritten: `PageId` union gained `verify`/`credentials`,
    lost `anchors` (folded into `Ledger.tsx` — see below). Nav is now
    an array of `{label, items}` groups instead of a flat list; reskinned to
    `bg-[#171B21]`/vellum text per `app-dashboard.html`'s `.sidebar`/`.nitem` rules.
    `Members.tsx` ("People") is now linked for project orgs too — it already branches its
    role lists on `org.type` (`MEMBERSHIP_ROLES`/`PROJECT_ROLES`), it just had no nav link
    before. `Transparency.tsx` (previously ungated, project-org-only, not in any mockup)
    was folded into the Organization group — it's admin-gated now, which it wasn't before.
  - `src/pages/Verify.tsx`, `src/pages/Credentials.tsx` (new) — deliberately small, honest
    "coming soon" placeholders, not full features. No new Firestore collections, no fake
    data (the mockups' sample verified-record/credential-card content is illustrative —
    it was **not** ported as if real). Real heading/subhead copy from the mockups was
    reused where it accurately frames the intended capability. Built in the new
    paper/card palette since they're net-new with no legacy styling debt to preserve —
    at the time, `Ledger.tsx`/`Documents.tsx`/`Members.tsx`/`Reports.tsx`/`Anchors.tsx`
    intentionally kept their old-palette styling; `Ledger.tsx` has since been rebuilt
    (see below), the others are still pending.
  - `src/layout/OrgSwitcher.tsx`, `src/layout/TopBar.tsx`, `src/layout/AppShell.tsx` —
    restyled to match (dark org-chip trigger with a light dropdown panel; sticky
    paper/blurred topbar with a wax "New entry" button; paper content background).
  - `src/App.tsx` — `PageContent` switch updated for the new/removed `PageId`s.
  - **Explicit non-goals that pass** (don't assume these were missed): `BottomNav.tsx` —
    untouched, its 4 slots don't need new items since "More" already opens the (now
    grouped, now dark) `Sidebar` drawer on mobile.
- **`Sidebar`'s "Drafts" nav item — added, then removed again.** It originally reused
  `Ledger.tsx` filtered to `status === 'draft' || 'pending'` in `App.tsx` (same
  prop-filter pattern as `income`/`expenses`), but once `Ledger.tsx` got its own status
  filter with `Draft`/`Pending` pills (see below), the dedicated nav item became pure
  redundancy — worse, the reused-but-pre-filtered view still showed the full status
  filter bar including `Approved`/`Rejected`/`Anchored` pills that always yielded zero
  results there, reading as a bug rather than "there's nothing here." Removed the
  `drafts` `PageId`, its `Sidebar.tsx` nav entry, and its `App.tsx` switch case — use
  Ledger's own Draft/Pending filter pills instead. `app-drafts.html` in this folder still
  documents the mockup's *original* idea for a distinct staging/seal-checklist page (not
  just a filtered ledger view) — if that fuller feature gets built later, re-add a nav
  item then, backed by real functionality instead of a filtered re-view.
- **"Exports & proofs" — un-merged. The anchor *action* moved into `Ledger.tsx`'s detail
  panel; `Anchors.tsx` and `Exports.tsx` are deleted; the Organization nav item is back to
  plain "Reports" pointing at the unchanged `Reports.tsx`.** Same overlap reasoning as
  Drafts: `Ledger.tsx` already showed anchor state passively (chips, hash, txHash), so a
  separate page whose main job was re-listing "ready to anchor"/"anchored" entries was
  redundant with Ledger's own Approved/Anchored status filters — the queue *is* just
  `status === 'approved'`. What wasn't redundant was the actual write action (submit to
  Alkebuleum) and the Nuru wallet-connect flow, so that's what got kept, moved into
  `Ledger.tsx`'s detail panel: when a selected entry has `anchorStatus === 'ready'`, the
  panel shows either a "Connect Nuru wallet to anchor" button or (once connected) the
  truncated wallet address + an "Anchor to Alkebuleum" button calling the same `onAnchor`
  prop `Anchors.tsx` used to receive. Reuses `useNuruWallet` and the existing
  `NuruConnectModal` component unchanged — only the surrounding page changed, not the
  wallet machinery itself. Dropped from the old `Anchors.tsx` page (deliberately, not
  fabricated back in some other form): the "Proof, set in stone" marketing hero, the
  stats grid, and the "how it works" mechanism explainer — those are page-level
  educational content that don't fit a per-entry side panel; if a home is needed for that
  copy later, it's a landing/help-content decision, not a functional gap.
- **Registry trimmed to just Credentials; Documents (renamed "Files") and People moved to
  Organization.** User's reasoning: org files aren't anchored/part of the record chain the
  way Registry's other items conceptually are, so they belong with the org's own
  administrative resources instead. Note this is a *different* kind of move than the
  Drafts/Anchors removals — Documents/People aren't redundant with anything, they're
  genuinely distinct data (`Documents.tsx` manages real uploaded files via Firebase
  Storage; `Members.tsx`/People manages the org roster; neither overlaps with
  `LedgerEntry`). This was purely an information-architecture placement call, not a
  duplication fix.
  - `src/layout/Sidebar.tsx`'s `organization` array is no longer wrapped in `isAdmin ?
    [...] : []` at the whole-group level — Files and People must stay visible to every
    member (they were before this move: `Documents.tsx` view access was never
    admin-gated, only upload/delete were, via `can.manage` inside the page itself; People
    similarly needs to stay visible to all members). Only Reports/Transparency/Settings
    are still conditionally appended for admins within that same array. The Organization
    group header is now always rendered (previously conditional on `isAdmin`).
  - `PageId`'s `'documents'` renamed to `'files'` (route changes from `/:slug/documents`
    to `/:slug/files`); still renders the same `Documents.tsx` component — the component
    file, `DocumentRecord` type, and `services/documents.ts` were **not** renamed, since
    those are internal names with no user-facing surface. Also updated
    `Documents.tsx`'s own on-page `<h2>` from "Documents" to "Files" so the page heading
    matches its new nav label — leaving that mismatched would have been the same kind of
    inconsistency this rebrand has been fixing elsewhere.
  - Registry held only Credentials after this move — since superseded, see below: Registry
    was removed entirely once Credentials became a real Ledger sub-item instead of a
    Registry placeholder.
- **`src/pages/Ledger.tsx` — fully rebuilt** to match `app-dashboard.html`'s entry-list +
  detail-panel layout (day-grouped rows, `■ SEALED`/`✓ VERIFIED`/`◦ DRAFT` chips, sticky
  detail panel on `xl:` screens). Still backed by the same real `LedgerEntry` data/props —
  no schema change, no new hooks. Also serves `income`/`expenses` via the existing
  prop-filter reuse pattern in `App.tsx`, so both inherited the new look.
  Deliberate departures from the mockup, all in the direction of not fabricating data:
  - No fake time-of-day or "prev entry" hash-chain pointer — `createdAt` is a date only
    (no time component) and entries aren't cryptographically linked to each other in this
    app's data model (each is anchored individually via `txHash`, not chained). The
    mockup's `hash`/`prev` kv rows and per-entry clock times were mockup flavor, not real
    capabilities — omitted rather than faked.
  - Chip semantics mapped from real status: `draft`/`pending` → dashed `◦ DRAFT`/`◦
    PENDING`; `approved` → `■ SEALED`; `anchored` → `■ SEALED` + `✓ VERIFIED`; `rejected` →
    neutral outline chip (mockup has no rejected-state vocabulary).
  - Detail panel's "Copy hash" button is real (`navigator.clipboard`, same
    copy-with-feedback pattern as `Anchors.tsx`'s wallet-address copy). No "Export proof" /
    "Copy public verify link" buttons — those aren't implemented anywhere yet (`Verify.tsx`
    is still a placeholder), so buttons for them weren't added. No receipt/attachment row
    either — `LedgerEntry.receiptUrl` is hardcoded to the literal string `'mock://receipt'`
    in `NewEntryModal.tsx` even outside mock-data mode (pre-existing gap, not introduced
    here), so it isn't a real openable link; rendering it would be a dead UI element.
  - Merged the old mobile-card/desktop-table dual layout into one responsive row style
    (matches the mockup's approach and is simpler than maintaining two variants).
- **`RecordType` added to the data model** (`src/types/index.ts`) — the mockup's top filter
  is literally `All / Decisions / Transactions / Credentials / Documents / Milestones`,
  which doesn't correspond to anything `LedgerEntry` had (`type` is only
  `income`/`expense`). Initially this was approximated with a category-based filter
  instead (real data, but not what the mockup shows or what was asked for), then
  corrected to add the real field: `LedgerEntry.recordType?: 'decision' | 'transaction' |
  'credential' | 'document' | 'milestone'`, optional so existing/legacy entries (which
  predate the field) don't need a migration — `recordTypeOf(entry)` in `src/lib/format.ts`
  defaults missing values to `'transaction'`, which is accurate since every entry created
  before this change genuinely is a financial transaction. `NewEntryModal.tsx` now has a
  record-type picker; picking anything other than Transaction hides the amount/income-
  expense fields (a decision/credential/document/milestone doesn't inherently have a
  dollar figure — `amount` is stored as `0` and hidden from display rather than faked).
  `Ledger.tsx`'s top filter now uses this field directly; the status filter (draft/
  pending/approved/etc.) stays as a secondary, de-emphasized row underneath since it's
  real, pre-existing workflow functionality the mockup doesn't show but the app needs.
  Verified end-to-end: created a Milestone entry via the modal, confirmed it appears only
  under the "Milestones" filter with amount correctly hidden in both the row and detail
  panel.
  - **Conceptual overlap noted above — since resolved.** See "Ledger sub-items" below:
    Credentials and Documents are no longer a disconnected Registry placeholder/separate
    feature — they're now real filtered views into `LedgerEntry` (`recordType: 'credential'
    | 'document'`), matching the mockup's actual model (Registry items carry `rec #`
    references back into the ledger).

- **Ledger sub-items: Transactions, Credentials, Documents, Decisions — real features, not
  just filter labels.** User's ask: promote 4 of the 5 record types (all but Milestone) to
  sidebar sub-items nested under Ledger, each backed by real functionality instead of a
  generic filtered row list. Scoped down from "all 5 get their own page" after discussion —
  Decisions stayed a plain filtered-`Ledger.tsx` reuse (same pattern as `income`/`expenses`,
  a decision genuinely doesn't need different fields than a generic entry). Credentials
  and Documents got dedicated pages because they need domain-specific fields a generic
  ledger row can't hold. **Transactions started as filtered-`Ledger.tsx` reuse too, then
  got its own dedicated page** (`src/pages/Transactions.tsx`) after the user pointed out it
  was "just showing same as ledger page" — financial entries deserve a financial-page
  treatment (KPI totals, category breakdown, a real table), not the generic multi-record-
  type row layout. See below.
  - **Data model**: `LedgerEntry` gained `holderId`/`holderName`/`expiresAt`/`revokedAt`/
    `revokedBy` (credential lifecycle), `fileHash` (document content hash, separate from
    `hash` which covers the whole canonicalized entry), and `pollId` (decision → poll
    backlink). All optional, same no-migration pattern as `recordType`.
  - **`src/pages/Credentials.tsx`** — full rewrite from the old placeholder. Card grid,
    Active/Expiring-soon/Revoked filter computed from real `expiresAt`/`revokedAt` (not the
    draft→anchored status axis — a credential's lifecycle is genuinely a different axis).
    "Issue credential" opens `NewEntryModal` preset to `credential`, with a holder picker
    (`listMembers`) and optional expiry date. Revoke is real (`revokeEntry` in
    `services/ledger.ts`, admin-gated via `can.manage`).
  - **`src/pages/LedgerDocuments.tsx`** (new file, deliberately not reusing the
    `Documents.tsx` name — that's Organization → Files, a genuinely different feature: general
    org storage that's never anchored, vs. this, which is anchor-capable evidence, e.g. an
    ID card scan). Upload is real: `hashFile()` (new in `src/lib/anchor.ts`, SHA-256 of the
    actual file bytes via `crypto.subtle.digest`, not just the Storage URL) +
    `uploadLedgerDocument()` (new in `services/documents.ts`, own Storage path
    `ledger-documents/{orgId}/...`, own `storage.rules` block reusing the existing
    image/PDF + 10MB constraint from the `receipts/` path). Confirmed with the user:
    documents go through the **same** draft→pending→approved→anchored workflow as
    everything else — no special-cased fast path, so a $50k transaction and an ID card
    need the same sign-off before either can be anchored.
  - **Shared components extracted** from `Ledger.tsx` for reuse across it and
    `LedgerDocuments.tsx`: `src/components/RecordChips.tsx` (draft/pending/sealed/verified
    — Credentials needed a *different* vocabulary, active/expiring/revoked, so it has its
    own inline chip renderer, not this one), `src/components/CopyHashButton.tsx`, and
    `src/components/AnchorAction.tsx` (the wallet-connect/anchor-button block, including
    `useNuruWallet` + `NuruConnectModal` — same component now backs anchoring from both
    `Ledger.tsx` and `LedgerDocuments.tsx`, verified working from both, including a live
    wallet-connect-modal open from `LedgerDocuments`'s detail panel).
  - **Decisions ↔ Votes/Polls link**: confirmed with the user this should be **opt-in**,
    not automatic on every poll close — "anchoring needs signing, so someone has to
    deliberately add the decision to the chain as permanent." `Votes.tsx`'s closed-poll
    cards now show a "Log as decision" action (admin-only, only if votes were cast) that
    computes the winning option (reuses the existing `getOptionCounts()` tally logic, ties
    handled explicitly — "Tied: X / Y" — rather than silently picking one) and creates a
    `recordType: 'decision'` entry with `pollId` set, `status: 'pending'` (same approval
    workflow as everything else). No `Poll` schema change — the winner text is computed
    once and baked into the ledger entry's description, not persisted back onto the poll.
    Guarded against duplicate logging via `pollId` presence check. `Ledger.tsx`'s detail
    panel shows a "View poll →" backlink when `pollId` is set. Verified end-to-end: closed
    a poll with a real tied vote (1-1), logged it, confirmed the tie was captured correctly
    in the decision text, and the poll backlink navigated correctly.
  - **Registry group removed entirely** — it only ever held Credentials, which now lives
    under Ledger. No empty group left behind.
  - **Sidebar collapse/expand added after initial ship**: `Ledger`'s children started as
    always-expanded (simplest option at the time), but the user clarified the intended
    interaction — "transaction is not a ledger dashboard, it's a type of record recorded
    in ledger. click Ledger opens Ledger and its children; click it again and the children
    collapse." `Sidebar.tsx` now tracks an `expanded: Set<PageId>` — clicking a parent
    with children navigates *and* toggles its expand state; a `useEffect` keyed on `page`
    separately auto-expands whichever parent contains the newly-active page (so deep-
    linking straight to `/org/credentials` shows the section open), but doesn't fight a
    manual collapse made while already sitting on that section (the effect only fires on
    actual navigation, not on every render). Chevron rotates to indicate state.
  - **`src/pages/Transactions.tsx` (new)** — built after the sub-items initially shipped,
    once it was clear a filtered `Ledger.tsx` view wasn't earning its own nav item. Filters
    `ledger` to `recordType === 'transaction'` internally (same convention as
    `Credentials.tsx`/`LedgerDocuments.tsx` — receives the full ledger, not a pre-filtered
    slice). Distinct from `Ledger.tsx` in the ways that actually matter for a page whose
    every row is financial: a KPI band (income/expenses/net) and a category breakdown with
    income/expense bars, both computed from **posted** (approved/anchored) entries only and
    labeled as such — draft/pending/rejected amounts are excluded from the totals so the
    numbers aren't misleadingly inflated by unconfirmed entries, same "posted" convention
    `Reports.tsx`'s financial summary already uses (independently re-derived here, not
    extracted into a shared component — `Reports.tsx` is still old-palette styled, so a
    shared component would've meant either duplicating styles or reskinning Reports.tsx as
    a side effect, neither of which was asked for). A real `<table>` (Date/Description/
    Category/Amount/Status columns) replaces `Ledger.tsx`'s day-grouped card-row layout —
    appropriate here since every row has the same shape, unlike the generic Ledger view
    which has to accommodate credentials/documents/decisions too. Drops the record-type
    filter row entirely (redundant — everything on this page already is a transaction) in
    favor of a category filter chip row, freed up since record-type filtering isn't needed.
    Detail panel, `CopyHashButton`, and `AnchorAction` reused unchanged from `Ledger.tsx`.
  - **`RecordType`'s `'milestone'` value removed entirely** — user call: "not needed now
    from ledger." It was always the one record type with no dedicated page/sidebar item
    (a plain filter-tab-only value from the start), so removal was clean: dropped from the
    `RecordType` union (`src/types/index.ts`), `RECORD_TYPES`/`RECORD_TYPE_LABELS`
    (`src/lib/format.ts`) — which automatically shrinks both `Ledger.tsx`'s filter row and
    `NewEntryModal.tsx`'s record-type picker to 4 options, no per-page edits needed. Also
    removed the "Milestones" row + "and milestones" copy from `Landing.tsx`'s marketing
    "what you can record" section — leaving it in would have had the landing page
    overclaiming a record type the product no longer actually supports.
  - **`NewEntryModal.tsx`'s record-type picker no longer offers "Decision."** User's
    reasoning: a decision created there would just be free text with no `pollId` — the
    *only* legitimate way a decision should come into existence is `Votes.tsx`'s "Log as
    decision" action after closing a poll (which properly links a real vote). `'decision'`
    stays a valid `RecordType` (still filterable/browsable in `Ledger.tsx`/
    `Transactions.tsx`, and `Votes.tsx` still creates entries with it) — it's just not one
    of the buttons in the manual-entry picker anymore. New local `MANUAL_RECORD_TYPES`
    constant in `NewEntryModal.tsx` (`RECORD_TYPES` filtered to drop `'decision'`) rather
    than touching the shared `RECORD_TYPES` export, since Ledger/Transactions' filter rows
    still need the full list.
  - **"Votes" renamed to "Proposals" — container concept only, not the mechanics.** User's
    reasoning: "Proposals" fits Scribe's governance vocabulary (Decisions, Sealed, Ledger)
    better than the more casual "Polls," and now that closing one can produce a permanent
    Decision record, "proposal → vote → decision" is a real pipeline. Scoped deliberately:
    renamed the *container* (nav label, page heading, route, "New proposal"/"Edit
    proposal", "Closed proposals", Dashboard's "Active proposals"/"N proposals need your
    response" widgets, the `Ledger.tsx` poll-backlink button text) but left the *mechanics*
    alone — "cast a vote," per-option "N votes" tallies, "Show voters," the `Poll`/
    `PollVote`/`PollStatus` types, `services/votes.ts`, and the `Votes` component/file name
    are all untouched, since those still accurately describe the actual interaction.
    `PageId`'s `'votes'` renamed to `'proposals'` (route now `/:slug/proposals`, same
    treatment as the earlier Documents→Files rename) — updated everywhere that routed to
    it: `Sidebar.tsx`, `App.tsx`'s switch + `unreadCounts` key, `Dashboard.tsx`'s three
    proposal-related links/widgets, `Ledger.tsx`'s poll backlink, and `SignIn.tsx`'s
    pending-redirect-context path matcher (shows "Sign in to cast your vote" when
    redirected from a proposal link). `NotifType`'s `'poll'` value intentionally left
    alone — internal identifier, not user-facing text.

## What's NOT done yet (next steps)

- `src/pages/Dashboard.tsx`, `Documents.tsx` (Files), `Members.tsx`, `Reports.tsx`,
  `Settings.tsx` are still on their original (old-palette) styling. `Ledger.tsx`,
  `Credentials.tsx`, and `LedgerDocuments.tsx` are done (see above) — reference
  implementations for how to port the rest, same as `Landing.tsx`/`SignIn.tsx` were for the
  pages before them.
- `Verify.tsx` is still a placeholder — no real hash-lookup tool. Once it's real, revisit
  whether Credentials/Documents should link to it (e.g. "copy public check link"), which
  was deliberately left out everywhere so far since there's nowhere for that link to go yet.
- Once more of the reused pages get individually rebranded, revisit whether the old CSS
  variables in `src/index.css` (`--ink #0E1015`, `--bone`, etc.) should finally be
  repointed at the new palette — most consumers still haven't migrated.
