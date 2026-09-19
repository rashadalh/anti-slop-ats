import { describe, it, expect } from "vitest";
import bot from "../../../fixtures/packs/bot_burst.json" with { type: "json" };
import ghFixture from "../../../fixtures/greenhouse/application_submitted.json" with { type: "json" };
import { scoreApplication, mapGreenhousePayload } from "../src/index.ts";
import { CONF_ATS } from "../src/constants.ts";
import type { ReplayPack } from "../src/types.ts";

describe("confidence", () => {
  it("ats_text_only capped around CONF_ATS band", async () => {
    const input = mapGreenhousePayload(ghFixture);
    const det = await scoreApplication(input);
    expect(det.mode).toBe("ats_text_only");
    expect(det.confidence).toBeLessThanOrEqual(CONF_ATS + 0.05);
  });

  it("live bot with events has higher confidence than ATS", async () => {
    const live = await scoreApplication((bot as ReplayPack).input);
    const ats = await scoreApplication(mapGreenhousePayload(ghFixture));
    expect(live.confidence).toBeGreaterThan(ats.confidence);
  });
});
