# IMPLEMENTATION_SUPABASE

## 1. Purpose

Ship Postgres migrations, RLS, seed, and three Edge Functions that wrap `@anti-slop/scorer`. Creating the team cloud project is not this surface (SPEC.md §8 / §9). `supabase start` is the verify path when Docker is available; otherwise files + `deno check` / unit-equivalent tests on the function handlers.

## 2. Files owned

`supabase/**` listed in SPEC.md §2. Do not write `apps/web/**` or `packages/scorer/src/**`. `supabase/functions/_shared/scorer.ts` re-exports the scorer (relative import to `../../../packages/scorer/src/index.ts`).

## 3. Construction

Sequence:

1. `supabase/config.toml`: function JWT settings — `ingest-telemetry` and `score-application` verify JWT; `greenhouse-webhook` `verify_jwt = false` (SPEC.md §5.4).
2. `migrations/0001_init.sql`: tables in SPEC.md §3.17 including `known_ips`. RLS policies as specified. Enable Realtime on `detections`. Indexes on `detections.created_at`, `known_fingerprints.visitor_id`, `known_ips.ip_hash`.
3. `seed.sql`: insert every job from `fixtures/jobs.json` (inline SQL or documented copy). No live PII.
4. `functions/_shared/cors.ts`: OPTIONS + JSON headers for the Vite origin (`http://127.0.0.1:5173`).
5. `functions/_shared/scorer.ts`: re-export `scoreApplication`, `mapGreenhousePayload`, `verifyGreenhouseSignature`.
6. `ingest-telemetry`: parse SPEC.md §5.1; insert events; `{ accepted }`.
7. `score-application`: parse SPEC.md §5.2; load session events; compute burst counts; hash email/IP; `scoreApplication`; insert `applications` + `detections`; return SPEC.md §5.3. No raw email/IP in logs.
8. `greenhouse-webhook`: verify HMAC (SPEC.md §4); map fixture/payload; score `ats_text_only`; Harvest PATCH only if `GREENHOUSE_HARVEST_KEY` is set (SPEC.md §9).

Failure modes:

- Deno cannot resolve the workspace package unless the relative `_shared` import is used.
- Service role key only inside functions, never in Vite.
- Do not commit `.env` or project ref.

Locked decisions: webhook JWT off, custom GH secret. Demo does not need a live GH org.

## 4. Done when

`0001_init.sql` creates all six tables and RLS. `npx supabase` (pin SPEC.md §6) `functions serve` smoke or, if Docker is unavailable, assert function files import `_shared/scorer.ts` and the webhook handler returns `BAD_SIGNATURE` in a vitest that imports `verifyGreenhouseSignature`. With env unset, web still uses local backend.
