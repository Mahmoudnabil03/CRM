# VisionGuard CRM

A full-stack CRM scaffold using Next.js, Cloudflare D1, Supabase Auth, and Drizzle ORM.

## What is included

- Next.js 15 App Router project
- Supabase Auth client integration
- Cloudflare D1-compatible Drizzle schema
- Basic API routes for contacts, deals, tasks, emails, and users
- UI scaffold with navigation and authentication gate
- Shared Zod validation schemas

## Getting started

1. Copy `.env.example` to `.env.local` and populate your Supabase credentials.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Seed the admin user in Supabase Auth:
   ```bash
   pnpm run seed:admin
   ```
4. Run the dev server:
   ```bash
   pnpm dev
   ```

## Next steps

- Migrate the existing `crm.jsx` UI into the `src/components` hierarchy.
- Replace the placeholder section views with data-driven components.
- Add server-side RBAC and authorization checks.
- Add database migrations and deploy the D1 binding.

## Scripts

- `pnpm dev` — start Next.js development server
- `pnpm build` — build for production
- `pnpm lint` — run ESLint
- `pnpm test` — run Vitest
- `pnpm test:e2e` — run Playwright
- `pnpm db:migrate` — run Drizzle migrations

## Optional: Supabase Agent Skills

For improved Supabase tooling, install the optional agent skills:

```bash
npx skills add supabase/agent-skills
```

This adds Supabase-specific guidance and scripts to your local AI tooling.
