# SSEP Dashboard — Caring for Caregivers

A Next.js web app that runs the **Simulated Stress Exposure Program (SSEP)**: a research study workflow (developed with a UCLA-affiliated research collaboration and Caring for Caregivers, a student-led nonprofit) that pairs short cognitive-performance challenges with stress-management techniques, and collects pre/post survey data to measure how coping strategies affect focus and performance under mild stress.

Participants log in, complete a daily "official" challenge workflow (pre-survey → cognitive task under time pressure → coping/stress-management exercise → repeat task or post-survey), and can also freely practice any of the puzzle types outside the official workflow. Their results feed a personal performance dashboard.

## What this app actually does

The in-person SSEP workshop pairs six cognitive tasks with six stress-regulation strategies (see `SSEP C4C Pilot.pdf` for the program background). This app is the digital counterpart used to collect the same kind of data at scale/remotely:

- **Cognitive challenges** (`lib/challenges.ts`, `components/*-game.tsx`, `app/protected/try-puzzles/*`):
  - Digit Span (working memory)
  - Stroop Task (attention/inhibitory control)
  - Wordle-style puzzle (complex problem solving)
  - Serial Subtraction (sustained attention under distraction)
  - Structured List Recall (memory encoding)
- **Stress-management / coping techniques** (`lib/stress-techniques.ts`, `lib/coping-exercises.ts`, `components/coping-exercises/`):
  - Self-EmRes, 5-4-3-2-1 grounding, box breathing, aromatherapy, gratitude exercise, cold therapy
- **Guided daily workflow** (`lib/challenge-workflow.ts`, `app/api/challenge-workflow/route.ts`, `app/protected/start-challenge/`):
  1. Pre-survey (stress level, current BPM, day pace, focus effort, body feelings) + pick a stress-management technique
  2. Play a challenge
  3. Do the coping exercise
  4. Post-survey (stress level, strategy confidence/effectiveness, noticed changes, future confidence)
  - One official run per participant per local calendar day (server enforces this using the participant's time zone — see `lib/local-day.ts`).
- **Dashboard** (`app/protected/page.tsx`, `components/performance-chart.tsx`, `components/current-streak-card.tsx`): visualizes score history per challenge type and daily-completion streaks.
- **Free play** (`app/protected/try-puzzles/*`): the same games without the survey/workflow, for practice or informal use — results are still recorded but not tied to an official workflow.

## Tech stack

- **Framework:** Next.js (App Router) + React 19 + TypeScript
- **Styling/UI:** Tailwind CSS, shadcn/ui-style components (`components/ui`), Radix primitives, `next-themes`
- **Charts:** Recharts
- **Backend/Auth/DB:** Supabase (Postgres + Auth). Auth session handling happens in `proxy.ts` / `lib/supabase/proxy.ts` (Next.js middleware-equivalent), with separate client/server/admin Supabase clients in `lib/supabase/`.

## Project layout

```
app/
  api/                      Route handlers: challenge-workflow, challenge-result, wordle-word, account/delete
  auth/                     Login, sign-up, password reset/update, email confirm
  protected/                Authenticated app: dashboard, settings, start-challenge, try-puzzles
components/                 Game UIs, coping-exercise UIs, surveys, dashboard widgets, shadcn ui/ primitives
lib/
  challenges.ts             Cognitive challenge catalog (keys, labels, colors)
  challenge-workflow.ts     Survey option sets, workflow types, validators
  stress-techniques.ts      Coping/stress-management technique catalog
  coping-exercises.ts       Per-technique result shapes + validators/normalizers
  local-day.ts              Time-zone-aware "local day" logic (daily limit, streaks)
  supabase/                 Supabase client/server/admin/proxy helpers
supabase/migrations/        Numbered SQL migrations (schema history — run in order, see below)
```

## Data model (Supabase / Postgres)

Schema evolves via `supabase/migrations/*.sql`, applied in numeric order (run once each in the Supabase SQL editor). Key tables, roughly:

- `challenge_results` — one row per attempt of any challenge, normalized `score` (0–100), RLS-scoped to `auth.uid()`.
- Per-challenge detail tables (`wordle_results`, `stroop_results`, `serial_subtraction_results`, `digit_span_results`, `structured_list_recall_results`) — full metrics per attempt, FK'd to `challenge_results`.
- `official_challenge_workflows` — one row per official daily run: pre-survey answers, chosen technique, selected challenge, post-survey answers, `checkpoint`/`status`, timestamps.
- `coping_exercise_results` — per-technique exercise details (e.g. grounding items, box-breathing rounds, EmRes sensations).
- `official_attempts` — links official workflow runs to the underlying challenge attempt.

Notable behaviors baked into later migrations: participant data is preserved (not cascade-deleted) when an account is deleted (`008`), survey sliders were moved to a 0–100 scale (`010`), daily challenge limits and local-date backfill exist for time-zone correctness (`012`–`013`), EmRes was added as a coping strategy after the pilot (`015`), and an admin allowlist + cross-user read policies were added for the study team's data view (`016`, see below).

**When changing the schema:** add a new numbered migration file rather than editing an existing one — participant data already exists in this database and existing migrations may have already run in production.

## Admin data view

Study collaborators who aren't comfortable with Supabase/SQL can view and export all participant data in-app, without a Supabase account, at `/protected/admin` (linked from the sidebar for admins only).

- **Who can see it:** anyone whose `auth.users.id` is in the `admin_users` table (added in migration `016`). There's no UI to grant admin access — a project maintainer runs, once per new admin, in the Supabase SQL editor, after that person has signed up normally through `/auth/sign-up`:
  ```sql
  INSERT INTO admin_users (user_id) VALUES ('<their-auth-uid>');
  ```
  Find the uid in Supabase → Authentication → Users.
- **What it shows:** an aggregate overview (participant counts, trial retention %, stress-level change by coping technique, attempts by challenge), a participant directory, a per-participant **trial progress** view (days completed, longest streak, finished/in-progress status vs. the 7-day trial), a **study insights** view (the study's core before/after question — self-reported stress, task score, strategy confidence/effectiveness, and % reporting a positive change, broken out per coping technique, explicitly labeled preliminary/descriptive with sample-size flags), and a raw per-table browser with a "Export CSV" button for every study table (`lib/admin-tables.ts` is the allowlist of exportable tables). The progress and insights views are backed by `admin_participant_progress()` and `admin_technique_effectiveness()`, both added in migration `017`.
- **How it works:** admin read access is granted via additive Postgres RLS policies driven by an `is_admin()` function (`supabase/migrations/016_admin_access.sql`), so admin pages query Supabase with the normal per-user client/session — no service-role key is used for reading participant data. See `lib/supabase/is-admin.ts`.

## Environment variables

Copy from Supabase project settings → API into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The service role key is used server-side only (`lib/supabase/admin.ts`, e.g. for account deletion) — never expose it to the client.

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000
npm run build
npm run lint
```

You'll also need a Supabase project with the migrations in `supabase/migrations/` applied in order, and Supabase Auth (email/password) enabled.

## Study/privacy context

This app collects data from human research participants (stress ratings, physiological self-report, task performance) under a university-affiliated study. Treat participant data as sensitive by default:
- Don't log, export, or paste real participant data into chat, issues, or commits.
- Don't weaken Row Level Security policies or the account-deletion data-preservation behavior without understanding the study's data-retention requirements.
- If you're unsure whether a change affects IRB-relevant data handling, ask before shipping it.
