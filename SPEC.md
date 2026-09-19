# SPEC — Anti-Slop ATS

Canonical contract. Types, signatures, events, constants, pins, acceptance, stubs, and out-of-scope live only here. Product intent is locked in `PLAN.md`; this file is the build contract. Do not rewrite `PLAN.md`.

Locked product decisions (from PLAN.md):

- Standalone demo named `anti-slop-ats`. Live ATS is not required.
- `label = 1` means unattended auto-apply / bot-filled. A human who uses AI to draft answers but fills the form is `0`. Text-only AI-isms never flip the label.
- Primary demo path is a first-party Vite careers form (`live_form`). `ats_text_only` is a Greenhouse-shaped webhook fixture.
- Scoring is a Platt-scaled logistic on engineered features, plus two hard rules. Not a giant LLM. Reasoning is template-assembled from top features.
- Jev is optional behind `TYPESAFE_API_KEY`; skip if absent. Laya is out of v1 (will not run on Supabase Edge).
- UI must score locally when Supabase env is unset. Cloud project lives on the team org after cost confirm; implementers ship migrations and functions, they do not create the org.

## 1. System overview

A Vite + React app hosts two multi-section job applications and a recruiter dashboard. The apply form records per-field telemetry and a FingerprintJS `visitorId`, then asks a `BackendPort` to ingest events and score the submission. The scorer (`packages/scorer`) extracts deterministic features, applies a logistic combiner, then hard rules, and returns `label`, `probability`, `confidence`, `mode`, `reasoning`, and `features`. Locally the backend is in-memory. When `VITE_SUPABASE_URL` is set, the same scorer runs in Edge Functions and rows land in Postgres with Realtime on `detections`. A Greenhouse webhook function scores `ats_text_only` from a checked-in Harvest fixture.

```
candidate --> apply form --telemetry--> BackendPort.ingestTelemetry
                 | submit answers --> BackendPort.scoreApplication
                 |                      packages/scorer
                 |                      optional Jev noul features
                 v
              detections --> recruiter dashboard (+ fixture replay toggle)
Harvest fixture --> greenhouse-webhook --> scorer(mode=ats_text_only)
```

## 2. Repo layout

Every path an agent may create. `PLAN.md` and `init-idea.md` already exist; do not recreate or edit them.

```
PLAN.md
init-idea.md
SPEC.md
BUILD.md
IMPLEMENTATION_WEB.md
IMPLEMENTATION_SCORER.md
IMPLEMENTATION_SUPABASE.md
IMPLEMENTATION_FIXTURES.md

package.json
package-lock.json
tsconfig.base.json

apps/web/package.json
apps/web/tsconfig.json
apps/web/tsconfig.app.json
apps/web/vite.config.ts
apps/web/index.html
apps/web/src/main.tsx
apps/web/src/App.tsx
apps/web/src/index.css
apps/web/src/vite-env.d.ts
apps/web/src/lib/types.ts
apps/web/src/lib/backend.ts
apps/web/src/lib/localBackend.ts
apps/web/src/lib/supabaseBackend.ts
apps/web/src/lib/telemetry.ts
apps/web/src/lib/fingerprint.ts
apps/web/src/routes/Home.tsx
apps/web/src/routes/Apply.tsx
apps/web/src/routes/Recruiter.tsx
apps/web/src/components/JobCard.tsx
apps/web/src/components/ApplicationForm.tsx
apps/web/src/components/SectionNav.tsx
apps/web/src/components/FieldRenderer.tsx
apps/web/src/components/DetectionRow.tsx
apps/web/src/components/ReasoningPanel.tsx
apps/web/src/components/ReplayToggle.tsx

packages/scorer/package.json
packages/scorer/tsconfig.json
packages/scorer/src/index.ts
packages/scorer/src/types.ts
packages/scorer/src/constants.ts
packages/scorer/src/features.ts
packages/scorer/src/combine.ts
packages/scorer/src/reasoning.ts
packages/scorer/src/geoip.ts
packages/scorer/src/jev.ts
packages/scorer/src/greenhouse.ts
packages/scorer/tests/features.test.ts
packages/scorer/tests/combine.test.ts
packages/scorer/tests/hard-rules.test.ts
packages/scorer/tests/confidence.test.ts
packages/scorer/tests/greenhouse.test.ts
packages/scorer/tests/reasoning.test.ts
packages/scorer/tests/replay.test.ts

supabase/config.toml
supabase/migrations/0001_init.sql
supabase/seed.sql
supabase/functions/ingest-telemetry/index.ts
supabase/functions/score-application/index.ts
supabase/functions/greenhouse-webhook/index.ts
supabase/functions/_shared/cors.ts
supabase/functions/_shared/scorer.ts

fixtures/jobs.json
fixtures/datacenter_cidrs.json
fixtures/placeholders.json
fixtures/buzzwords.json
fixtures/aiisms.json
fixtures/packs/human_slow_fill.json
fixtures/packs/bot_burst.json
fixtures/packs/human_ai_essays.json
fixtures/packs/placeholder_bot.json
fixtures/greenhouse/application_submitted.json

scripts/dev.sh
scripts/replay.ts
```

## 3. Data types

JSON / jsonb keys are snake_case on the wire.

### 3.1 IngestMode

`IngestMode = "live_form" | "ats_text_only"`

`live_form` has behavioral telemetry. `ats_text_only` has answers and optional IP only.

| IngestMode | ApplicationRow.source | Detection.source | Detection.mode |
|---|---|---|---|
| live_form | live_form | live (form submit) or replay (pack) | live_form |
| ats_text_only | ats_text_only | webhook_fixture | ats_text_only |

### 3.2 FieldType

`FieldType = "text" | "email" | "textarea" | "select" | "multiselect" | "eeo"`

Demo form fields. Not a live Greenhouse field-type enum. EEO fields are optional and never required.

### 3.3 Field / Section / Job

```
Field { name: string, type: FieldType, label: string, required: bool, options: string[] }
Section { id: string, title: string, fields: Field[] }
Job {
  id: string                      // "job_eng" | "job_ops"
  slug: string
  title: string
  department: string
  location: string
  jd_text: string                 // plain text for buzzword overlap
  sections: Section[]
}
```

Invariants: `fixtures/jobs.json` length = `JOB_COUNT` (2). Each job has sections in order `contact`, `experience`, then 3–5 open `textarea` questions, then optional `eeo`. `contact` includes `first_name`, `last_name`, `email`. No resume file field in v1.

### 3.4 TelemetryEventType

`TelemetryEventType = "focus" | "blur" | "input" | "paste" | "section_change" | "submit"`

No `keydown` payloads and no field text. `paste` stores `paste_len` only.

### 3.5 TelemetryEvent

```
TelemetryEvent {
  t_ms: int                       // ms since session start, >= 0
  type: TelemetryEventType
  field: string | null            // Field.name; required except submit
  section: string | null          // Section.id when type=section_change
  input_len: int | null
  paste_len: int | null
}
```

### 3.6 ClientSignals

```
ClientSignals {
  visitor_id: string              // FingerprintJS visitorId, or ""
  ua: string                      // navigator.userAgent
  webdriver: bool
  tz: string
  languages: string[]             // max 8
}
```

### 3.7 AnswerMap

`AnswerMap = object<string, string | string[] | null>`

Keys are `Field.name`. Email is stored hashed on the `applications` row (`email_hash`), never as raw email in detections. The apply payload may include raw email; the backend hashes with `EMAIL_HASH_PEPPER` before persist and strips it from `answers` jsonb (replace with `email_hash` key).

### 3.8 ScoreInput

```
ScoreInput {
  mode: IngestMode
  job: Job
  answers: AnswerMap              // email already hashed or omitted
  events: TelemetryEvent[]        // empty in ats_text_only
  signals: ClientSignals
  ip: string                      // "" if unknown
  burst: { visitor_n: int, ip_n: int }
}
```

### 3.9 FeatureVector

Raw + scaled fields. Scores used in the logit are in `[0, 1]` unless noted.

```
FeatureVector {
  duration_ms: int
  expected_human_ms: int
  field_count: int
  duration_auto: float
  cadence_low_var: float
  simultaneous_fills: float
  no_dwell: float
  section_jumps: int
  section_jump_rate: float
  paste_ratio: float
  visitor_burst: float            // 0 or 1
  ua_automation: float            // 0 or 1
  datacenter_ip: float            // 0 or 1
  ip_burst: float                 // 0 or 1
  placeholder_hits: int
  placeholder_hit: float          // 0 or 1
  emdash_rate: float              // reasoning only; logit weight 0
  aiism_hit: float                // reasoning only; logit weight 0
  buzzword_density: float
  jev_generic: float              // 0 if Jev skipped
  jev_placeholder: float
  jev_ai_prose: float             // reasoning only; logit weight 0
  behavior_score: float           // mean of behavioral [0,1] scores
  text_score: float               // mean of text [0,1] scores including weak
  hard_rule: "none" | "placeholder_and_speed" | "fingerprint_burst"
}
```

### 3.10 Detection

```
Detection {
  id: string                      // "det_" + 22 url-safe
  application_id: string
  job_id: string
  created_at_ms: int
  label: 0 | 1
  probability: float              // [0, 1]
  threshold: float                // === LABEL_THRESHOLD
  confidence: float               // [0, 1], not equal to probability
  mode: IngestMode
  reasoning: string
  features: FeatureVector
  model_version: string           // MODEL_VERSION
  source: "live" | "replay" | "webhook_fixture"
  overridden_label: 0 | 1 | null  // recruiter override; null if none
}
```

`label = 1` iff `probability >= threshold`. Recruiter UI may set `overridden_label` without changing `probability`.

### 3.11 ApplicationSession / ApplicationRow

```
ApplicationSession {
  id: string                      // session_id, 8–64 [A-Za-z0-9_-]
  job_id: string
  visitor_id: string
  ip_hash: string                 // sha256(IP_HASH_PEPPER + ip); raw IP not stored
  started_at_ms: int
}

ApplicationRow {
  id: string                      // "app_" + 22 url-safe
  session_id: string
  job_id: string
  created_at_ms: int
  answers: AnswerMap              // no raw email
  email_hash: string
  source: "live_form" | "ats_text_only"
  duration_ms: int
}
```

### 3.12 ReplayPack

```
ReplayPack {
  id: "human_slow_fill" | "bot_burst" | "human_ai_essays" | "placeholder_bot"
  expected_label: 0 | 1
  input: ScoreInput
}
```

`human_ai_essays.expected_label` is 0. `bot_burst` and `placeholder_bot` are 1. `human_slow_fill` is 0.

### 3.13 Greenhouse fixture map

`fixtures/greenhouse/application_submitted.json` is a Harvest “Candidate has submitted application” payload. `mapGreenhousePayload(payload) -> ScoreInput` with `mode="ats_text_only"`, `events=[]`, `signals.visitor_id=""`.

### 3.14 Jev noul set (optional)

State: `{ job: { title, jd_text }, answers: object<string,string> }` (textareas only).

| ID | instructions |
|---|---|
| leftover_placeholder | Does any long-form answer in `answers` contain leftover placeholders such as [Company], TBD, lorem ipsum, or unfilled merge fields? |
| generic_unrelated | Do the long-form answers ignore `job.title` and read as a generic mass-application? |
| ai_prose | Do the long-form answers show typical LLM prose (em dashes, “delve”, “leverage”, “passionate about”)? |

Noul ID → FeatureVector key: `leftover_placeholder`→`jev_placeholder`, `generic_unrelated`→`jev_generic`, `ai_prose`→`jev_ai_prose`.

If `TYPESAFE_API_KEY` is empty, skip the call; `jev_*` features stay 0.

### 3.15 Error body

```
ErrorBody { error: ErrorCode, detail: string }
ErrorCode = "JOB_NOT_FOUND" | "VALIDATION_ERROR" | "UNAUTHORIZED" | "BAD_SIGNATURE" | "NOT_FOUND"
```

| ErrorCode | HTTP |
|---|---|
| JOB_NOT_FOUND | 404 |
| NOT_FOUND | 404 |
| VALIDATION_ERROR | 422 |
| UNAUTHORIZED | 401 |
| BAD_SIGNATURE | 401 |

### 3.16 Local store (mutable shared state)

In-process maps inside `localBackend.ts` when Supabase env is unset.

| Store | Enter | In-place | Exit | Consumer |
|---|---|---|---|---|
| `sessions` | `createSession` inserts `ApplicationSession` | none | TTL `SESSION_TTL_S` deletes | `scoreApplication` reads session |
| `events` | `ingestTelemetry` appends | FIFO drop if `> SESSION_MAX_EVENTS` | deleted after successful score | `scoreApplication` copies then deletes |
| `applications` | score insert | none | none in v1 | dashboard list |
| `detections` | score insert | `overrideLabel` sets `overridden_label` | none | recruiter Realtime/local subscribe |
| `known_fingerprints` | increment on score | `{ visitor_id, window_start_ms, n }` | window slide `BURST_WINDOW_S` | `burst.visitor_n` |
| `known_ips` | increment on score (hashed) | same shape | same | `burst.ip_n` |

Process restart clears local stores. Supabase tables persist.

### 3.17 Postgres tables (Supabase)

Columns match §3.11 / §3.10 / §3.5 plus:

- `jobs` — `Job` fields; `sections` jsonb. Enter: seed. No update in v1.
- `application_sessions` — §3.11. Enter: `createSession` / Edge ingest. No TTL delete in v1 (unlike local §3.16).
- `telemetry_events` — `session_id` + §3.5 columns, `created_at`. Enter: ingest. Append-only; no delete (local buffer still deletes after score).
- `applications` / `detections` — enter from `score-application`, `replayPack` (via submit path), or `greenhouse-webhook`. `detections` in-place: `overrideLabel` only.
- `known_fingerprints` — `visitor_id`, `n`, `window_start`. Same increment/slide as §3.16.
- `known_ips` — `ip_hash`, `n`, `window_start`. Same increment/slide as local `known_ips`.
- `recruiters` — `user_id` uuid references `auth.users`. Enter: manual insert. Unused in local demo.

RLS: anon `INSERT` on `application_sessions`, `telemetry_events`, `applications` (no select of others’ emails). `detections` `SELECT`/`UPDATE(overridden_label)` for `recruiters` only. `jobs` public `SELECT`. Service role for Edge Functions.

## 4. Interfaces

`extractFeatures(input: ScoreInput, lists: Lexicons) -> FeatureVector`  
`duration_ms` = last event `t_ms` − first, or `0` if `<2` events.  
`field_count` = count of non-eeo fields.  
`expected_human_ms = (DURATION_BASE_S + DURATION_TEXTAREA_S * n_textarea + DURATION_TEXT_S * n_text) * MS_PER_S`.  
`duration_auto = 1` if `duration_ms <= FAST_FRACTION * expected_human_ms`; `0` if `duration_ms >= expected_human_ms`; else linear. Empty events → `duration_auto = 0`.  
`cadence_low_var`: inter-`focus` Δt population variance; `1` if `n>=3` and variance `< CADENCE_VAR_MAX_MS2`, else `0`.  
`simultaneous_fills = 1` if any two `input` events on different fields have `|Δt_ms| < SIMUL_MS`.  
`no_dwell = 1` if any textarea has `input_len >= DWELL_LEN` and (blur−focus) `< DWELL_MIN_MS` (0 if no such pair).  
`section_jumps`: count of `section_change` whose `section` is not the next section in `job.sections` order.  
`section_jump_rate = clip(section_jumps / max(sections.length - 1, 1), 0, 1)`.  
`paste_ratio = pasted_chars / max(sum of textarea input_len, 1)`, clip `[0,1]`.  
`visitor_burst = 1` iff `burst.visitor_n >= BURST_N`.  
`ip_burst = 1` iff `burst.ip_n >= BURST_N`.  
`ua_automation = 1` iff `signals.webdriver` or UA matches `HEADLESS_UA_RE`.  
`datacenter_ip` from `classifyIp`.  
`placeholder_hits` = regex hits from `fixtures/placeholders.json` on concatenated textareas. `placeholder_hit = 1` iff hits ≥ 1.  
`emdash_rate = clip((U+2014 count / max(words/WORDS_PER_RATE,1)) / EMDASH_RATE_CLIP, 0, 1)`.  
`aiism_hit = 1` iff any `fixtures/aiisms.json` phrase matches.  
`buzzword_density = clip(hits / max(words,1) / BUZZWORD_DENSITY_CLIP, 0, 1)` using `fixtures/buzzwords.json` minus tokens that appear in `job.jd_text` (overlap with the JD does not count as stuffing).  
`behavior_score = mean(duration_auto, cadence_low_var, simultaneous_fills, no_dwell, section_jump_rate, paste_ratio)`.  
`text_score = mean(placeholder_hit, emdash_rate, aiism_hit, buzzword_density, jev_generic, jev_placeholder, jev_ai_prose)`.

`classifyIp(ip: string) -> "rfc1918" | "loopback" | "datacenter" | "unknown"`  
loopback `127.0.0.0/8`, `::1`; rfc1918 `10/8`, `172.16/12`, `192.168/16`; else longest-prefix in `fixtures/datacenter_cidrs.json`. `datacenter_ip = 1` iff class is `datacenter`. `""` → unknown → 0.

`maybeJev(state) -> { jev_generic, jev_placeholder, jev_ai_prose }`  
If no `TYPESAFE_API_KEY`, return zeros. Else `POST https://api.typesafe.ai/v1/systemone` with `model=JEV_MODEL`, three noul questions (§3.14), timeout `JEV_TIMEOUT_S`. Map noul → the three floats. On error, zeros.

`combine(features: FeatureVector, mode: IngestMode) -> { probability, confidence, hard_rule }`  
Logit `z = BIAS + Σ W_k * x_k` for keys in `LOGIT_WEIGHTS` (SPEC.md §6). `p_model = 1 / (1 + exp(-z))`.  
Hard rules (after model):  
- if `placeholder_hit==1` AND `duration_auto >= HARD_SPEED_MIN` → `hard_rule="placeholder_and_speed"`, `probability = max(p_model, HARD_RULE_P)`.  
- else if `visitor_burst==1` → `hard_rule="fingerprint_burst"`, `probability = max(p_model, HARD_RULE_P)`.  
- else `hard_rule="none"`, `probability = p_model`.  
AI-ism features have weight `0`; they cannot change `p_model`.  
`confidence`: `base = CONF_LIVE` if `mode=="live_form"` and `features.duration_ms > 0`; `CONF_ATS` if `ats_text_only`; `CONF_DEGRADED` if `live_form` and empty events. `disagreement = abs(behavior_score - text_score)`. `confidence = clip(base * (1 - CONF_DISAGREE * disagreement), CONF_MIN, CONF_MAX)`. If `hard_rule != "none"`, `confidence = max(confidence, CONF_HARD)`.

`renderReasoning(features, probability, mode) -> string`  
Deterministic, semicolon-separated clauses, max 4, from the highest contributing *named* signals with feature ≥ `SIGNAL_MENTION_MIN`, plus raw `section_jumps >= 1` or `placeholder_hits >= 1`. Always include `duration_ms` and `field_count` when `mode=="live_form"`. Burst clause uses `BURST_N` and `BURST_WINDOW_MIN`. If `mode=="ats_text_only"`, prefix `"ATS text-only (no form telemetry). "`.

`scoreApplication(input: ScoreInput) -> Detection` minus db ids: compute features (call `maybeJev` only when key set), `combine`, `renderReasoning`, `label` from threshold, `model_version=MODEL_VERSION`. Caller assigns `id`, `application_id`, `created_at_ms`, `source`.

`mapGreenhousePayload(payload: object) -> ScoreInput`  
Target job `job_eng`. `mode="ats_text_only"`. `events=[]`. `burst` zeros. `ip` from `payload.application.location` if it looks like an IP, else `""`.

| Harvest path | AnswerMap key |
|---|---|
| `payload.candidate.first_name` | first_name |
| `payload.candidate.last_name` | last_name |
| `payload.candidate.email` | email |
| `payload.application.answers[]` or `custom_fields[]` where `question` or `name` equals a `Field.label` (case-insensitive) | that field’s `name` |

`BackendPort` (web):

`listJobs() -> Job[]`  
`getJob(slug: string) -> Job | null`  
`createSession(job_id: string, signals: ClientSignals, ip: string) -> { session_id: string }`  
`ingestTelemetry(session_id: string, events: TelemetryEvent[]) -> { accepted: int }`  
`submitApplication(session_id: string, answers: AnswerMap, signals: ClientSignals) -> Detection`  
`listDetections() -> Detection[]`  
`overrideLabel(id: string, label: 0 | 1) -> Detection`  
`replayPack(id: ReplayPack.id) -> Detection`  
`subscribeDetections(cb: (d: Detection) => void) -> () => void`  
Enter: register `cb`. Exit: returned unsub removes it. Local process restart clears listeners. Cloud: Realtime unsubscribe.

`selectBackend() -> BackendPort`  
If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` nonempty → `supabaseBackend`. Else `localBackend`.

`verifyGreenhouseSignature(rawBody: string, header: string, secret: string) -> bool`  
HMAC-SHA256 hex of `rawBody` with `GREENHOUSE_WEBHOOK_SECRET`; compare to header `Greenhouse-Webhook-Signature` (or the fixture’s `signature` field in local tests).

## 5. Events / side effects

### 5.1 `ingest_telemetry` body

Field order: `session_id`, `events`.

### 5.2 `score_application` body (Edge)

Field order: `session_id`, `answers`, `client_signals`.

### 5.3 `detection` (API / Realtime payload)

Field order: `id`, `application_id`, `job_id`, `created_at_ms`, `label`, `probability`, `threshold`, `confidence`, `mode`, `reasoning`, `features`, `model_version`, `source`, `overridden_label`.

### 5.4 Edge Functions

| Function | JWT | Auth | Side effect |
|---|---|---|---|
| `ingest-telemetry` | verify on (anon) | anon | insert `telemetry_events` |
| `score-application` | verify on (anon) | anon | insert `applications` + `detections`; bump fingerprint/ip counters; hash email + IP |
| `greenhouse-webhook` | verify **off** | `GREENHOUSE_WEBHOOK_SECRET` | score `ats_text_only`; if `GREENHOUSE_HARVEST_KEY` set, PATCH Harvest custom field `auto_apply_probability` (skip if unset) |

### 5.5 Recruiter Realtime

Channel: Postgres changes on `detections` INSERT/UPDATE. Local backend: `subscribeDetections` fires the callback synchronously after insert/override.

## 6. Constants and pins

| Name | Value | Unit |
|---|---|---|
| LABEL_THRESHOLD | 0.70 | probability |
| JOB_COUNT | 2 | jobs |
| MS_PER_S | 1000 | milliseconds / second |
| WORDS_PER_RATE | 100 | words |
| CONF_EQ_EPS | 0.01 | confidence |
| BURST_WINDOW_MIN | 10 | minutes (= BURST_WINDOW_S / 60) |
| DURATION_BASE_S | 20 | seconds |
| DURATION_TEXTAREA_S | 25 | seconds / textarea |
| DURATION_TEXT_S | 8 | seconds / text-or-email |
| FAST_FRACTION | 0.40 | fraction of expected_human_ms |
| HARD_SPEED_MIN | 0.70 | duration_auto |
| HARD_RULE_P | 0.92 | probability |
| CADENCE_VAR_MAX_MS2 | 2500 | milliseconds² |
| SIMUL_MS | 30 | milliseconds |
| DWELL_LEN | 40 | characters |
| DWELL_MIN_MS | 1500 | milliseconds |
| EMDASH_RATE_CLIP | 2.0 | em dashes / 100 words → 1.0 |
| BUZZWORD_DENSITY_CLIP | 0.12 | hits / word → 1.0 |
| SIGNAL_MENTION_MIN | 0.35 | feature score |
| BURST_WINDOW_S | 600 | seconds |
| BURST_N | 3 | applications |
| SESSION_TTL_S | 7200 | seconds |
| SESSION_MAX_EVENTS | 5000 | events |
| TELEMETRY_FLUSH_MS | 2000 | milliseconds |
| JEV_TIMEOUT_S | 2.5 | seconds |
| JEV_MODEL | `"jev-1.13.0"` | model id |
| MODEL_VERSION | `"platt-1.0.0"` | version id |
| CONF_LIVE | 0.90 | confidence |
| CONF_ATS | 0.55 | confidence |
| CONF_DEGRADED | 0.50 | confidence |
| CONF_HARD | 0.85 | confidence |
| CONF_DISAGREE | 0.50 | weight |
| CONF_MIN | 0.15 | confidence |
| CONF_MAX | 0.99 | confidence |
| HEADLESS_UA_RE | `HeadlessChrome\|Playwright\|Puppeteer\|Selenium` | UA regex |
| EMAIL_HASH_PEPPER | env `EMAIL_HASH_PEPPER` or `"dev-email-pepper"` | utf-8 |
| IP_HASH_PEPPER | env `IP_HASH_PEPPER` or `"dev-ip-pepper"` | utf-8 |
| WEB_PORT | 5173 | tcp port |
| BAKEOFF_PACKS | 4 | packs |

`BIAS = -2.2` (logit units).

`LOGIT_WEIGHTS` (logit units per feature in `[0,1]`):

| key | weight |
|---|---|
| duration_auto | 2.4 |
| cadence_low_var | 1.2 |
| simultaneous_fills | 1.0 |
| no_dwell | 1.0 |
| section_jump_rate | 1.3 |
| paste_ratio | 1.5 |
| visitor_burst | 2.0 |
| ua_automation | 0.6 |
| datacenter_ip | 0.8 |
| ip_burst | 1.2 |
| placeholder_hit | 1.0 |
| buzzword_density | 0.8 |
| jev_generic | 0.7 |
| jev_placeholder | 0.5 |
| emdash_rate | 0.0 |
| aiism_hit | 0.0 |
| jev_ai_prose | 0.0 |

`SIGNAL_NAMES`:

| key | phrase |
|---|---|
| duration_auto | filled far faster than a human would |
| cadence_low_var | machine-regular inter-field cadence |
| simultaneous_fills | multiple fields filled at once |
| no_dwell | no dwell on long-text questions |
| section_jump_rate | non-linear section jumps |
| paste_ratio | essay answers were pasted |
| visitor_burst | same fingerprint burst-applied |
| ua_automation | automation user-agent or webdriver |
| datacenter_ip | datacenter IP |
| ip_burst | same IP burst-applied |
| placeholder_hit | leftover placeholder text |
| buzzword_density | buzzword stuffing vs the JD |
| jev_generic | judge flagged a generic mass-application |
| jev_placeholder | judge flagged leftover placeholders |

### Pins

| Component | Pin | Registry |
|---|---|---|
| Node | 22.14.0 | node |
| vite | 8.3.0 | npm |
| @vitejs/plugin-react | 6.1.1 | npm |
| react | 19.3.0 | npm |
| react-dom | 19.3.0 | npm |
| react-router-dom | 7.18.4 | npm |
| typescript | 7.0.2 | npm |
| @types/node | 26.6.2 | npm |
| @types/react | 19.3.0 | npm |
| @types/react-dom | 19.3.0 | npm |
| tailwindcss | 4.3.3 | npm |
| @tailwindcss/vite | 4.3.3 | npm |
| zod | 4.6.5 | npm |
| @fingerprintjs/fingerprintjs | 5.2.0 | npm |
| @supabase/supabase-js | 2.116.0 | npm |
| supabase | 2.117.0 | npm |
| @typesafe-ai/sdk | 0.6.0 | npm |
| vitest | 5.0.1 | npm |

`validation: all pins reachable as of 2026-09-19`.

Env (never commit secrets): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TYPESAFE_API_KEY`, `GREENHOUSE_WEBHOOK_SECRET`, `GREENHOUSE_HARVEST_KEY`, `EMAIL_HASH_PEPPER`, `IP_HASH_PEPPER`.

## 7. Acceptance scenarios

A human can:

1. Open `/` and see exactly two jobs with distinct titles and departments.
2. Apply on `/apply/:slug` through contact → experience → 3–5 questions → optional EEO; submit a slow typed application and see the recruiter list show `label=0` with reasoning that cites duration/dwell.
3. Open `/recruiter` and see `probability`, `confidence`, `label`, `reasoning`, and features; no raw email, raw IP, or `ip_hash`.
4. Use the replay toggle to run all four packs: `human_slow_fill` → 0, `human_ai_essays` → 0, `bot_burst` → 1, `placeholder_bot` → 1 (`hard_rule` is `placeholder_and_speed` or model ≥ threshold).
5. Confirm `human_ai_essays` has high `emdash_rate` or `aiism_hit` and still `label=0`.
6. Replay or POST the Greenhouse fixture and get `mode="ats_text_only"`, `confidence <= CONF_ATS + CONF_EQ_EPS`, and a reasoning prefix about missing telemetry.
7. With Supabase env unset, the full apply → detect loop works (local backend).
8. Override a detection’s label in the recruiter UI; `probability` is unchanged and `overridden_label` is set.
9. See `confidence` lower on the webhook fixture than on a live_form bot replay.
10. Submit with FingerprintJS unavailable (`visitor_id=""`) and still get a detection (no crash).

## 8. Out of scope

- Live Greenhouse, Workday, Ashby, Lever, or iCIMS tenant.
- Laya / any Python GPU worker.
- Training on real candidate data; weights are §6 constants.
- Browser-extension detection of named vendors (Tsenta, Simplify, LazyApply, …) beyond generic automation signals.
- Storing raw resumes or raw email / raw IP.
- LLM-polished reasoning.
- Creating the team Supabase org or running `get_cost` / `confirm_cost` from this repo (human team step). Shipping `supabase/**` files is in scope; connecting them is env-gated.
- Fingerprint Pro or paid ASN feeds.
- Blocking or auto-rejecting candidates.

## 9. MVP-stubbed surfaces

| Surface | Stub behavior | Eventual form | File |
|---|---|---|---|
| Supabase cloud | Local in-memory `BackendPort` when env unset | Team-org project + deployed functions | `apps/web/src/lib/localBackend.ts` |
| Recruiter auth | Local: no auth. Cloud: RLS on `recruiters` (empty table ⇒ no cloud reads) | Team SSO | `supabase/migrations/0001_init.sql` |
| Jev | `maybeJev` returns zeros when key unset (not a fake judge) | Same function with `TYPESAFE_API_KEY` | `packages/scorer/src/jev.ts` |
| Harvest PATCH | Skip unless `GREENHOUSE_HARVEST_KEY` | PATCH `auto_apply_probability` | `supabase/functions/greenhouse-webhook/index.ts` |
| GeoIP | CIDR table + RFC1918/loopback | Paid ASN feed | `packages/scorer/src/geoip.ts` |
| Realtime | Local sync callback | Supabase Realtime on `detections` | `apps/web/src/lib/localBackend.ts` |

## 10. Push/pull reconciliation

| Field | Authoritative | Seed | Missing / reconnect |
|---|---|---|---|
| Telemetry events | Push ingest | empty | empty events → degraded confidence, human-ward features |
| Answers | Push submit | n/a | 422, no row |
| Jobs | Pull `fixtures/jobs.json` / `jobs` table | seed.sql copies fixtures | local backend reads the file |
| Detection | Push scorer in the submit request | n/a | scorer throw → no detection; UI error (local). Edge: 500, no partial detection |
| Burst counters | Push increment on score | 0 | unknown visitor/ip → n=1 after first score |
| Recruiter override | Push UI | null | does not recompute probability |

Default: push owns live detections; pull owns job catalog and fixture packs.
