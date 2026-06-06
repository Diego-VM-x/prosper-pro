# Prosper Pro — Agent Guide

> **Last updated:** 2026-06-05  
> **Branch:** `test-deploy`  
> **Version:** v0.8.10 BETA

---

> **⚠️ IMPORTANTE:** Antes de cualquier tarea, lee primero `CONTEXT.md` para estar al tanto de los cambios recientes y el estado actual del proyecto.

---

## 1. Project Overview

**Prosper Pro** is a Spanish-language personal finance dashboard and financial education platform. It helps users track accounts, transactions, savings goals, recurring payments, and shared financial plans. The app features a gamified experience (XP, levels, achievements — partially removed from web), multi-currency support (USD / Venezuelan Bolívares), OCR receipt parsing for Venezuelan bank transfers (VEPay), and a PWA-enabled offline experience.

The project lives inside the `web/` directory of the repository. All work should happen there.

### Key Facts
- **Language:** Spanish UI; all user-facing text is in Spanish.
- **Data:** No demo data. The app starts blank and all user data comes from Firebase Firestore.
- **Auth:** Firebase Auth (Google Sign-In + email/password).
- **Deployment target:** Vercel (static export).

---

## 2. Technology Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Framework | Next.js (App Router) | 16.2.1 |
| React | React / React DOM | 19.2.4 |
| Language | TypeScript | ^5 |
| Bundler | Turbopack (dev) | Configured in `next.config.ts` |
| Styling | **Vanilla CSS only** | No Tailwind, no CSS-in-JS. Migrated away from `styled-jsx`. |
| Backend / DB | Firebase (Firestore + Auth) | ^12.11.0 |
| Admin SDK | firebase-admin | ^13.10.0 |
| Charts | Recharts | ^3.8.1 (lazy-loaded) |
| Themes | next-themes | ^0.4.6 (light / dark / amoled) |
| OCR | tesseract.js | ^7.0.0 (client-side) |
| Linting | ESLint 9 | `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` |

### Important Dependencies (NOT present)
- No testing framework (Jest, Vitest, Playwright, Cypress).
- No state management library (Redux, Zustand) — React Context only.
- No Tailwind CSS.
- No Ably (removed; was never used).

---

## 3. Project Structure

```
web/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page (marketing)
│   ├── layout.tsx                # Root layout with all providers
│   ├── globals.css               # Design tokens, themes, layout, base styles (~2,440 lines)
│   ├── animations.css            # Keyframes, scroll animations, micro-interactions
│   ├── landing.css               # Landing page styles
│   ├── dashboard.css             # Dashboard-specific styles
│   ├── login/page.tsx            # Authentication (email + Google)
│   ├── register/page.tsx         # User registration
│   ├── dashboard/page.tsx        # Dashboard shell (ProtectedRoute + Dashboard)
│   ├── metas/page.tsx            # Financial goals & plans (~1,223 lines)
│   ├── finanzas/page.tsx         # Full finance management (~2,194 lines)
│   ├── calendario/page.tsx       # Calendar with reminders & plans
│   ├── configuracion/page.tsx    # Settings (~1,683 lines)
│   ├── cursos/page.tsx           # Course listing
│   ├── cursos/[id]/page.tsx      # Course detail
│   ├── ayuda/page.tsx            # Help center
│   ├── ayuda/notas-version/page.tsx # Version notes
│   └── components/               # Shared React components
│       ├── Dashboard.tsx         # Main dashboard UI (~950 lines)
│       ├── Topbar.tsx            # Header with search, notifications, theme (~1,290 lines)
│       ├── Sidebar.tsx           # Navigation sidebar
│       ├── DashboardLayout.tsx   # Layout wrapper (sidebar + topbar + content)
│       ├── FinancialStatusChart.tsx # Recharts-based charts (lazy-loaded)
│       ├── LineChart.tsx         # Custom line chart
│       ├── Toast.tsx             # Toast notification system
│       ├── UpdateModal.tsx       # App update changelog modal
│       ├── ErrorBoundary.tsx     # React error boundary
│       ├── ProtectedRoute.tsx    # Auth guard
│       ├── ThemeProvider.tsx     # Theme context (light/dark/amoled)
│       ├── AnimatedSection.tsx   # Scroll animation wrapper
│       ├── CustomSelect.tsx      # Custom dropdown component
│       └── icons.tsx             # SVG icon library (~437 lines)
├── lib/                          # Business logic, contexts, Firestore layer
│   ├── contexts/
│   │   ├── AuthContext.tsx       # Firebase auth, token persistence, account deletion
│   │   ├── CurrencyContext.tsx   # Multi-currency (USD/BS), BCV rate from DolarAPI
│   │   ├── GoalsContext.tsx      # Goals, plans, reminders state management
│   │   └── SearchContext.tsx     # Global search query
│   ├── firestore/
│   │   ├── accounts.ts           # Account CRUD, balance recalculation, data wiping
│   │   ├── transactions.ts       # Transaction CRUD, weekly data, monthly summaries
│   │   ├── goals.ts              # Goal CRUD
│   │   ├── plans.ts              # Financial plan CRUD
│   │   ├── reminders.ts          # Reminder CRUD
│   │   ├── recurring.ts          # Recurring payments
│   │   ├── notifications.ts      # Push/browser notifications
│   │   ├── users.ts              # User profile CRUD
│   │   ├── courses.ts            # Course data
│   │   ├── feedback.ts           # Bug reports & feedback
│   │   └── requests.ts           # Expense requests between users
│   ├── hooks/
│   │   └── useFirestoreCache.ts  # In-memory Firestore data cache
│   ├── firebase.ts               # Firebase initialization with env validation
│   ├── firebase-auth-rest.ts     # REST auth fallback
│   ├── currency.ts               # Currency conversion & formatting
│   ├── csvParser.ts              # CSV import for transactions
│   ├── vepay.ts                  # VEPay OCR receipt parser client
│   ├── vepay-core.ts             # VEPay text parsing engine
│   └── seed.ts                   # Empty (no seed data)
├── public/                       # Static assets
│   ├── logo-full.png
│   ├── logo-icon.png
│   └── sw.js                     # Service Worker for PWA caching
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── firebase.json                 # Points to firestore.rules
├── firestore.rules               # Security rules (ownerId-based isolation)
├── .env.local                    # Firebase config vars (NEXT_PUBLIC_*)
└── README.md                     # Changelog in Spanish
```

### Deleted / Missing Files (exist in git history, removed from working tree)
- `types/index.ts` — **351 lines of shared TypeScript types** imported extensively via `@/types`. **This will cause build failures.**
- `src/services/pushNativeService.ts` — Imported in `AuthContext.tsx` inside a try/catch (non-fatal).
- `capacitor.config.ts` — Capacitor mobile app config.
- `AGENTS.md`, `CONTEXT.md`, `TASK_PLAN.md`, `BUGS.md` — Previous project docs.
- `design/` — UI/UX design assets and HTML prototypes.
- `.agent/skills/` — Multiple agent skills.

---

## 4. Build, Dev & Lint Commands

All commands run from the `web/` directory:

```bash
# Development (Turbopack)
npm run dev

# Production build (static export)
npm run build

# Start production server (after build)
npm run start

# Linting
npm run lint
```

### Build Behavior
- `output: "export"` in `next.config.ts` → generates a static site (no SSR).
- `images.unoptimized: true` is required for static export.
- `serverExternalPackages: ["tesseract.js"]` — tesseract is externalized.
- Build output goes to `out/` or `dist/` (verify `next.config.ts` if changed).

### Environment Variables Required (`.env.local`)
All are `NEXT_PUBLIC_*` (exposed to browser):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_ABLY_API_KEY`

---

## 5. Code Style & Conventions

### Styling — Vanilla CSS Only
- **NO Tailwind CSS.** Do not introduce Tailwind or any CSS-in-JS library.
- Design tokens are CSS custom properties in `globals.css` under `:root`, `[data-theme="dark"]`, and `[data-theme="amoled"]`.
- Brand colors: `--color-prosper-green: #3DCC8E`, `--color-prosper-navy: #1E3A6E`.
- Semantic tokens: `--bg-primary`, `--text-primary`, `--border-default`, etc.
- Responsive breakpoints: 1024px (tablet), 768px, 480px.
- Typography uses `clamp()` for fluid scaling.
- Dark mode uses `data-theme` attribute on `<html>`; no class-based theming.

### Component Patterns
- **Client components** must include `'use client'` at the top when using hooks, browser APIs, or event handlers.
- **Path alias:** `@/*` maps to the project root (`tsconfig.json`).
- **Protected routes:** Wrap pages with `<ProtectedRoute>` (see `app/dashboard/page.tsx`).
- **Error boundaries:** `ErrorBoundary` component wraps the app in `layout.tsx`.
- **Suspense:** Used in root layout with a `LoadingSkeleton` fallback.

### State Management
- All global state uses **React Context** (Auth, Currency, Goals, Search, Theme).
- Firestore real-time subscriptions via `onSnapshot` are the single source of truth.
- No Redux, no Zustand.

### Data Patterns
- All user-scoped data uses `ownerId` field (Firestore rules enforce this).
- `createdAt` / `updatedAt` timestamps on all entities.
- Soft delete via `archived: true` flag for transactions.
- Currency is stored per-account; conversion happens at display time.

### File Size Warning
Several files are very large and are candidates for refactoring:
- `app/finanzas/page.tsx` (~2,194 lines)
- `app/configuracion/page.tsx` (~1,683 lines)
- `app/metas/page.tsx` (~1,223 lines)
- `app/components/Topbar.tsx` (~1,290 lines)

When modifying these, prefer **partial edits** (search-and-replace) rather than rewriting the entire file.

---

## 6. Testing

- **No test framework is configured.** There are no unit tests, integration tests, or E2E tests.
- If you add tests, choose a lightweight framework (the target machine is low-resource: i3/4GB RAM).

---

## 7. Deployment & Firebase

### Vercel (Primary)
- Static export is the deployment mode.
- Canonical URL: `https://prosper-pro.vercel.app`.
- Security headers must be configured in the Vercel dashboard (not in `next.config.ts` because `headers()` is unsupported with `output: 'export'`).

### Firebase
- `firebase.json` points to `firestore.rules`.
- Firestore security rules enforce `ownerId`-based isolation for all collections.
- `plans` collection supports shared access via `sharedWith` array.
- `expense_requests` allows both sender and receiver to update.

### PWA
- `public/sw.js` is a custom service worker that caches core routes for offline use.
- It is registered inline in `layout.tsx` via a `<script>` tag.
- Cached routes: `/`, `/dashboard`, `/metas`, `/finanzas`, `/configuracion`, `/calendario`, `/cursos`, `/ayuda`, `/login`, `/register`.

---

## 8. Security Considerations

- All Firebase config variables are `NEXT_PUBLIC_*` and exposed to the client. This is standard for Firebase client SDKs; security is enforced by Firestore rules, not config secrecy.
- Firestore rules strictly validate `ownerId` on create/update/delete. Never bypass this pattern.
- The `AuthContext` includes `deleteAccount()` and `wipeAllData()` functions that permanently delete all user data across collections.
- `sessionStorage` is polyfilled for environments where it is unavailable (e.g., private browsing with restrictions).

---

## 9. Notable Features & Business Logic

### Multi-Currency (USD / BS)
- Exchange rate comes from `ve.dolarapi.com` (BCV official rate) via an internal API route.
- `CurrencyContext` manages live rates and manual overrides.
- `lib/currency.ts` handles conversion and formatting.
- Accounts have a native `currency` field; transfers between different currencies auto-convert.

### VEPay OCR
- `lib/vepay.ts` uses `tesseract.js` (client-side) to extract text from Venezuelan banking receipt screenshots.
- `lib/vepay-core.ts` parses the extracted text into structured payment data.
- Supports 20+ Venezuelan banks.

### Shared Financial Plans
- `FinancialPlan` has `sharedWith` (array of UIDs) and `shareAmount`.
- `ExpenseRequest` allows users to invite others and split costs.
- Firestore rules allow shared users to update plans they are invited to.

### Gamification (Legacy)
- XP, levels, and achievements code exists but the Community and Achievements sections were removed from the web UI.
- Backup code is in `_backup_comunidad_logros/` (excluded from TypeScript).

---

## 10. Known Issues & Warnings

1. **Missing `types/index.ts`** — The file was deleted from the working tree but is imported throughout the codebase (`@/types`). It exists in git history. **This will cause TypeScript build failures until restored.**
2. **Missing `src/services/pushNativeService.ts`** — Imported in `AuthContext.tsx` but wrapped in try/catch (non-fatal).
3. **Git working tree is dirty** — Many files were deleted but not committed. The current branch is `test-deploy`.
4. **No test suite** — Any changes should be manually verified via `npm run build` and local testing.
5. **Large page files** — Several pages exceed 1,000 lines. Be cautious when editing; use partial replacements.

---

## 11. Agent Workflow Tips

- **Read before asking:** Check this file and the target file(s) before requesting clarification.
- **Partial edits preferred:** For files over 300 lines, use search-and-replace or indicate exact line changes rather than rewriting the whole file.
- **Confirm large tasks:** If a task will likely consume more than ~50k tokens, warn the user first.
- **Avoid heavy dependencies:** The target machine is low-resource (i3/4GB RAM). Do not install large packages unless absolutely necessary.
- **Build check:** After significant changes, run `npm run build` to verify static export still works.
- **Spanish UI:** All user-facing strings must remain in Spanish.
