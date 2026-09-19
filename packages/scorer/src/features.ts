import {
  CADENCE_VAR_MAX_MS2,
  BUZZWORD_DENSITY_CLIP,
  BURST_N,
  DURATION_BASE_S,
  DURATION_TEXT_S,
  DURATION_TEXTAREA_S,
  DWELL_LEN,
  DWELL_MIN_MS,
  EMDASH_RATE_CLIP,
  FAST_FRACTION,
  HARD_SPEED_MIN,
  HEADLESS_UA_RE,
  MS_PER_S,
  SIMUL_MS,
  WORDS_PER_RATE,
} from "./constants.ts";
import { classifyIp } from "./geoip.ts";
import type {
  FeatureVector,
  HardRule,
  Job,
  Lexicons,
  ScoreInput,
  TelemetryEvent,
} from "./types.ts";

function clip(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function isEeoSection(sectionId: string): boolean {
  return sectionId === "eeo";
}

export function countFields(job: Job): {
  field_count: number;
  n_text: number;
  n_textarea: number;
} {
  let field_count = 0;
  let n_text = 0;
  let n_textarea = 0;
  for (const section of job.sections) {
    if (isEeoSection(section.id)) continue;
    for (const field of section.fields) {
      field_count++;
      if (field.type === "textarea") n_textarea++;
      else if (field.type === "text" || field.type === "email") n_text++;
    }
  }
  return { field_count, n_text, n_textarea };
}

export function expectedHumanMs(job: Job): number {
  const { n_text, n_textarea } = countFields(job);
  return (
    (DURATION_BASE_S +
      DURATION_TEXTAREA_S * n_textarea +
      DURATION_TEXT_S * n_text) *
    MS_PER_S
  );
}

function durationMs(events: TelemetryEvent[]): number {
  if (events.length < 2) return 0;
  const sorted = [...events].sort((a, b) => a.t_ms - b.t_ms);
  return sorted[sorted.length - 1]!.t_ms - sorted[0]!.t_ms;
}

function durationAuto(duration_ms: number, expected_human_ms: number, events: TelemetryEvent[]): number {
  if (events.length === 0) return 0;
  if (duration_ms <= FAST_FRACTION * expected_human_ms) return 1;
  if (duration_ms >= expected_human_ms) return 0;
  const span = expected_human_ms - FAST_FRACTION * expected_human_ms;
  const t = (duration_ms - FAST_FRACTION * expected_human_ms) / span;
  return clip(1 - t, 0, 1);
}

function cadenceLowVar(events: TelemetryEvent[]): number {
  const focusTimes = events
    .filter((e) => e.type === "focus")
    .map((e) => e.t_ms)
    .sort((a, b) => a - b);
  if (focusTimes.length < 3) return 0;
  const deltas: number[] = [];
  for (let i = 1; i < focusTimes.length; i++) {
    deltas.push(focusTimes[i]! - focusTimes[i - 1]!);
  }
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const variance =
    deltas.reduce((acc, d) => acc + (d - mean) ** 2, 0) / deltas.length;
  return variance < CADENCE_VAR_MAX_MS2 ? 1 : 0;
}

function simultaneousFills(events: TelemetryEvent[]): number {
  const inputs = events.filter((e) => e.type === "input" && e.field);
  for (let i = 0; i < inputs.length; i++) {
    for (let j = i + 1; j < inputs.length; j++) {
      const a = inputs[i]!;
      const b = inputs[j]!;
      if (a.field !== b.field && Math.abs(a.t_ms - b.t_ms) < SIMUL_MS) {
        return 1;
      }
    }
  }
  return 0;
}

function noDwell(events: TelemetryEvent[], job: Job): number {
  const textareaNames = new Set<string>();
  for (const section of job.sections) {
    for (const field of section.fields) {
      if (field.type === "textarea") textareaNames.add(field.name);
    }
  }
  const focusByField = new Map<string, number>();
  for (const e of events) {
    if (e.type === "focus" && e.field && textareaNames.has(e.field)) {
      focusByField.set(e.field, e.t_ms);
    }
    if (e.type === "blur" && e.field && textareaNames.has(e.field)) {
      const start = focusByField.get(e.field);
      if (start === undefined) continue;
      const inputEv = events.find(
        (ev) =>
          ev.type === "input" &&
          ev.field === e.field &&
          (ev.input_len ?? 0) >= DWELL_LEN,
      );
      if (inputEv && e.t_ms - start < DWELL_MIN_MS) return 1;
    }
  }
  return 0;
}

function sectionJumps(events: TelemetryEvent[], job: Job): number {
  const order = job.sections.map((s) => s.id);
  const indexOf = (id: string) => order.indexOf(id);
  let jumps = 0;
  let lastIdx = -1;
  for (const e of events) {
    if (e.type !== "section_change" || !e.section) continue;
    const idx = indexOf(e.section);
    if (idx < 0) continue;
    if (lastIdx >= 0 && idx !== lastIdx + 1) jumps++;
    lastIdx = idx;
  }
  return jumps;
}

function pasteRatio(events: TelemetryEvent[], job: Job): number {
  const textareaNames = new Set<string>();
  for (const section of job.sections) {
    for (const field of section.fields) {
      if (field.type === "textarea") textareaNames.add(field.name);
    }
  }
  let pasted = 0;
  let inputTotal = 0;
  for (const e of events) {
    if (!e.field || !textareaNames.has(e.field)) continue;
    if (e.type === "paste") pasted += e.paste_len ?? 0;
    if (e.type === "input") inputTotal += e.input_len ?? 0;
  }
  return clip(pasted / Math.max(inputTotal, 1), 0, 1);
}

function concatTextareas(answers: ScoreInput["answers"], job: Job): string {
  const parts: string[] = [];
  for (const section of job.sections) {
    for (const field of section.fields) {
      if (field.type !== "textarea") continue;
      const v = answers[field.name];
      if (typeof v === "string") parts.push(v);
    }
  }
  return parts.join("\n");
}

function countPlaceholderHits(text: string, patterns: string[]): number {
  let hits = 0;
  for (const pat of patterns) {
    try {
      const re = new RegExp(pat, "i");
      const m = text.match(re);
      if (m) hits += m.length;
    } catch {
      /* skip invalid */
    }
  }
  return hits;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function emdashRate(text: string): number {
  const words = wordCount(text);
  const emCount = (text.match(/\u2014/g) ?? []).length;
  const rate = emCount / Math.max(words / WORDS_PER_RATE, 1);
  return clip(rate / EMDASH_RATE_CLIP, 0, 1);
}

function aiismHit(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  for (const p of phrases) {
    if (lower.includes(p.toLowerCase())) return 1;
  }
  return 0;
}

function buzzwordDensity(
  text: string,
  buzzwords: string[],
  jd_text: string,
): number {
  const jdLower = jd_text.toLowerCase();
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  const words = tokens.length;
  let hits = 0;
  for (const bw of buzzwords) {
    const b = bw.toLowerCase();
    if (jdLower.includes(b)) continue;
    for (const t of tokens) {
      if (t === b) hits++;
    }
  }
  return clip(hits / Math.max(words, 1) / BUZZWORD_DENSITY_CLIP, 0, 1);
}

export function extractFeatures(
  input: ScoreInput,
  lists: Lexicons,
): Omit<FeatureVector, "hard_rule"> {
  const { job, events, answers, signals, ip, burst } = input;
  const { field_count } = countFields(job);
  const expected_human_ms = expectedHumanMs(job);
  const dur = durationMs(events);
  const duration_auto = durationAuto(dur, expected_human_ms, events);
  const cadence_low_var = cadenceLowVar(events);
  const simultaneous_fills = simultaneousFills(events);
  const no_dwell = noDwell(events, job);
  const section_jumps = sectionJumps(events, job);
  const section_jump_rate = clip(
    section_jumps / Math.max(job.sections.length - 1, 1),
    0,
    1,
  );
  const paste_ratio = pasteRatio(events, job);
  const visitor_burst = burst.visitor_n >= BURST_N ? 1 : 0;
  const ip_burst = burst.ip_n >= BURST_N ? 1 : 0;
  const ua_automation =
    signals.webdriver || HEADLESS_UA_RE.test(signals.ua) ? 1 : 0;
  const ipClass = classifyIp(ip, lists.datacenter_cidrs);
  const datacenter_ip = ipClass === "datacenter" ? 1 : 0;

  const essayText = concatTextareas(answers, job);
  const placeholder_hits = countPlaceholderHits(essayText, lists.placeholders);
  const placeholder_hit = placeholder_hits >= 1 ? 1 : 0;
  const emdash_rate = emdashRate(essayText);
  const aiism_hit = aiismHit(essayText, lists.aiisms);
  const buzzword_density = buzzwordDensity(
    essayText,
    lists.buzzwords,
    job.jd_text,
  );

  const jev_generic = 0;
  const jev_placeholder = 0;
  const jev_ai_prose = 0;

  const behavior_score =
    (duration_auto +
      cadence_low_var +
      simultaneous_fills +
      no_dwell +
      section_jump_rate +
      paste_ratio) /
    6;

  const text_score =
    (placeholder_hit +
      emdash_rate +
      aiism_hit +
      buzzword_density +
      jev_generic +
      jev_placeholder +
      jev_ai_prose) /
    7;

  return {
    duration_ms: dur,
    expected_human_ms,
    field_count,
    duration_auto,
    cadence_low_var,
    simultaneous_fills,
    no_dwell,
    section_jumps,
    section_jump_rate,
    paste_ratio,
    visitor_burst,
    ua_automation,
    datacenter_ip,
    ip_burst,
    placeholder_hits,
    placeholder_hit,
    emdash_rate,
    aiism_hit,
    buzzword_density,
    jev_generic,
    jev_placeholder,
    jev_ai_prose,
    behavior_score,
    text_score,
  };
}

export function attachHardRule(
  features: Omit<FeatureVector, "hard_rule">,
): FeatureVector {
  let hard_rule: HardRule = "none";
  if (
    features.placeholder_hit === 1 &&
    features.duration_auto >= HARD_SPEED_MIN
  ) {
    hard_rule = "placeholder_and_speed";
  } else if (features.visitor_burst === 1) {
    hard_rule = "fingerprint_burst";
  }
  return { ...features, hard_rule };
}
