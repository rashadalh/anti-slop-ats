# IMPLEMENTATION_FIXTURES

## 1. Purpose

Author two jobs, lexicons, CIDRs, four replay packs, and the Harvest webhook fixture. This area is ground truth for labels. It does not implement the logistic.

## 2. Files owned

`fixtures/**` listed in SPEC.md §2. Do not write `apps/web/**`, `packages/scorer/**`, or `supabase/**`.

## 3. Construction

Sequence:

1. `placeholders.json`: regex strings including `\\[Company\\]`, `\\[Company Name\\]`, `lorem ipsum`, `\\bTBD\\b`, `\\bN/A\\b` on essays, `\\{\\{.*\\}\\}`.
2. `buzzwords.json`: stuffing tokens (`synergy`, `leverage`, `stakeholders`, `robust`, `utilize`, `streamline`, `best-of-breed`, `results-driven`).
3. `aiisms.json`: `delve`, `in today's fast-paced`, `passionate about leveraging`, `I am writing to express`.
4. `datacenter_cidrs.json`: `{cidr,name}[]` covering any pack `ip` used as datacenter (e.g. `3.0.0.0/8`).
5. `jobs.json`: exactly two jobs, slugs stable (`job-eng`, `job-ops` or `job_eng` matching SPEC.md §3.3 `id` — use `id` `"job_eng"` / `"job_ops"` and slugs `"eng"` / `"ops"`). Sections: contact (first_name, last_name, email), experience (2–3 fields), 3–5 textareas, optional eeo. Distinct titles/departments. `jd_text` long enough for overlap tests.
6. Packs (SPEC.md §3.12):
   - `human_slow_fill`: ordered focuses, `duration_ms >= expected_human_ms`, paste_ratio ~ 0, no placeholders, rfc1918 ip, `webdriver=false`, `expected_label=0`.
   - `bot_burst`: `duration_auto` path (duration << expected), `section_jumps >= 2`, high paste, `burst.visitor_n >= BURST_N`, `expected_label=1`.
   - `human_ai_essays`: same timing as human_slow_fill, essays with U+2014 and aiism phrases, `expected_label=0`.
   - `placeholder_bot`: leftover `[Company Name]`, `duration_auto >= HARD_SPEED_MIN`, `expected_label=1`.
7. `greenhouse/application_submitted.json`: Harvest-shaped body with answers + `custom_fields` rich enough to map onto `job_eng` essays. Include at least one placeholder so `ats_text_only` still has text signal, but **do not** expect label=1 from placeholders alone (SPEC.md hard rules need speed or burst). Expected webhook outcome is a valid `Detection` with `mode="ats_text_only"`; label may be 0.

Failure modes:

- Packs that only have AI text will (and must) score 0.
- `bot_burst` must set `burst.visitor_n` in the pack `ScoreInput`; do not rely on store state.
- Do not hit vendor or live ATS URLs.

Locked decisions: four packs only. Synthetic corpus.

## 4. Done when

`fixtures/jobs.json` length is 2. Four packs parse as `ReplayPack`. `scripts/replay.ts` (owned by SCORER) exits 0 against them. Greenhouse fixture is valid JSON and maps without throw.
