# Copilot Instructions — VisionGuard CRM (Production)

## Project Overview
Production CRM web app migrated from a single-file React demo (`crm-app.jsx`) into a full-stack architecture.

## Tech Stack
- **Framework**: Next.js 15 (App Router, TypeScript, React Server Components)
- **Styling**: Tailwind CSS v4
- **Database**: Cloudflare D1 (SQLite) accessed via Drizzle ORM
- **Auth**: Supabase Auth (session cookies, httpOnly, Secure, SameSite)
- **Validation**: Zod (shared between client/server)
- **Deployment**: Cloudflare Pages via `@opennextjs/cloudflare`
- **Testing**: Vitest (unit), Playwright (E2E)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry
- **Logging**: Structured (pino-style)

## Architecture
- `src/app/` — Next.js App Router pages and API routes
- `src/lib/db/` — Drizzle schema, migrations, client
- `src/lib/auth/` — Supabase server/client helpers, middleware, RBAC
- `src/lib/validation/` — Zod schemas (shared)
- `src/components/` — React UI components (split from original single file)
- `src/server/` — Server-only business logic / services
- `tests/` — Vitest unit + Playwright E2E
- `.github/workflows/` — CI/CD

## Coding Conventions
- TypeScript strict mode; no `any` without justification
- Server actions / API routes enforce RBAC on every request (never trust client)
- All DB queries parameterized via Drizzle (no raw SQL string interpolation)
- Every record carries `organizationId` for multi-tenant isolation
- Foreign keys with cascade rules for referential integrity
- Use `crypto.randomUUID()` for IDs (not `Math.random()`)
- Money stored as integer cents; format only at display layer
- Dates stored as ISO 8601 strings (UTC)

## Build & Run Commands
- `pnpm dev` — local dev (Next.js + Miniflare for D1)
- `pnpm build` — production build
- `pnpm test` — Vitest unit tests
- `pnpm test:e2e` — Playwright E2E
- `pnpm lint` — ESLint
- `pnpm db:migrate` — apply Drizzle migrations to D1
- `pnpm db:generate` — generate migrations from schema changes

## Environment Variables (see `.env.example`)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `D1_DATABASE_ID`, `D1_DATABASE_BINDING` (Cloudflare)
- `SENTRY_DSN`
