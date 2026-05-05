# Merit Flow

Internal performance review system for Openhouse — Google login, role-based access, weighted-rating workflow.

- **Stack:** Next.js 15 (App Router) · Neon Postgres · Drizzle ORM · Auth.js v5 (Google) · Tailwind
- **Hosting:** Vercel

## Roles

Derived from `Job Title` in the seed CSV:

- `Co-Founder` or `Admin` → **admin** — sees everyone, overrides ratings, finalizes
- contains `Manager` (case-insensitive) → **manager** — sees only direct reports, submits ratings
- everything else → **employee** — sees only themselves, submits self-review

A login is rejected if the email is not present in the `users` table.

## Workflow

```
NOT_STARTED  →  SELF_SUBMITTED  →  MANAGER_REVIEWED  →  FOUNDER_REVIEWED  →  FINALIZED
   employee         employee           manager              admin (founder)     admin
```

- An employee can only submit while the review is `NOT_STARTED`.
- A manager can only rate while it's `SELF_SUBMITTED`.
- An admin (founder) can override while it's `MANAGER_REVIEWED`.
- An admin can finalize while it's `FOUNDER_REVIEWED`.
- After `FINALIZED` no edits are possible.

State transitions are enforced in [src/app/_actions/reviews.ts](src/app/_actions/reviews.ts) — never on the client.

## Rating model

| Component                 | Weight | Source           |
|---------------------------|--------|------------------|
| KRA / Goal Performance    | 50%    | Manager (1–5)    |
| Behavioral Competencies   | 30%    | Manager (1–5)    |
| Manager Overall           | 20%    | Manager (1–5)    |

Founder may override any of the three. **Final rating** uses the founder value where present, manager value otherwise:

```
final = 0.5 × KRA + 0.3 × Behavioral + 0.2 × Overall   (rounded to 1 decimal)
```

Implementation: [src/lib/review.ts](src/lib/review.ts) (single source of truth — DB and UI both call this).

## One-time setup

### 1. Create a Neon project

1. [console.neon.tech](https://console.neon.tech) → **New Project** → name `merit-flow`, region `ap-south-1` (Mumbai) or `ap-southeast-1` (Singapore).
2. **Connection Details** → copy the **pooled** connection string.

### 2. Create Google OAuth credentials

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. **Create Credentials** → **OAuth client ID** → **Web application**.
3. **Authorized redirect URIs** — add:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-domain>/api/auth/callback/google`
4. Copy **Client ID** and **Client secret**.

### 3. Local environment

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` — Neon pooled connection string
- `AUTH_SECRET` — `openssl rand -base64 32` (or any 32+ char random string)
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` — from step 2

### 4. Create tables and load data

You have two ways to bootstrap the database. Pick one.

**Option A — Run SQL directly in Neon (no Node tooling needed):**

In Neon Console → **SQL Editor**, paste and run:
1. [sql/01_users.sql](sql/01_users.sql) — creates `users`, loads all 51 employees, derives roles, links managers
2. [sql/02_reviews.sql](sql/02_reviews.sql) — creates `reviews`, seeds one `not_started` row per employee

**Option B — Use the Node tooling:**

```bash
npm install
npm run db:push     # creates all tables via Drizzle
npm run db:seed     # loads data/employees.csv into users (no review rows seeded)
```

If you go with Option B, the `reviews` rows will be lazy-created the first time each employee opens `/reviews/me`.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → Google sign-in → land on the page that matches your role.

## Pages

| Path                       | Who can access            | What it does                                              |
|----------------------------|---------------------------|------------------------------------------------------------|
| `/login`                   | anyone                    | Google sign-in                                             |
| `/reviews/me`              | any signed-in user        | Self-review form (if `not_started`), then read-only status |
| `/reviews/team`            | manager, admin            | List of direct reports (manager) or all employees (admin)  |
| `/reviews/[employeeId]`    | admin OR owning manager OR self | Review detail; surfaces the right form for the current state |
| `/admin/dashboard`         | admin                     | Rating distribution + manager-wise calibration             |
| `/directory`               | any signed-in user        | Org directory (RBAC-filtered rows, all columns visible)    |

After sign-in the home page (`/`) auto-redirects to the most relevant page for the user's role.

## Security model

- **Authentication:** Google OAuth via Auth.js v5, JWT sessions. Email + domain check on sign-in (`@openhouse.in`, `@openhouse.com`). Login is also rejected if the email is not in the `users` table.
- **Authorization:** every server action and every server-rendered page calls `auth()` then `getUserByEmail()` then `reviewPermissions()`. There is no client-side trust. All mutations go through server actions in [src/app/_actions/reviews.ts](src/app/_actions/reviews.ts).
- **Data integrity:** rating columns have `CHECK (BETWEEN 1 AND 5)` constraints in Postgres. Workflow transitions are guarded by the state machine in [src/lib/review.ts](src/lib/review.ts).

## Deploying to Vercel

1. Push this repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. Add env vars (Production + Preview + Development): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
4. Deploy. Then add `https://<vercel-domain>/api/auth/callback/google` to your Google OAuth client's redirect URIs.

`AUTH_URL` is auto-detected on Vercel.

## Updating the employee list

- **SQL flow:** edit `sql/01_users.sql`, re-run it (drops + recreates `users` AND `reviews`).
- **Node flow:** replace `data/employees.csv` with the new file → `npm run db:seed` (upserts by email; never deletes).

## Project layout

```
data/employees.csv             ← seed source (Keka export columns)
sql/01_users.sql               ← schema + data for users
sql/02_reviews.sql             ← schema for reviews + per-employee seed row
scripts/seed.ts                ← Node-based CSV → Neon (alternative to SQL)
src/lib/schema.ts              ← Drizzle schema (users + reviews + enums)
src/lib/db.ts                  ← Neon client
src/lib/role.ts                ← Job Title → role
src/lib/visibility.ts          ← getVisibleEmployees(currentUser)
src/lib/review.ts              ← rating math + state machine + permissions
src/lib/review-queries.ts      ← review row lookups, dashboard aggregates
src/app/_actions/reviews.ts    ← all review mutations (server actions)
src/app/_components/Nav.tsx    ← top nav (role-aware)
src/app/login/page.tsx         ← sign-in
src/app/reviews/me/page.tsx    ← self-review
src/app/reviews/team/page.tsx  ← team / all-reviews list
src/app/reviews/[employeeId]/page.tsx ← review detail (manager rate / admin override / finalize)
src/app/admin/dashboard/page.tsx ← rating distribution + manager comparison
src/app/directory/page.tsx     ← directory
src/auth.ts + src/auth.config.ts ← Auth.js v5 config (split for edge middleware)
src/middleware.ts              ← redirects unauthenticated users to /login
```
