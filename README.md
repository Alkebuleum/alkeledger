# AlkeLedger

A blockchain-anchored ledger and project accounting platform for any organization — associations, nonprofits, foundations, councils, DAOs, and more.

> **A modern ledger, accounting, and records platform with blockchain-backed proof.**

---

## What this is

AlkeLedger is a workspace for keeping organizational financial records with cryptographic proof of integrity. Approved records are hashed (SHA-256) and the hash is anchored to the Alkebuleum blockchain. The private record stays in your workspace; only the proof becomes public.

Two organization types are supported out of the box:

- **Membership** — associations, professional societies, alumni groups, councils, unions, chambers
- **Project / Nonprofit** — NGOs, foundations, grant-funded programs, public agencies

The workspace adapts (navigation, dashboard, terminology) based on org type.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template (mock mode is enabled by default)
cp .env.example .env.local

# 3. Run dev server
npm run dev
```

Open http://localhost:5173. The app runs entirely on **mock data** by default — you can tour both org types (Riverkeep Foundation / Meridian Architects Guild) without needing Firebase.

### Connecting to Firebase

When you're ready to wire up persistence:

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Authentication**, **Firestore**, and **Storage**
3. Copy your config keys into `.env.local`:

   ```bash
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_USE_MOCK_DATA=false
   ```

4. Deploy security rules:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add  # select your project
   firebase deploy --only firestore:rules,firestore:indexes,storage:rules
   ```

5. The `services/` layer auto-detects the Firebase config and switches off mocks.

---

## Project structure

```
src/
├── main.tsx              Entry point
├── App.tsx               Root component + page router
├── index.css             Tailwind + design system
│
├── types/                Domain types (Organization, LedgerEntry, …)
│   ├── index.ts
│   └── firestore.ts      Firestore Timestamp converters
│
├── lib/
│   ├── firebase.ts       Firebase init (skipped in mock mode)
│   ├── format.ts         fmt(), statusStyles
│   └── anchor.ts         SHA-256 hashing + chain submission
│
├── services/             All data access (mock-mode aware)
│   ├── organizations.ts
│   ├── ledger.ts         ⭐ heart of the app
│   ├── members.ts
│   ├── projects.ts
│   ├── documents.ts
│   ├── announcements.ts
│   ├── requests.ts
│   └── audit.ts
│
├── hooks/
│   ├── useAuth.ts        Stage 3: wire to Firebase Auth
│   ├── useOrg.ts         Current org + switcher
│   ├── useLedger.ts      Live ledger subscription
│   └── useRole.ts        Role-based permissions
│
├── data/
│   └── mock.ts           In-memory fallback data
│
├── components/           Shared UI primitives
│   ├── StatusPill.tsx
│   ├── Brand.tsx
│   ├── KPI.tsx
│   ├── Panel.tsx
│   └── Row.tsx
│
├── layout/
│   ├── AppShell.tsx      Sidebar + topbar wrapper
│   ├── Sidebar.tsx       Adaptive nav (changes by org type)
│   ├── TopBar.tsx
│   └── OrgSwitcher.tsx
│
├── pages/                One file per route
│   ├── Landing.tsx       Editorial 5-section landing
│   ├── OrgSetup.tsx      3-step wizard
│   ├── Dashboard.tsx
│   ├── Ledger.tsx
│   ├── Members.tsx       (membership orgs)
│   ├── Dues.tsx          (membership orgs)
│   ├── Announcements.tsx (membership orgs)
│   ├── Requests.tsx      (membership orgs)
│   ├── Projects.tsx      (project orgs)
│   ├── Budgets.tsx       (project orgs)
│   ├── Approvals.tsx
│   ├── Documents.tsx
│   ├── Reports.tsx
│   ├── Transparency.tsx  (project orgs · public)
│   ├── Anchors.tsx       Proof & anchoring
│   └── Settings.tsx
│
└── modals/
    └── NewEntryModal.tsx Add a ledger entry
```

---

## Integration points

Every Firebase / blockchain integration site is marked with `🔌 FIREBASE` or `🔌 CHAIN` comments in the code. The relevant files:

- **Firestore reads/writes** → `src/services/*.ts`
- **Authentication** → `src/hooks/useAuth.ts`
- **Role-based access** → `src/hooks/useRole.ts` + `firestore.rules`
- **Receipt / document uploads** → `src/services/documents.ts` (Firebase Storage)
- **Hashing & anchoring** → `src/lib/anchor.ts`

---

## Deploying to Firebase Hosting

The project is linked to the `bracket-f99ff` Firebase project (display name: **peerGov**) via `.firebaserc`.

### Prerequisites

```bash
npm install -g firebase-tools
firebase login
```

### Build and deploy (hosting only)

```bash
npm run build
firebase deploy --only hosting
```

Live URL: **https://bracket-f99ff.web.app**

### Deploy everything (hosting + functions + rules)

```bash
npm run build
firebase deploy
```

### Deploy rules/indexes only (no rebuild needed)

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

### Deploy Cloud Functions only

```bash
firebase deploy --only functions
```

> **Note for AI assistants:** The `.firebaserc` at the repo root already points to `bracket-f99ff`. You do not need to run `firebase use --add`. Just build and deploy.

---

## Roadmap

This codebase covers MVP Stages 1–4 (structure, schema, role layer, ledger workflow) with stubs ready for Stages 5–6:

- **Stage 1** ✅ Product structure, data model, pages, mock UI
- **Stage 2** ✅ Firebase scaffolding (init, rules, converters) — fill in service calls
- **Stage 3** ✅ Role-based access (rules + helpers in place)
- **Stage 4** ✅ Ledger creation, approval, audit trail (mock path works end-to-end)
- **Stage 5** ⚙️ Blockchain anchoring (mock; swap `submitAnchor` in `lib/anchor.ts`)
- **Stage 6** ⚙️ Reports + public transparency page (UI done; persistence TBD)

---

## Tech stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** with custom design tokens (ink / bone / paper / ledger-red palette)
- **Firebase** (Auth + Firestore + Storage)
- **Lucide** icons
- **Fraunces** (display serif) + **Newsreader** (editorial serif) + **JetBrains Mono**

---

## Design

The app uses an editorial financial-journal aesthetic — newspaper masthead, ledger-rule paper, italic serif emphasis. Not a crypto dashboard; an instrument of record.

License: MIT (or your choice).
