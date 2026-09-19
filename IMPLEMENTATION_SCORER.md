# IMPLEMENTATION_SCORER

## 1. Purpose

Implement the shared TypeScript scorer: feature extraction, Platt logistic, hard rules, confidence, reasoning, optional Jev, Greenhouse payload map. This is the only place `probability` is computed. Vite and Edge Functions both import it.

## 2. Files owned

`packages/scorer/**` listed in SPEC.md §2, plus `scripts/replay.ts`. Do not write `apps/web/**` except you may not. Do not write `supabase/**`. May read `fixtures/*.json` and `fixtures/packs/*.json`.

## 3. Construction

Sequence:

1. `package.json` name `@anti-slop/scorer`, type module, `vitest` pin. Export `./src/index.ts`.
2. `types.ts` / `constants.ts`: SPEC.md §3.8–3.10 and every numeric / weight in SPEC.md §6. Do not change weights.
3. `features.ts`: `extractFeatures` formulas in SPEC.md §4. Load lexicons from `fixtures/placeholders.json`, `buzzwords.json`, `aiisms.json` (relative path from repo root via `import` of JSON).
4. `geoip.ts`: `classifyIp` (SPEC.md §4). Table from `fixtures/datacenter_cidrs.json`.
5. `jev.ts`: skip without `TYPESAFE_API_KEY`. Constructor-local import of `@typesafe-ai/sdk` or `fetch` to the URL in SPEC.md §4. Timeout `JEV_TIMEOUT_S`. Never import the SDK at module top if that throws without a key — dynamic import inside `maybeJev`.
6. `combine.ts`: logit, sigmoid, hard rules, confidence (SPEC.md §4). `emdash_rate`, `aiism_hit`, `jev_ai_prose` weights are 0.
7. `reasoning.ts`: `renderReasoning` (SPEC.md §4).
8. `greenhouse.ts`: `mapGreenhousePayload` + `verifyGreenhouseSignature`.
9. `index.ts`: `scoreApplication`.
10. Tests: `replay.test.ts` (four packs, labels in SPEC.md §3.12). `features.test.ts` (duration endpoints, empty events → `duration_auto=0`, cadence, paste, jumps). `combine.test.ts` (baseline p near sigmoid(BIAS), threshold). `hard-rules.test.ts` (placeholder+speed → `HARD_RULE_P` and `placeholder_and_speed`; burst → `fingerprint_burst`; AI-isms only → `label=0`). `confidence.test.ts` (`ats_text_only` ≤ `CONF_ATS`, live with events higher, disagreement lowers). `greenhouse.test.ts` (fixture maps to `ats_text_only`, empty events). `reasoning.test.ts` (ATS prefix).
11. `scripts/replay.ts`: load four packs, `scoreApplication` each, `process.exit(1)` if any `label !== expected_label`. Run it with `npx vitest run` via `packages/scorer/tests/replay.test.ts` **or** `node --experimental-strip-types scripts/replay.ts` (Node 22). Do not add `tsx`.

Failure modes:

- Importing fixture JSON from Edge: `_shared/scorer.ts` (owned by SUPABASE) must re-export this package. Keep this package free of Node-only APIs (`fs`). Use static JSON imports.
- Do not add Python / Laya.

Locked decisions: weights are constants. Missing telemetry is not auto-apply.

## 4. Done when

`cd packages/scorer && npx vitest run` is green, including a test that loads all four packs and asserts `human_slow_fill` 0, `bot_burst` 1, `human_ai_essays` 0, `placeholder_bot` 1.
