# DMA-LMS-Production — Digital Manufacturing Academy LMS & course management platform

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js ≥ 22 (`.nvmrc` also pins 22) |
| Language | TypeScript |
| Framework | Express.js |
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| ORM | Prisma 5 |
| Database | PostgreSQL via Supabase |

## Prerequisites

- Node.js ≥ 22.0.0 and npm ≥ 10.0.0
- A Supabase project (PostgreSQL)

## Hostinger quick facts

- Node version → 22 (also pinned in `.nvmrc`)
- Framework → Express
- Entry / startup file → `dist/server.cjs`. No wrapper is needed: the bundle is
  CommonJS, so it runs even though `package.json` sets `"type": "module"`.
  (`app.js` re-exporting `dist/server.cjs` still works as an alternative.)
- Install command → `npm ci --omit=dev`
- Start command → `npm start`

## Environment

Fill in `.env` — all required keys are documented in `env.example`. The critical ones are:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase pooled connection string (PgBouncer, port 6543) |
| `DIRECT_URL` | Supabase **session pooler** connection string: the `*[customer-region].pooler.supabase.com` host on port 5432 with the `postgres.<project-ref>` user and **no** `pgbouncer=true`. The `db.<project-ref>.supabase.co` host is IPv6-only and unreachable from IPv4-only hosts such as Render |
| `JWT_SECRET` | Random string ≥ 32 characters (64 recommended) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | First-boot admin account (required) |
| `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` | First-boot super-admin account (required) |

## Deploying to Hostinger

Build locally → upload `dist/`, `prisma/`, `package.json`, `package-lock.json`, `app.js`, and any other root-level files.
Or connect your GitHub repository and let Hostinger pull on deploy.

1. Install production dependencies on the server

   ```bash
   npm install --omit=dev
   ```

2. Set the startup file

   In the Hostinger Node.js panel, set the Application startup file to `dist/server.cjs`
   (or to `app.js`, which re-exports the bundle).

3. Apply database migrations (first deploy or schema changes)

   ```bash
   npm run db:migrate
   ```

   Run this via Hostinger's terminal or SSH before restarting the app. The migration
   history is baselined: `0_init` is already recorded as applied on the current Supabase
   database, so this applies nothing there; on a fresh database it creates the full schema.

4. (First deploy only) Seed the database

   ```bash
   npm run db:seed
   ```

   This creates the initial admin and super-admin accounts using the credentials from your
   environment variables. The server will not start if `SEED_ADMIN_EMAIL` /
   `SEED_ADMIN_PASSWORD` are missing.

## Deploying to Render

- Set `NODE_VERSION=22` (matches `.nvmrc` and the `engines` field).
- Build command: `npm ci && npm run build`. `vite`, `esbuild` and `tailwindcss` are
  build-time tools kept in `dependencies` on purpose: if `NODE_ENV=production` is set
  during install, npm skips `devDependencies`, and the build would fail without them.
- `prisma migrate deploy` is safe to run in the build command. The history is baselined
  (`prisma/migrations/0_init`, already marked applied in the current Supabase database),
  so it applies nothing there but builds the full schema on a fresh database.
- Start command: `npm start`. The bundle uses `--packages=external`, so `node_modules`
  must be present at runtime — `dist/` on its own will not run.

## Available npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with tsx (hot-reload) |
| `npm run build` | Full production build |
| `npm start` | Start the compiled production bundle |
| `npm run lint` | TypeScript type-check (no emit) |
| `npm run db:push` | Push Prisma schema to database (fails with `P4002` — legacy tables) |
| `npm run db:migrate` | Apply pending Prisma migrations (baselined `0_init`) |
| `npm run db:seed` | Seed initial data and admin accounts |
| `npm run db:generate` | Regenerate Prisma client only |
| `npm test` | Run tests via `tsx --test` |
| `npm run clean` | Delete `dist/` folder |

## Project structure

```
.
├── app.js                  # Hostinger entry point (re-exports dist/server.cjs)
├── server.ts               # Main Express server + all API routes
├── db.js                   # Supabase JS client (optional helpers)
├── db.ts                   # Typed Supabase client (TypeScript)
├── routes/
│   ├── auth.ts             # Authentication routes
│   ├── courses.ts          # Course CRUD & publishing
│   └── enrollments.ts      # Enrolment management
├── middleware/
│   └── authorize.ts        # JWT auth & role-based access control
├── lib/
│   ├── appState.ts         # Server-side application state
│   └── mailer.ts           # Nodemailer email helpers
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── migrations/         # Baselined migration history (0_init)
│   └── seed.ts             # Seed script
├── dist/                   # Production build output (git-ignored)
└── env.example             # Environment variable template
```

## User roles

| Role | Access |
|------|--------|
| `student` | Browse & enrol in courses, track progress, earn certificates |
| `instructor` | Create and manage own courses, view instructor dashboard |
| `admin` | Manage users, courses, events, webinars, CMS content |
| `super_admin` | Full platform access including role and subscription management |

## Key features

- Course Player with lessons, quizzes, and assignments (embedded JSON in Prisma)
- Certificate generation on course completion
- AI Tutor powered by Google Gemini
- Assessment module with auto-grading
- Webinar & Events management
- Learning Paths for structured curricula
- Instructor Dashboard with analytics
- Admin Panel with CMS page renderer
- Payment / Checkout flow
- Email notifications via Hostinger SMTP
- Subscription plans (free / paid tiers)

## Environment variables reference

See `env.example` for the full list with descriptions. Never commit real values.
