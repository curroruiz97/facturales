# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start Vite dev server at http://localhost:5173
npm run tailwind:dev     # Watch & compile Tailwind CSS (run in parallel with dev)

# Production build
npm run tailwind:build   # Compile Tailwind CSS
npm run build            # Build with Vite (outputs to dist/)
npm run preview          # Preview production build

# Database (Supabase CLI required)
supabase start           # Start local Supabase (port 54321 API, 54323 Studio)
supabase db push         # Push migrations to remote
supabase db reset        # Reset local DB and apply all migrations + seed
supabase functions serve # Serve Edge Functions locally
```

> Both `npm run dev` and `npm run tailwind:dev` should run simultaneously during development: Vite serves the pages while Tailwind watches for CSS changes.

## Environment Setup

Create `.env` in project root (not committed to git):
```
VITE_SUPABASE_URL=https://nukslmpdwjqlepacukul.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase Dashboard → Settings → API>
```

Note: `supabaseClient.js` currently has credentials hardcoded as a fallback. The `.env` approach is the intended pattern for Vite builds.

## Architecture Overview

**Facturales** is a Spanish-language invoicing SaaS (multi-page HTML app) with Supabase for auth/database and Stripe for billing.

### Tech Stack
- **Frontend**: Vanilla HTML + Tailwind CSS v3 + vanilla JS (no framework)
- **Bundler**: Vite (multi-page mode — every `.html` file is an entry point)
- **Backend**: Supabase (Auth, Postgres, RLS, Storage, Edge Functions)
- **Payments**: Stripe (subscriptions via Supabase Edge Functions)
- **CSS**: Tailwind input at `input.css` → compiled to `assets/css/output.css`

### Page Structure
All pages are `.html` files in the root or `invoices/` and `billing/` subfolders. Vite's `build.rollupOptions.input` enumerates them all explicitly in `vite.config.js`.

Protected pages require two guard scripts loaded via `<script>` tags:
1. `assets/js/auth-guard.js` — redirects to `signin.html` if not authenticated
2. `assets/js/subscription-guard.js` — redirects to `subscribe.html` if no active subscription

Public pages (no guards): `signin.html`, `signup.html`, `verify-email.html`, `confirm-email.html`, `subscribe.html`, `billing/success.html`, `billing/cancel.html`.

### JS Module Pattern
There is **no ES module bundling** of app code — all JS files in `assets/js/` are loaded as `<script>` tags and expose their API via `window.*` globals. The Supabase CDN library is loaded before `supabaseClient.js`, which sets `window.supabaseClient`.

Key globals:
- `window.supabaseClient` — initialized Supabase client (`supabaseClient.js`)
- `window.supabaseAuthReady` — Promise that resolves after initial auth session loads
- `window.signIn/signUp/signOut/getCurrentUser/checkAuth` — auth functions (`auth.js`)
- `window.authGuard` — auth guard methods (`auth-guard.js`)
- `window.getClients/createClient/updateClient/deleteClient` — client CRUD (`clients.js`)

### Layout Components
Sidebar and header are shared HTML fragments in `components/`:
- `components/sidebar.html`
- `components/header-unified.html`

`assets/js/load-components.js` fetches these via `fetch()` and injects them into `#sidebar-container` and `#header-container` elements on every protected page. It fires a `componentsLoaded` CustomEvent when done; page-specific JS that depends on the header/sidebar should listen for this event.

### Database Schema (Supabase)
All tables use RLS with `user_id` isolation. Key tables:
- `clientes` — client contacts (CIF/NIF, email, phone, address)
- `business_info` — user's company data (used to autofill invoice sender)
- `invoices` — issued invoices with line items (JSONB)
- `quotes` — presupuestos (same structure as invoices)
- `transacciones` — income/expense transactions
- `productos` — product/service catalog
- `invoice_series` — invoice numbering series per user
- `billing_subscriptions` — Stripe subscription records
- `user_progress` — onboarding completion tracking
- `fiscal_is_settings` — quarterly fiscal settings (IRPF, IVA)
- `support_tickets` — support ticket submissions

Migrations live in `supabase/migrations/` and must be applied in timestamp order.

### Edge Functions (Supabase/Deno)
Located in `supabase/functions/`, each is a standalone Deno function:
- `create-checkout-session` / `create-portal-session` — Stripe billing flows
- `stripe-webhook` — handles Stripe events, updates `billing_subscriptions`
- `update-subscription` / `cancel-subscription` / `reactivate-subscription` / `preview-proration`
- `get-payment-method` / `update-payment-method`
- `send-document-email` — emails invoices/quotes to clients
- `send-support-ticket` — forwards support tickets
- `analyze-expense-document` — OCR for expense scanning

### PDF Generation
`assets/js/invoice-pdf-generator.js` and `assets/js/quote-pdf-generator.js` use **jsPDF** (loaded from CDN) to generate multi-page PDFs client-side. Brand color and logo are read from `localStorage` (cached from `business_info`).

### Tailwind Configuration
`tailwind.config.js` remaps colors for the brand:
- `success-*` = **orange** (`#ec8228`) — the primary brand color (not green!)
- `ok-*` = green (for actual success states)
- `primary` = `#ec8228`
- Dark mode: class-based (`darkMode: "class"`)
- Custom fonts: `font-urbanist` and `font-poppins`

### Subscription/Plan Guard
`subscription-guard.js` runs on all protected pages (except `settings.html` and billing pages). It checks `billing_subscriptions` for `status IN ('trialing', 'active')` or a grace period on `cancel_at_period_end`. Users without a valid subscription are redirected to `subscribe.html`.

### Sanitization
`assets/js/sanitize.js` provides `window.sanitizeHTML()` — use this when rendering user-supplied content into the DOM to prevent XSS.
