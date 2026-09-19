# BACKEND_PLAN — build only the backend

Derived from `SPEC.md`. Product intent: `PLAN.md`. Do not rewrite either. Do not implement the Vite UI.

## Load rule

- Orchestrator reads this file plus the area doc named by the current phase.
- Implementer reads that phase section, the `SPEC.md` sections it cites, and its area doc.
- Do not read `IMPLEMENTATION_WEB.md` or build `apps/web/src/routes/**` / `components/**`.
- Do not say “read all documents in this folder.”

## Mission

Ship the scoring and persistence path so a caller can ingest telemetry, score an application, replay the four packs, and accept a Greenhouse fixture — without a careers UI. Local in-memory `BackendPort` is the default. Supabase files are shipped and env-gated. Definition of done: `packages/scorer` tests green; `BackendPort` in-process replay matches SPEC.md §3.12 labels; Edge Function sources and migrations exist. SPEC.md §1, §4, §7.4–7.7, §7.9, §8–§10.

## In scope

| Component | Role | SPEC | Area doc |
|---|---|---|---|
| Fixture corpus | Two jobs, lexicons, CIDRs, four packs, Harvest JSON | §3.3, §3.12–3.13, §2 `fixtures/**` | IMPLEMENTATION_FIXTURES.md |
| `@anti-slop/scorer` | Features, logistic, hard rules, confidence, reasoning, Jev skip, GH map | §3.8–3.10, §4, §6 | IMPLEMENTATION_SCORER.md |
| Local `BackendPort` | In-memory sessions/events/apps/detections/burst; hash email/IP | §3.16, §4 `BackendPort` | this file § Local backend |
| Supabase schema + RLS | Eight tables, Realtime on `detections`, seed jobs | §3.17, §5.4–5.5 | IMPLEMENTATION_SUPABASE.md |
| Edge Functions | `ingest-telemetry`, `score-application`, `greenhouse-webhook` | §5.1–5.4 | IMPLEMENTATION_SUPABASE.md |
| `supabaseBackend.ts` | Same `BackendPort` over Edge + Realtime when env set | §4 `selectBackend` | this file § Cloud adapter |

## Out of scope (this plan)

- Vite routes, form, FingerprintJS boot, recruiter HTML (SPEC.md §7.1–7.3 UI).
- Creating the team Supabase org / `get_cost` / `confirm_cost` (SPEC.md §8).
- Laya, live Greenhouse/Workday, paid GeoIP, recruiter SSO, LLM reasoning (SPEC.md §8–§9).
- New files outside SPEC.md §2 except this document.

## Hard rules

1. SPEC.md wins. Do not change `LOGIT_WEIGHTS`, thresholds, or wire keys.
2. No new dependencies beyond SPEC.md §6.
3. No Vite UI work. `apps/web` only: `lib/types.ts`, `lib/backend.ts`, `lib/localBackend.ts`, `lib/supabaseBackend.ts` (and workspace `package.json` as needed to compile the scorer / port).
4. Raw email and raw IP are hashed before persist; never logged (SPEC.md §3.7, §8).
5. Empty telemetry is human-ward and lowers `confidence` (SPEC.md §4, §10).
6. Tests run. A phase is not done on empty files.
7. Commit per phase.
8. Do not run `supabase projects create` or commit secrets.

## Environment gotchas

- Default: unset `VITE_SUPABASE_URL`. Tests must pass with no TypeSafe/Greenhouse keys.
- Edge Functions import scorer via `supabase/functions/_shared/scorer.ts` (relative), not a published package.
- Scorer must not use `fs`; static JSON imports only (Edge + Vite).
- `supabase start` needs Docker; if missing, ship SQL/functions and still run scorer tests.
- Node pin: SPEC.md §6. Workspace: `["apps/web","packages/scorer"]` so `@anti-slop/scorer` resolves.

## Local backend (no area doc — cite SPEC)

Files: `apps/web/src/lib/types.ts`, `backend.ts`, `localBackend.ts` (SPEC.md §2).

Implement `BackendPort` (SPEC.md §4) with maps in SPEC.md §3.16. Call `scoreApplication` from `@anti-slop/scorer`. `replayPack` loads `fixtures/packs/{id}.json` via JSON import. `selectBackend` returns local when env unset. Do not implement React subscribers beyond an in-process callback list.

Done when: a Node/vitest driver (add `packages/scorer/tests/backend-port.test.ts` **is not in SPEC.md §2**). Do not add that path. Drive `localBackend` from `scripts/replay.ts` by importing `replayPack` after localBackend exists, **or** keep pack asserts in `packages/scorer/tests/replay.test.ts` and add a second export test in `apps/web` only if you also add a SPEC path — **locked:** do not add files. Prove local port with `node --experimental-strip-types` one-liner in the phase exit-check, not a new test file.

## Cloud adapter (no area doc — cite SPEC)

File: `apps/web/src/lib/supabaseBackend.ts`. Used only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set. Invoke `ingest-telemetry` and `score-application`. `replayPack` uses createSession → ingestTelemetry → submitApplication (SPEC.md IMPLEMENTATION_WEB locked path; same rule here). `subscribeDetections` uses Realtime. Without env, this module must not run.

## Phases

### Phase B0 — Workspace + fixture stubs (orchestrator)

**Cite** SPEC.md §2, §6.

Create root workspaces, `packages/scorer` manifest (pins), empty scorer modules, `apps/web/src/lib/{types,backend,localBackend,supabaseBackend}.ts` stubs, `supabase/` empty config, `fixtures/` two-job stub + empty pack files listed in SPEC.md §2. No UI files required beyond what SPEC already lists; do not create `routes/` or `components/` in this plan if you can avoid it — they are WEB. If Phase B0 would violate “every SPEC §2 path,” skip UI paths; only create backend-listed paths plus root `package.json`.

**Exit-check (Tier-1):** `test -f packages/scorer/package.json && python3 -c "import json; j=json.load(open('fixtures/jobs.json')); assert len(j)==2"`

**Commit:** Phase B0: backend workspace and fixture stubs

### Phase B1 — Fixtures + scorer (parallel-2 then integration)

**Agent F:** IMPLEMENTATION_FIXTURES.md §2. Forbid `apps/web/**`, `packages/scorer/**`, `supabase/**`. Cite SPEC.md §§ 3.3, 3.12–3.13, 6 (`JOB_COUNT`, `BURST_N`, `HARD_SPEED_MIN`).

**Agent S:** IMPLEMENTATION_SCORER.md §2. Forbid `apps/web/**`, `supabase/**`. Cite SPEC.md §§ 3.8–3.14, 4 (`extractFeatures` through `mapGreenhousePayload`), 6.

Locked: Jev zeros without key. Weights unchanged. Pack `burst.visitor_n` set on `bot_burst`.

**Exit-check (Tier-1):** `cd packages/scorer && npx vitest run`  
Expected: labels `human_slow_fill` 0, `bot_burst` 1, `human_ai_essays` 0, `placeholder_bot` 1; AI-essay pack has nonzero `emdash_rate` or `aiism_hit`; `ats_text_only` confidence `<` live bot confidence; empty `visitor_id` does not throw.

**Commit:** Phase B1: scorer and labeled packs

### Phase B2 — Local BackendPort (single)

**Agent L:** files in “Local backend” above. Forbid `apps/web/src/routes/**`, `apps/web/src/components/**`, `supabase/**`, `packages/scorer/src/**` (may import). Cite SPEC.md §§ 3.7, 3.11, 3.16, 4 `BackendPort` / `selectBackend`, 5.3, 10.

Locked: hash email/IP; `overrideLabel` does not change `probability`; fail-open is not “invent a detection” — scorer throw surfaces as error (SPEC.md §10).

**Exit-check (Tier-2):** with env unset, `selectBackend()` is local; `replayPack` for all four ids matches §3.12; `overrideLabel` keeps `probability`; submit with `events=[]` yields `label=0` and `confidence` at `CONF_DEGRADED` band (SPEC.md §4). Run via `node --experimental-strip-types` importing `localBackend`.

**Commit:** Phase B2: in-memory BackendPort

### Phase B3 — Supabase schema and Edge Functions (single)

**Agent B:** IMPLEMENTATION_SUPABASE.md §2. Forbid `apps/web/**`, `packages/scorer/src/**`. Cite SPEC.md §§ 3.17, 4 (Edge + HMAC), 5.1–5.5, 6 env, 9.

Locked: webhook `verify_jwt=false`. Harvest PATCH skipped without `GREENHOUSE_HARVEST_KEY`. No cloud project create.

**Exit-check (Tier-1):** `0001_init.sql` creates `jobs`, `application_sessions`, `telemetry_events`, `applications`, `detections`, `known_fingerprints`, `known_ips`, `recruiters`.  
**Tier-2 (optional Docker):** `npx supabase start` applies migration. Else skip with note.  
**Tier-2 always:** webhook handler / `verifyGreenhouseSignature` rejects bad HMAC as `BAD_SIGNATURE`.

**Commit:** Phase B3: Postgres RLS and Edge wrappers

### Phase B4 — supabaseBackend adapter (single)

**Agent L:** `apps/web/src/lib/supabaseBackend.ts`, `backend.ts` only. Forbid scorer src, supabase functions (already done), UI. Cite SPEC.md §4 `selectBackend`, §5.4–5.5.

Locked: adapter unused when env unset. Replay goes session → events → submit.

**Exit-check (Tier-1):** `selectBackend` with unset env still returns local (regression). Source of `supabaseBackend.ts` invokes `ingest-telemetry` and `score-application` by name. No service-role key in `apps/web`.

**Commit:** Phase B4: env-gated Supabase BackendPort

### Phase B5 — Backend integration (orchestrator)

**Cite** SPEC.md §7.4–7.7, §7.9.

Re-run scorer vitest. Re-run local four-pack replay. Confirm Greenhouse map + `ats_text_only` prefix/confidence. Do not start Vite. Do not create a cloud project.

**Commit:** Phase B5: backend integration verification

## Dispatch

Phase B1 is the only parallel spawn (F ‖ S). Shared fixture paths exist from B0 before they spawn.

Prompt: this phase section, named area doc (or this file’s Local/Cloud sections), cited SPEC sections, owned/forbidden paths, locked decisions, “report files changed, checks run, ambiguity hit.” Point at Hard rules / Environment gotchas; do not paste SPEC signatures.

## Failure

Two attempts per phase. On the second failure, stop with the real command output. Reproduce the exit-check before accepting a PASS.

## Done

| Backend-relevant SPEC.md §7 | Phase |
|---|---|
| 4 four-pack labels | B1, B2 |
| 5 AI essays stay 0 | B1 |
| 6 Greenhouse `ats_text_only` + low confidence | B1, B5 |
| 7 local loop without Supabase | B2, B5 |
| 8 override keeps probability | B2 |
| 9 confidence lower on webhook than live bot | B1 |
| 10 empty `visitor_id` safe | B1 |

UI scenarios 1–3 are **not** this plan.

Remaining stubs after backend: team Supabase project, recruiter SSO, Jev key, Harvest PATCH, paid GeoIP, entire Vite apply/recruiter UI.
