export type IngestMode = "live_form" | "ats_text_only";

export type FieldType =
  | "text"
  | "email"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio";

export interface Field {
  name: string;
  type: FieldType;
  label: string;
  required: boolean;
  options: string[];
}

export interface Section {
  id: string;
  title: string;
  fields: Field[];
}

export interface Job {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  jd_text: string;
  sections: Section[];
}

export type TelemetryEventType =
  | "focus"
  | "blur"
  | "input"
  | "paste"
  | "section_change"
  | "submit";

export interface TelemetryEvent {
  t_ms: number;
  type: TelemetryEventType;
  field: string | null;
  section: string | null;
  input_len: number | null;
  paste_len: number | null;
}

export interface ClientSignals {
  visitor_id: string;
  ua: string;
  webdriver: boolean;
  tz: string;
  languages: string[];
}

export type AnswerMap = Record<string, string | string[] | null>;

export interface ScoreInput {
  mode: IngestMode;
  job: Job;
  answers: AnswerMap;
  events: TelemetryEvent[];
  signals: ClientSignals;
  ip: string;
  burst: { visitor_n: number; ip_n: number };
}

export type HardRule =
  | "none"
  | "placeholder_and_speed"
  | "fingerprint_burst";

export interface FeatureVector {
  duration_ms: number;
  expected_human_ms: number;
  field_count: number;
  duration_auto: number;
  cadence_low_var: number;
  simultaneous_fills: number;
  no_dwell: number;
  section_jumps: number;
  section_jump_rate: number;
  paste_ratio: number;
  visitor_burst: number;
  ua_automation: number;
  datacenter_ip: number;
  ip_burst: number;
  placeholder_hits: number;
  placeholder_hit: number;
  emdash_rate: number;
  aiism_hit: number;
  buzzword_density: number;
  jev_generic: number;
  jev_placeholder: number;
  jev_ai_prose: number;
  behavior_score: number;
  text_score: number;
  hard_rule: HardRule;
}

export interface ApplicationSession {
  id: string;
  job_id: string;
  visitor_id: string;
  ip_hash: string;
  started_at_ms: number;
}

export interface Detection {
  id: string;
  application_id: string;
  job_id: string;
  created_at_ms: number;
  label: 0 | 1;
  probability: number;
  threshold: number;
  confidence: number;
  mode: IngestMode;
  reasoning: string;
  features: FeatureVector;
  model_version: string;
  source: "live" | "replay" | "webhook_fixture";
  overridden_label: 0 | 1 | null;
}

export type ReplayPackId =
  | "human_slow_fill"
  | "bot_burst"
  | "human_ai_essays"
  | "placeholder_bot";

export interface ReplayPack {
  id: ReplayPackId;
  expected_label: 0 | 1;
  input: ScoreInput;
}

export interface Lexicons {
  placeholders: string[];
  buzzwords: string[];
  aiisms: string[];
  datacenter_cidrs: { cidr: string; name: string }[];
}

export type ScoredDetection = Omit<
  Detection,
  "id" | "application_id" | "created_at_ms" | "source"
> & { overridden_label: null };
