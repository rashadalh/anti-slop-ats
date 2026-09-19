import { describe, it, expect } from "vitest";
import { HARD_RULE_P } from "../src/constants.ts";
import { combine } from "../src/combine.ts";
import { scoreApplication } from "../src/index.ts";
import ai from "../../../fixtures/packs/human_ai_essays.json" with { type: "json" };
import bot from "../../../fixtures/packs/bot_burst.json" with { type: "json" };
import placeholder from "../../../fixtures/packs/placeholder_bot.json" with { type: "json" };
import type { ReplayPack } from "../src/types.ts";

describe("hard rules", () => {
  it("placeholder_bot triggers placeholder_and_speed", async () => {
    const det = await scoreApplication((placeholder as ReplayPack).input);
    expect(det.features.hard_rule).toBe("placeholder_and_speed");
    expect(det.probability).toBeGreaterThanOrEqual(HARD_RULE_P);
    expect(det.label).toBe(1);
  });

  it("bot_burst triggers fingerprint_burst", async () => {
    const det = await scoreApplication((bot as ReplayPack).input);
    expect(det.features.hard_rule).toBe("fingerprint_burst");
    expect(det.label).toBe(1);
  });

  it("fingerprint_burst combine path", () => {
    const raw = {
      duration_ms: 1000,
      expected_human_ms: 100000,
      field_count: 8,
      duration_auto: 0,
      cadence_low_var: 0,
      simultaneous_fills: 0,
      no_dwell: 0,
      section_jumps: 0,
      section_jump_rate: 0,
      paste_ratio: 0,
      visitor_burst: 1,
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
      behavior_score: 0.5,
      text_score: 0,
    };
    const { features, probability } = combine(raw, "live_form");
    expect(features.hard_rule).toBe("fingerprint_burst");
    expect(probability).toBeGreaterThanOrEqual(HARD_RULE_P);
  });

  it("AI-isms only pack stays label 0", async () => {
    const det = await scoreApplication((ai as ReplayPack).input);
    expect(det.label).toBe(0);
  });
});
