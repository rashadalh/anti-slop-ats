export const LABEL_THRESHOLD = 0.7;
export const JOB_COUNT = 18;
export const MS_PER_S = 1000;
export const WORDS_PER_RATE = 100;
export const CONF_EQ_EPS = 0.01;
export const BURST_WINDOW_MIN = 10;
export const DURATION_BASE_S = 20;
export const DURATION_TEXTAREA_S = 25;
export const DURATION_TEXT_S = 8;
export const FAST_FRACTION = 0.4;
export const HARD_SPEED_MIN = 0.7;
export const HARD_RULE_P = 0.92;
export const CADENCE_VAR_MAX_MS2 = 2500;
export const SIMUL_MS = 30;
export const DWELL_LEN = 40;
export const DWELL_MIN_MS = 1500;
export const EMDASH_RATE_CLIP = 2.0;
export const BUZZWORD_DENSITY_CLIP = 0.12;
export const SIGNAL_MENTION_MIN = 0.35;
export const BURST_WINDOW_S = 600;
export const BURST_N = 3;
export const SESSION_TTL_S = 7200;
export const SESSION_MAX_EVENTS = 5000;
export const TELEMETRY_FLUSH_MS = 2000;
export const JEV_TIMEOUT_S = 2.5;
export const JEV_MODEL = "jev-1.13.0";
export const MODEL_VERSION = "platt-1.0.0";
export const CONF_LIVE = 0.9;
export const CONF_ATS = 0.55;
export const CONF_DEGRADED = 0.5;
export const CONF_HARD = 0.85;
export const CONF_DISAGREE = 0.5;
export const CONF_MIN = 0.15;
export const CONF_MAX = 0.99;
export const HEADLESS_UA_RE = /HeadlessChrome|Playwright|Puppeteer|Selenium/;
export const BIAS = -2.2;
export const BAKEOFF_PACKS = 4;

export const LOGIT_WEIGHTS: Record<string, number> = {
  duration_auto: 2.4,
  cadence_low_var: 1.2,
  simultaneous_fills: 1.0,
  no_dwell: 1.0,
  section_jump_rate: 1.3,
  paste_ratio: 1.5,
  visitor_burst: 2.0,
  ua_automation: 0.6,
  datacenter_ip: 0.8,
  ip_burst: 1.2,
  placeholder_hit: 1.0,
  buzzword_density: 0.8,
  jev_generic: 0.7,
  jev_placeholder: 0.5,
  emdash_rate: 0.0,
  aiism_hit: 0.0,
  jev_ai_prose: 0.0,
};

export const SIGNAL_NAMES: Record<string, string> = {
  duration_auto: "filled far faster than a human would",
  cadence_low_var: "machine-regular inter-field cadence",
  simultaneous_fills: "multiple fields filled at once",
  no_dwell: "no dwell on long-text questions",
  section_jump_rate: "non-linear section jumps",
  paste_ratio: "essay answers were pasted",
  visitor_burst: "same fingerprint burst-applied",
  ua_automation: "automation user-agent or webdriver",
  datacenter_ip: "datacenter IP",
  ip_burst: "same IP burst-applied",
  placeholder_hit: "leftover placeholder text",
  buzzword_density: "buzzword stuffing vs the JD",
  jev_generic: "judge flagged a generic mass-application",
  jev_placeholder: "judge flagged leftover placeholders",
};

export function emailHashPepper(): string {
  const v =
    typeof process !== "undefined" ? process.env?.EMAIL_HASH_PEPPER : undefined;
  return v || "dev-email-pepper";
}

export function ipHashPepper(): string {
  const v =
    typeof process !== "undefined" ? process.env?.IP_HASH_PEPPER : undefined;
  return v || "dev-ip-pepper";
}
