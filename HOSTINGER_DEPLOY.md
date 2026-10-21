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
| `DIRECT_URL` | Yes (migrations) | Supabase **direct** URL (port **5432**) |
| `JWT_SECRET` | Yes | Random string ≥ 32 characters |
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
2. **Application startup file:** `app.js`  
   (alternative: `dist/server.cjs`)
3. **Install command:** `npm ci --omit=dev`
4. **Start command:** `npm start`

## First-time deploy (recommended)

### Option A — Build on Hostinger (Node 22 available)

```bash
npm ci
npm run db:generate
npm run db:push          # needs DATABASE_URL + DIRECT_URL
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
# npx prisma db push
# npm run db:seed   # requires SEED_* and tsx/dev deps — prefer seeding from a machine with full install
npm start
```

If `db:seed` fails without devDependencies, run seed once locally or with `npm ci` (full install), then switch to production install.

## Startup file

`app.js` loads the bundled server:

```js
import './dist/server.cjs';
```

Package `"type": "module"` is set. If Passenger has issues with ESM entry, set startup file to `dist/server.cjs` instead.

## Prisma + Supabase

- Runtime: use **pooled** `DATABASE_URL` (6543).
- Migrations / `db push`: use **DIRECT_URL** (5432) if the pooler rejects admin operations.
- Sequence: `prisma generate` → `prisma db push` → `prisma db seed`.

## Security

- Do not commit `.env` or real secrets.
- Rotate any keys that were ever committed to git.
- Prefer `service_role` only on the server; never expose it to the browser.

## Smoke test after deploy

1. Open `/` — marketing home should match design.
2. Register Student / Instructor.
3. Sign in with seeded admin → Admin Panel + Site CMS.
4. Enroll as student → Student Dashboard.
5. Instructor approval flow (if used).

## Troubleshooting

- **JWT_SECRET missing** → process exits immediately.
- **Engine / Node version** → this package requires Node ≥ 22.
- **Prisma client missing** → run `npx prisma generate` after `npm ci`.
- **Blank API / login fails** → check `DATABASE_URL` and that seed created users.
