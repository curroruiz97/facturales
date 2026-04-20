# AGENTS.md

This repository is now a **React + TypeScript SPA** (Vite), with clean canonical URLs and no business `.html` pages.

## Commands

```bash
# Development
npm run dev              # Vite dev server (http://localhost:5173)
npm run tailwind:dev     # Tailwind watch output.css

# Quality gates
npm run typecheck        # TypeScript strict check
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright E2E (routes + redirects)

# Build
npm run build            # Vite production build to dist/
npx vite build --outDir .tmp-dist --emptyOutDir true  # temp build validation
npm run preview          # Preview production build
```

## Environment

Create `.env` in project root:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Runtime is env-only for Supabase (no hardcoded fallback keys).

## Architecture overview

- Frontend: React 19 + TypeScript
- Routing: `react-router-dom` with canonical routes:
  - Core: `/dashboard`, `/productos`, `/contactos`, `/transacciones`, `/presupuestos`, `/facturas`, `/ocr`, `/soporte`, `/ajustes`, `/integraciones`, `/fiscal`
  - Auth/Billing: `/signin`, `/signup`, `/verify-email`, `/confirm-email`, `/reset-password`, `/complete-profile`, `/subscribe`, `/billing/success`, `/billing/cancel`
  - Legal: `/aviso-legal`, `/condiciones-legales`, `/politica-de-cookies`, `/politica-de-privacidad`
- Compatibility: legacy `.html` routes are mapped via:
  - `vercel.json` (301 redirects)
  - `src/app/routing/route-metadata.ts` (client alias normalization)
- Entry point: `index.html` (technical only) + `src/main.tsx`

## Key folders

- `src/app`: shell, routing, providers, public pages
- `src/features`: business domains (dashboard/products/contacts/transactions/quotes/invoices/ocr/support)
- `src/services`: auth, billing-limits, onboarding, repositories, supabase, support, ocr, subscription
- `src/domain`: shared domain rules
- `src/shared`: shared types/contracts
- `docs/migration`: roadmap, ADRs, phase logs/checklists
- `supabase/functions`: Stripe/billing/support/OCR edge functions

## Deployment / routing

- Vercel config in `vercel.json`:
  - Explicit permanent redirects from legacy `.html` and `pilot-*`
  - SPA rewrite to `index.html` for extensionless paths

## Security notes

- `npm audit` currently reports one high severity vulnerability in `xlsx` (no upstream fix available). Keep documented acceptance and mitigation.
