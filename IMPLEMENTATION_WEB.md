# IMPLEMENTATION_WEB

## 1. Purpose

Build the Vite + React careers form and recruiter dashboard. The app collects telemetry and FingerprintJS `visitorId`, talks only through `BackendPort`, and renders frozen `Detection` rows. No logistic math lives here.

## 2. Files owned

`apps/web/**` listed in SPEC.md §2, plus root `package.json` workspaces entry if the orchestrator did not already add `apps/web`. Also `scripts/dev.sh`. Do not write `packages/scorer/**`, `supabase/**`, or `fixtures/**`.

## 3. Construction

Sequence:

1. Vite app with pins in SPEC.md §6. `@vitejs/plugin-react`, `@tailwindcss/vite`, `react-router-dom`. Routes: `/` `Home`, `/apply/:slug` `Apply`, `/recruiter` `Recruiter`.
2. `lib/types.ts` mirrors SPEC.md §3 wire types used by the UI (`Job`, `Field`, `TelemetryEvent`, `ClientSignals`, `AnswerMap`, `Detection`, `FeatureVector`, `ReplayPack.id`).
3. `lib/backend.ts`: `selectBackend` (SPEC.md §4). Do not import `@supabase/supabase-js` from `localBackend.ts`.
4. `lib/localBackend.ts`: implement `BackendPort` with the maps in SPEC.md §3.16. Call `scoreApplication` from `@anti-slop/scorer` (workspace package name set in `packages/scorer/package.json`). Hash email and IP before persist. `replayPack` loads `fixtures/packs/{id}.json` via `import` or fetch from `/fixtures` if you copy packs into `public/` — **public/ is not in SPEC.md §2**. Import JSON from `../../../../fixtures/packs/` using Vite’s JSON import instead.
5. `lib/supabaseBackend.ts`: only used when both Vite env keys are set. Call Edge Functions `ingest-telemetry` and `score-application`. `listDetections` selects `detections` (will fail closed if RLS denies — show that error). `subscribeDetections` uses Realtime. `replayPack` may call `score-application` with pack `ScoreInput` if you add no extra function — prefer invoking the scorer through an Edge invoke body `{ replay_id }` only if SPEC listed it (it does not). For cloud replay, run packs client-side through `scoreApplication` then insert via `score-application` only when a session exists. **Locked:** local replay is required; cloud replay can call the scorer in-browser (same package) and insert a detection with `source="replay"` using the anon insert path on `applications` + a function you must not invent. Simplest: `replayPack` always runs `scoreApplication` in-browser and, if supabase, inserts via `score-application` by first `createSession` and `ingestTelemetry` with the pack’s events, then `submitApplication` with pack answers. That stays within SPEC.md §4.
6. `lib/telemetry.ts`: session clock, types in SPEC.md §3.4–3.5, flush every `TELEMETRY_FLUSH_MS`, no key values, no field text.
7. `lib/fingerprint.ts`: client-only `load()` from `@fingerprintjs/fingerprintjs`. On throw, `visitor_id=""`.
8. `ApplicationForm` + `SectionNav` + `FieldRenderer`: sections in job order; EEO optional. Submit `BackendPort.submitApplication`.
9. `Recruiter` + `DetectionRow` + `ReasoningPanel`: show SPEC.md §5.3 fields. Never render raw email, raw IP, or `ip_hash`. Override control calls `overrideLabel`.
10. `ReplayToggle`: four pack ids in SPEC.md §3.12. Run sequentially or one-at-a-time; show expected vs got label.

Failure modes:

- Fingerprint imported from a non-browser context → guard `typeof window`.
- Zod 4.6.5, not v3.
- Tailwind v4 via `@tailwindcss/vite` + `@import "tailwindcss"` in `index.css`.
- Workspace package: root `package.json` `"workspaces": ["apps/web","packages/scorer"]`.

Locked decisions: no recruiter auth in local mode (SPEC.md §9). No new npm names beyond SPEC.md §6.

## 4. Done when

`scripts/dev.sh` serves `/`, `/apply/job_eng` (or the eng slug from fixtures), and `/recruiter`. A local submit produces a `Detection` on `/recruiter` without Supabase env. Replay toggle runs four packs with the labels in SPEC.md §3.12.
