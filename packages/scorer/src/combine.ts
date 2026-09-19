import {
  BIAS,
  CONF_ATS,
  CONF_DEGRADED,
  CONF_DISAGREE,
  CONF_HARD,
  CONF_LIVE,
  CONF_MAX,
  CONF_MIN,
  HARD_RULE_P,
  LABEL_THRESHOLD,
  LOGIT_WEIGHTS,
} from "./constants.ts";
import { attachHardRule } from "./features.ts";
import type { FeatureVector, IngestMode } from "./types.ts";

function clip(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export function logitProbability(features: FeatureVector): number {
  let z = BIAS;
  for (const [key, weight] of Object.entries(LOGIT_WEIGHTS)) {
    const x = (features as Record<string, number>)[key] ?? 0;
    z += weight * x;
  }
  return sigmoid(z);
}

export function combine(
  rawFeatures: Omit<FeatureVector, "hard_rule">,
  mode: IngestMode,
): { probability: number; confidence: number; features: FeatureVector } {
  const features = attachHardRule(rawFeatures);
  const p_model = logitProbability(features);

  let probability = p_model;
  if (features.hard_rule === "placeholder_and_speed") {
    probability = Math.max(p_model, HARD_RULE_P);
  } else if (features.hard_rule === "fingerprint_burst") {
    probability = Math.max(p_model, HARD_RULE_P);
  }

  let base: number;
  if (mode === "ats_text_only") {
    base = CONF_ATS;
  } else if (features.duration_ms > 0) {
    base = CONF_LIVE;
  } else {
    base = CONF_DEGRADED;
  }

  const disagreement = Math.abs(features.behavior_score - features.text_score);
  let confidence = clip(
    base * (1 - CONF_DISAGREE * disagreement),
    CONF_MIN,
    CONF_MAX,
  );
  if (features.hard_rule !== "none") {
    confidence = Math.max(confidence, CONF_HARD);
  }

  return { probability, confidence, features };
}

export function labelFromProbability(probability: number): 0 | 1 {
  return probability >= LABEL_THRESHOLD ? 1 : 0;
}
