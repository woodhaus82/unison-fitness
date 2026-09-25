# Unison Fitness — Member Portal

Member booking portal + admin programming console for Unison Fitness,
replacing Wodify. Phase 1 (this repo): web member portal, admin portal,
booking/waitlist logic, and automated attendance emails. Phase 2 (later):
a mobile app built on the same backend.

## Stack

- **Web app**: Next.js 16 (App Router, TypeScript, Tailwind) — `apps/web`
- **Backend**: Supabase (Postgres + Auth + Row Level Security) — `supabase/`
- **Email**: Resend, triggered by scheduled jobs
- **Hosting**: designed for Vercel (app) + Supabase Cloud (database), but not locked in

## Repo layout

```
apps/web/         Next.js app — member portal + admin portal
supabase/
  migrations/      SQL schema, RLS policies, booking/waitlist logic (source of truth)
  seed.sql         Sample class types/schedule for local development
```

## One-time setup

### 1. Create a Supabase project

Create a free project at [supabase.com](https://supabase.com). From
**Project Settings → API**, grab the project URL, anon key, and service
role key.

### 2. Apply the schema

Easiest path without installing the Supabase CLI: open the Supabase
dashboard's **SQL Editor** and run the contents of
`supabase/migrations/*.sql` in order (0001, 0002, 0003, 0004), then
optionally `supabase/seed.sql` for sample classes to test with.

If you'd rather use the CLI (needed for local Postgres via Docker, or to
keep migrations in sync going forward):

```bash
brew install supabase/tap/supabase   # or see supabase.com/docs/guides/cli
supabase link --project-ref <your-project-ref>
supabase db push                     # applies supabase/migrations/*.sql
```

### 3. Configure environment variables

```bash
cd apps/web
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` from step 1. Generate any random string for
`CRON_SECRET`. Sign up at [resend.com](https://resend.com), verify a
sending domain, and put the API key in `RESEND_API_KEY`.

### 4. Install dependencies and run

```bash
npm install
npm run dev:web
```

Visit `http://localhost:3000`, sign up for an account, then promote
yourself to admin (there's no self-serve admin signup, by design) by
running this in the Supabase SQL Editor:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

### 5. Set up the scheduled jobs (attendance emails)

Two routes need to be hit on a schedule:

- `GET/POST /api/cron/no-shows` — marks bookings as no-show once a class
  has ended without a check-in
- `GET/POST /api/cron/dispatch-emails` — sends the actual emails (booking
  confirmations, waitlist promotions, late cancellations, missed
  attendance) for anything logged but not yet emailed

**On Vercel**: `apps/web/vercel.json` already defines the cron schedule
(no-shows every 15 min, email dispatch every 5 min). Vercel automatically
sends `Authorization: Bearer $CRON_SECRET` as long as `CRON_SECRET` is set
in the project's environment variables — no extra config needed.

**Elsewhere** (e.g. Supabase scheduled Edge Functions, or a free service
like cron-job.org): call both URLs on the schedule above with header
`Authorization: Bearer <your CRON_SECRET>`.

## How class programming works

Admins (`/admin/schedule`) have two ways to populate the week:

1. **Recurring template → "Generate this week"**: define a weekly
   recurring pattern once (`class_schedule` table) and click the button to
   stamp out real, bookable sessions for the current week.
2. **Spreadsheet import**: upload a `.csv`/`.xlsx`, or paste a Google
   Sheets link (shared as "anyone with the link can view"). Expected
   columns: `date` (YYYY-MM-DD), `start_time`, `end_time`, `class_type`,
   and optionally `capacity`, `coach_email`, `location`. Re-uploading
   updates existing sessions rather than duplicating them.

Both approaches write to the same `class_sessions` table, so they can be
mixed — e.g. generate the recurring week, then import a one-off holiday
schedule that overrides it.

## Booking logic

- Capacity + waitlist + late-cancellation-window logic all live in
  Postgres functions (`book_class`, `cancel_booking` in
  `supabase/migrations/00000000000001_init.sql`), so they're atomic under
  concurrent bookings and enforced no matter which client calls them
  (web today, mobile app later).
- `late_cancel_cutoff_minutes` is set per class type (default 4 hours).
  Cancelling inside that window marks the booking `late_cancelled` instead
  of `cancelled` and logs a notification for the late-cancellation email.
- Cancelling a confirmed spot automatically promotes the longest-waiting
  person on the waitlist.

## What's not built yet

- Payments/membership billing (schema has `membership_plans` /
  `memberships` tables as a foundation, but no Stripe integration)
- Mobile app (planned as a React Native/Expo app against this same
  Supabase backend once the web portal is validated)
- Marketing site integration (unison.fitness currently runs on GoDaddy
  Website Builder with no code access — plan is to link out to this portal
  as a separate app/subdomain rather than embed it)
