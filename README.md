# Merit Flow

Internal directory for Openhouse with Google login and role-based visibility.

- **Stack:** Next.js 15 (App Router) · Neon Postgres · Drizzle ORM · Auth.js v5 (Google) · Tailwind
- **Hosting:** Vercel

## Roles

Derived from `Job Title` in the seed CSV:

- `Co-Founder` or `Admin` → **admin** — sees everyone
- contains `Manager` (case-insensitive) → **manager** — sees only their direct reports + themselves
- everything else → **employee** — sees only themselves

A login is rejected if the email is not present in the `users` table.

## One-time setup

### 1. Create a Neon project

1. Go to [console.neon.tech](https://console.neon.tech), create a project.
2. Open **Connection Details**, copy the **pooled** connection string (looks like `postgresql://...neon.tech/neondb?sslmode=require`).

### 2. Create Google OAuth credentials

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. **Create Credentials** → **OAuth client ID** → Application type **Web application**.
3. **Authorized redirect URIs** — add both:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://<your-vercel-domain>/api/auth/callback/google` (production)
4. Copy the **Client ID** and **Client secret**.

### 3. Local environment

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` — Neon pooled connection string
- `AUTH_SECRET` — generate with `openssl rand -base64 32` (or use any 32+ char random string)
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` — from step 2

### 4. Install, push schema, seed

```bash
npm install
npm run db:push     # creates tables in Neon
npm run db:seed     # loads data/employees.csv into Neon
```

The seed prints the role distribution and warns about any unresolved `Reporting To` names.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → click **Sign in with Google** → sign in with an `@openhouse.in` account that exists in the CSV.

## Deploying to Vercel

1. Push this repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. **Environment Variables** — add all four from `.env`:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
4. Deploy. After the first deploy, copy the production URL and add `https://<that-url>/api/auth/callback/google` to your Google OAuth client (step 2 above).

`AUTH_URL` is auto-detected on Vercel — no need to set it manually.

## Updating the employee list

1. Replace `data/employees.csv` with the new file (same column headers).
2. Run `npm run db:seed` locally — it upserts by email, so existing rows are updated and new rows are added.
3. To remove people who were deleted from the CSV, do that manually in Neon's SQL editor (the seed never deletes).

## Project layout

```
data/employees.csv        ← seed source (matches Keka export columns)
scripts/seed.ts           ← CSV → Neon
src/lib/schema.ts         ← Drizzle schema (users + role enum)
src/lib/db.ts             ← Neon client
src/lib/role.ts           ← Job Title → role
src/lib/visibility.ts     ← getVisibleEmployees(currentUser)
src/auth.ts               ← Auth.js v5 config (Google + domain check + role lookup)
src/middleware.ts         ← redirects unauthenticated users to /login
src/app/login/page.tsx    ← Sign-in page
src/app/directory/page.tsx ← Main directory view (server-rendered, RBAC-filtered)
```

## What's next (v2 ideas — not built yet)

- Self-review form, manager rating, founder override (the appraisal workflow)
- Audit log table for rating changes
- Calibration dashboard (rating distribution, manager bias flags)
- Search/filter on the directory
