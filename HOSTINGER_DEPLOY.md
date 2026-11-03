# Hostinger deployment guide (Node 22)

DMA Academy LMS — deploy-ready package pinned to **Node.js 22**.

## Requirements
- Node.js **22** (set in Hostinger Node.js panel and via `.nvmrc`)
- npm ≥ 10
- Supabase PostgreSQL project
- Environment variables listed below (set in Hostinger panel — never commit `.env`)

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Supabase **pooled** URL (port **6543**, `pgbouncer=true`) |
| `DIRECT_URL` | Yes (migrations) | Supabase **session pooler** URL — same pooler host, port **5432** |
| `JWT_SECRET` | Yes | Random string ≥ 32 or 64 characters |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Yes (first seed) | Initial admin |
| `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` | Yes (first seed) | Initial super-admin |
| `PORT` | Optional | Default `5000`; Hostinger often sets this |
| `NODE_ENV` | Recommended | `production` |
| `FRONTEND_URL` | Recommended | Your live site URL (e.g. `https://digitalmanufacturing.academy`) |
| `SUPABASE_URL` / `SUPABASE_API_KEY` | Optional | If using Supabase JS helpers |
| `SMTP_*` / `EMAIL_FROM_NAME` | Optional | Hostinger mail |
| `GEMINI_API_KEY` | Optional | AI tutor |

Copy placeholders from `env.example` or `.env.production.example`.

## Hostinger Node.js panel

1. **Node version:** 22 (or highest available ≥ 22)
2. **Application startup file:** `dist/server.cjs`
3. **Install command:** `npm ci --omit=dev`
4. **Start command:** `npm start`

## First-time deploy (recommended)

### Option A — Build on Hostinger (Node 22 available)

```bash
npm ci
npm run db:generate
npm run db:migrate       # needs DATABASE_URL + DIRECT_URL
npm run db:seed          # needs SEED_* vars; run once
npm run build
npm start
```

### Option B — Upload pre-built `dist/` (this package already includes `dist/`)

1. Upload this entire folder to the app root.
2. Set all env vars in the panel.
3. In Terminal:

```bash
npm ci --omit=dev
npx prisma generate
# First deploy only:
# npx prisma migrate deploy
# npm run db:seed   # requires SEED_* and tsx/dev deps — prefer seeding from a machine with full install
npm start
```

If `db:seed` fails without devDependencies, run seed once locally or with `npm ci` (full install), then switch to production install.

## Startup file

Point the Hostinger Node.js panel directly at the bundled server:

```
dist/server.cjs
```

No wrapper is needed. The bundle is CommonJS (`.cjs`), so it runs correctly even though
`package.json` sets `"type": "module"`.

## Prisma + Supabase

- Runtime: use **pooled** `DATABASE_URL` (pooler, port 6543, `pgbouncer=true`).
- Migrations / `db push`: use **session pooler** `DIRECT_URL` — the same pooler host on port **5432** with the `postgres.<project-ref>` user and **no** `pgbouncer=true`.
  - Do **not** use `db.<project-ref>.supabase.co`: it resolves to an IPv6 address only, so it fails from Hostinger and Render with `P1001 Can't reach database server`.
  - Transaction mode (6543) cannot run DDL; session mode (5432) can.
- Sequence: `prisma generate` → `prisma migrate deploy` → `prisma db seed`.
- Migration history is **baselined**: `prisma/migrations/0_init` holds the full schema and
  is already recorded as applied in `_prisma_migrations` of the current Supabase database.
  `prisma migrate deploy` therefore applies nothing there (no `P3005`) and is safe to run
  in a build command; on a fresh database it creates all 25 `app_*` tables.
  Make future schema changes with `prisma migrate dev`, not `db push`, so history stays intact
  (that command needs a shadow database, so clear the legacy tables first — see below).
- `db push` (and `migrate dev`'s shadow-database diff) fails with `P4002` on this project's database: the leftover
  `public.users` table has a foreign key into Supabase's `auth.users` schema, which
  Prisma refuses to introspect. All 16 legacy tables are empty — drop them (or push to
  a fresh database) before the next schema change. The app's own 25 `app_*` tables are
  already in place, so launching does not require `db push`.
- The bundle is built with `--packages=external`: `dist/server.cjs` needs
  `node_modules` at runtime and cannot be copied on its own.

## Security

- Do not commit `.env` or real secrets.
- Rotate any keys that were ever committed to git.
- Prefer `service_role` only on the server; never expose it to the browser.

## Smoke test after deploy

1. Open `/` — marketing home should match design.
2. Register Student / Instructor.
3. Sign in with seeded admin → Admin Panel + Site CMS.
4. Enroll as student → Student Dashboard.
5. Register an instructor → publish a course (no admin approval needed) → it appears in the catalogue and home page.

## Troubleshooting

- **JWT_SECRET missing** → process exits immediately.
- **Engine / Node version** → this package requires Node ≥ 22.
- **Prisma client missing** → run `npx prisma generate` after `npm ci`.
- **Blank API / login fails** → check `DATABASE_URL` and that seed created users.
