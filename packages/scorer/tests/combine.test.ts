import { describe, it, expect } from "vitest";
import { BIAS, LABEL_THRESHOLD } from "../src/constants.ts";
import { combine, logitProbability } from "../src/combine.ts";
import type { FeatureVector } from "../src/types.ts";

function zeroFeatures(): Omit<FeatureVector, "hard_rule"> {
  return {
    duration_ms: 5000,
    expected_human_ms: 100000,
    field_count: 8,
    duration_auto: 0,
    cadence_low_var: 0,
    simultaneous_fills: 0,
    no_dwell: 0,
    section_jumps: 0,
    section_jump_rate: 0,
    paste_ratio: 0,
    visitor_burst: 0,
    ua_automation: 0,
    datacenter_ip: 0,
    ip_burst: 0,
    placeholder_hits: 0,
    placeholder_hit: 0,
    emdash_rate: 0,
    aiism_hit: 0,
    buzzword_density: 0,
    jev_generic: 0,
    jev_placeholder: 0,
    jev_ai_prose: 0,
    behavior_score: 0,
    text_score: 0,
  };
}

describe("combine", () => {
  it("baseline probability near sigmoid(BIAS)", () => {
    const features = { ...zeroFeatures(), hard_rule: "none" as const };
    const p = logitProbability(features);
    const expected = 1 / (1 + Math.exp(-BIAS));
    expect(Math.abs(p - expected)).toBeLessThan(0.001);
  });

  it("label threshold is 0.70", () => {
    expect(LABEL_THRESHOLD).toBe(0.7);
  });

  it("degraded confidence for live empty events", () => {
    const raw = zeroFeatures();
    raw.duration_ms = 0;
    const { confidence } = combine(raw, "live_form");
    expect(confidence).toBeCloseTo(0.5, 1);
  });
});
