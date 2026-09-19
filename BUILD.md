# BUILD — Anti-Slop ATS

## Load rule

- Orchestrator reads `BUILD.md` plus the area doc named by the current phase.
- Implementer reads that phase section, the `SPEC.md` sections it cites, and its area doc.
- No document says "read all documents in this folder."
- Sub-agent prompts point at those files. They do not paste hard rules, env gotchas, or SPEC signatures.

## Mission

Ship the PLAN.md demo: a Vite careers form and recruiter UI that score auto-apply vs human with a calibrated probability, confidence, and feature reasoning. Local scoring works without Supabase. Confirm by applying as a human, replaying the four packs, and scoring the Greenhouse fixture. SPEC.md §1 / §7 / §8.

## Hard rules

1. SPEC.md wins on conflict with PLAN.md, area docs, or habit.
2. No scope creep beyond SPEC.md §7–§9.
3. No new dependencies or silent upgrades (SPEC.md §6).
4. Typed errors: SPEC.md §3.15.
5. Spec-stable shapes: SPEC.md §3 and §5.
6. Tests run, not merely exist.
7. Commit per phase with that phase’s Commit line.
8. Label policy and hard rules: SPEC.md locked decisions + §4 `combine`.
9. Missing telemetry: SPEC.md §10.
10. PII and secrets: SPEC.md §8; do not create a cloud Supabase project.

## Environment gotchas

- Local demo is the default: unset `VITE_SUPABASE_URL`.
- Team Supabase project and `get_cost` / `confirm_cost` are human steps (SPEC.md §8).
- FingerprintJS only in the browser.
- Zod 4.6.5, not v3.
- Tailwind v4 via `@tailwindcss/vite`.
- Jev waitlist: leave `TYPESAFE_API_KEY` unset; tests must pass.
- Edge Functions import scorer through `supabase/functions/_shared/scorer.ts`, not a published npm package.
- `supabase start` needs Docker; if Docker is missing, skip live Edge and keep local backend.
- Node pin and `WEB_PORT`: SPEC.md §6.

## Phase 0 — Scaffold (orchestrator-driven)

### Inputs

- SPEC.md §2, §6. Existing `PLAN.md`, `init-idea.md`.

### Agents and ownership

- Orchestrator creates the tree, root workspaces `["apps/web","packages/scorer"]`, pinned manifests, empty modules.

### What the agent does

- Locked decisions: do not edit `PLAN.md`. Placeholder `fixtures/jobs.json` may be two empty-ish valid jobs until Phase 1.

### Exit-check (orchestrator runs this)

- Tier-1: `test -f apps/web/vite.config.ts && test -f packages/scorer/package.json && python3 -c "import json,re; j=json.load(open('fixtures/jobs.json')); n=int(re.search(r'JOB_COUNT = (\\d+)', open('packages/scorer/src/constants.ts').read()).group(1)); assert len(j)==n>=2; assert j[0]['id']=='job_eng' and j[1]['id']=='job_ops'; assert len({x['id'] for x in j})==len(j)"`
- Expected: manifests exist; job catalog length matches `JOB_COUNT`; `job_eng` and `job_ops` remain first.

### Commit

Phase 0: scaffold Vite workspace and stub tree

## Phase 1 — Scorer + fixtures (parallel-2 then integration)

### Inputs

- Phase 0 tree.
- Agent S: IMPLEMENTATION_SCORER.md §2. Forbid `apps/web/**`, `supabase/**`.
- Agent F: IMPLEMENTATION_FIXTURES.md §2. Forbid `apps/web/**`, `packages/scorer/**`, `supabase/**`.
- Cite SPEC.md §§ 3, 4, 6, 9, 10.

### Agents and ownership

- Agent S: `packages/scorer/**`, `scripts/replay.ts`.
- Agent F: `fixtures/**`.
- Shared: `fixtures/jobs.json` and pack paths exist from Phase 0; F overwrites content.

### What the agent does

- Implement cited SPEC sections per the area doc.
- Locked decisions: Jev skipped without key. No Laya. Weights unchanged.

### Exit-check (orchestrator runs this)

- Tier-1: `cd packages/scorer && npx vitest run`
- Expected: green; pack labels 0,1,0,1; `human_ai_essays` stays 0 with nonzero `emdash_rate` or `aiism_hit`; `ats_text_only` confidence `<` live bot-pack confidence; `visitor_id=""` does not throw.

### Commit

Phase 1: logistic scorer and labeled replay packs

## Phase 2 — Vite apply + recruiter (single)

### Inputs

- Working scorer.
- Agent W: IMPLEMENTATION_WEB.md §2. Forbid `packages/scorer/**`, `supabase/**`, `fixtures/**` (read-only JSON imports allowed).
- Cite SPEC.md §§ 3.1–3.12, 4 (`BackendPort`, `selectBackend`), 5.1–5.3, 5.5, 6, 7.1–7.5, 7.7–7.8, 7.10, 9.

### Agents and ownership

- Agent W: IMPLEMENTATION_WEB.md §2.

### What the agent does

- Local backend first. Recruiter + replay toggle in this phase.
- Locked decisions: `selectBackend` uses local when env unset.

### Exit-check (orchestrator runs this)

- Tier-3: `scripts/dev.sh`; `curl -sI http://127.0.0.1:${WEB_PORT:-5173}/` is HTTP 200; `rg -n "listJobs|ReplayToggle|probability" apps/web/src/routes/*.tsx` hits Home, Apply, Recruiter; `rg -n "ip_hash|raw IP" apps/web/src/routes/Recruiter.tsx` is empty.
- Expected: Vite serves the SPA; recruiter does not reference `ip_hash`.

### Commit

Phase 2: Vite apply flow, local backend, recruiter replay

## Phase 3 — Supabase files (single)

### Inputs

- Agent B: IMPLEMENTATION_SUPABASE.md §2. Forbid `apps/web/**`, `packages/scorer/src/**`, `fixtures/**`.
- Cite SPEC.md §§ 3.16–3.17, 4 (Edge-facing), 5.4–5.5, 6 env, 8, 9.

### Agents and ownership

- Agent B: `supabase/**`.

### What the agent does

- Migrations, RLS, functions. Do not run `supabase projects create`.
- Locked decisions: webhook `verify_jwt=false`. Harvest PATCH skipped without key.

### Exit-check (orchestrator runs this)

- Tier-1: `rg -n "create table" supabase/migrations/0001_init.sql` lists `jobs`, `application_sessions`, `telemetry_events`, `applications`, `detections`, `known_fingerprints`, `known_ips`, `recruiters`.
- Tier-2: if Docker: `npx supabase start` and apply migration. If not: skip with note; still run scorer tests.
- Expected: SQL present; local web still works with env unset.

### Commit

Phase 3: Supabase schema and Edge Function wrappers

## Phase 4 — Integration (orchestrator-driven)

### Inputs

- All prior phases. Cite SPEC.md §7.

### Agents and ownership

- Orchestrator only.

### What the agent does

- Run the matrix. Fix wiring only.

### Exit-check (orchestrator runs this)

- Tier-1: `cd packages/scorer && npx vitest run`
- Tier-2: Greenhouse map + `ats_text_only` confidence (existing tests).
- Tier-3: Vite up; local apply path; recruiter override does not change `probability` (unit or in-process).
- Expected: §7 automatable items pass. Cloud org and live GH remain stubs.

### Commit

Phase 4: integration verification

## Dispatch

Parallel agents get non-overlapping paths. Shared interfaces exist on disk before they spawn (SPEC.md + Phase 0 fixture paths).

Prompt contents: the phase section, the named area doc, cited SPEC.md sections, owned/forbidden paths, locked decisions, “report files changed, checks run, ambiguity hit.” Point at Hard rules and Environment gotchas; do not paste them.

Phase 1 is the only parallel spawn (S ‖ F).

## Failure

Two attempts per phase. On the second failure, stop with the real command output. A sub-agent PASS is a claim: reproduce the exit-check. A spawn fail is a lost report: check disk before retrying.

## Done

| Scenario (SPEC.md §7) | Phase exit-check |
|---|---|
| 1 two jobs | 0, 2 |
| 2 human apply → 0 | 1 human_slow_fill, 2 localBackend |
| 3 recruiter fields, no PII | 2 |
| 4 four-pack labels | 1 vitest, 2 replay |
| 5 AI essays stay 0 | 1 hard-rules + human_ai_essays |
| 6 Greenhouse ats_text_only + low confidence | 1 greenhouse/confidence tests |
| 7 local loop without Supabase | 2, 4 |
| 8 override keeps probability | 2 / 4 |
| 9 confidence lower on webhook than live bot | 1 confidence.test |
| 10 Fingerprint failure safe | 2 (`visitor_id=""`) |

Final report shape: commits, SPEC.md §2 paths, checks by tier, remaining unverified tiers, remaining MVP stubs (SPEC.md §9: cloud project, recruiter SSO, Jev key, Harvest PATCH, GeoIP feed).
