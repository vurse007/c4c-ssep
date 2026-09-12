# CLAUDE.md

Context for Claude Code (and other AI agents) working in this repo. See `README.md` for the human-facing overview; this file focuses on how to work here safely and productively.

## What this is

The digital counterpart to the in-person **SSEP (Simulated Stress Exposure Program)** run by Caring for Caregivers with a UCLA-affiliated research collaboration. It's a live research instrument: real study participants log in, complete daily cognitive-challenge + stress-management-technique workflows, and fill out pre/post surveys. The data this app collects is the actual data the study analyzes.

Treat this less like a generic CRUD app and more like a research instrument: correctness of what gets *recorded* (scores, survey answers, timestamps, time zones) matters more than usual, because bad data can't be regenerated after the fact.

## Non-negotiables when editing

- **Never lose or corrupt participant data.** Don't drop columns, don't cascade-delete result tables, don't rewrite an existing migration file. Migration `008_preserve_data_on_account_delete.sql` deliberately keeps `challenge_results`/workflow rows when a user's auth account is deleted — don't reverse that without being told to.
- **Add new SQL as a new numbered migration** (`supabase/migrations/0NN_description.sql`), never edit a past one. Assume every existing migration has already run against the production database.
- **Respect Row Level Security.** Every participant-data table should stay scoped so a user can only read/write their own rows (`auth.uid() = user_id`). If you add a table, add matching RLS policies in the same migration.
- **Don't weaken the one-official-run-per-day rule** or the time-zone handling in `lib/local-day.ts` without understanding why it's there (it's what makes daily-completion streaks and "come back tomorrow" messaging correct across time zones — see the `ae39bd8` commit and migrations `012`/`013`).
- **When adding a new data table, add its admin RLS policy too.** The admin view (`app/protected/admin/`) relies on additive `"Admins can view all rows" USING (is_admin())` SELECT policies (see `supabase/migrations/016_admin_access.sql`) on top of each table's normal per-user policy. A new participant-data table needs the same admin policy and an entry in `lib/admin-tables.ts` (the CSV-export allowlist), or admins won't be able to see/export it.
- **Survey/validation option sets are the study instrument.** The option lists in `lib/challenge-workflow.ts`, `lib/stress-techniques.ts`, and `lib/coping-exercises.ts` (e.g. `BODY_FEELING_OPTIONS`, `NOTICED_CHANGE_OPTIONS`) are effectively the survey questions. Changing labels/keys changes what's being measured — don't casually rename or reorder them; adding a new option is safer than mutating an existing one, since past rows reference old keys.
- **Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.** It's only used in `lib/supabase/admin.ts`. Never import that client into a component or client-side code path.
- **Don't paste real participant data (survey answers, scores, emails) into commit messages, comments, or chat.** If you need sample data for testing, fabricate it.

## Architecture quick reference

- **Auth/session**: `proxy.ts` → `lib/supabase/proxy.ts` (`updateSession`), runs on nearly every request per the matcher config. Client/server/admin Supabase helpers live in `lib/supabase/`.
- **Official workflow state machine**: `WorkflowCheckpoint` in `lib/challenge-workflow.ts` (`challenge_selection` → `challenge_play` → `post_survey` → `completed`), persisted in `official_challenge_workflows`, driven through `app/api/challenge-workflow/route.ts`.
- **Challenge results**: written via `app/api/challenge-result/route.ts` into `challenge_results` plus a per-challenge detail table; `ChallengeKey` in `lib/challenges.ts` is the canonical list of challenge types and must stay in sync with the detail tables and `PLAYABLE_CHALLENGES` in `lib/challenge-workflow.ts`.
- **Coping exercises**: each technique has a discriminated-union `details` shape validated in `lib/coping-exercises.ts` (`isCopingExerciseResult`) before it's persisted — if you add a technique, add its `Details` type, its `is*Details` guard, and wire it into both the union and the switch in `isCopingExerciseResult`/`normalizeDetails`.
- **UI**: App Router pages under `app/protected/` for authenticated views, `components/*-game.tsx` for the five cognitive tasks, `components/coping-exercises/` for technique UIs, `components/ui/` for shadcn-style primitives.

## Working conventions

- No test suite currently exists — verify changes by running `npm run dev` and exercising the actual flow (sign up/login, run the daily workflow end to end, check `try-puzzles` free play) rather than assuming type-checks are sufficient.
- Run `npm run lint` before considering a change done.
- Match existing patterns: validator functions (`is*`) plus `normalize*` functions for anything persisted from client input, colocated with the type definitions they validate (see `lib/coping-exercises.ts` for the fullest example).
- This is a small, single-maintainer research project, not a large team codebase — prefer direct, minimal changes over introducing new abstractions, config layers, or generalized frameworks the study doesn't need yet.
