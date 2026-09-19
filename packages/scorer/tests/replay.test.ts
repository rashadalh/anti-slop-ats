import { describe, it, expect } from "vitest";
import human from "../../../fixtures/packs/human_slow_fill.json" with { type: "json" };
import bot from "../../../fixtures/packs/bot_burst.json" with { type: "json" };
import ai from "../../../fixtures/packs/human_ai_essays.json" with { type: "json" };
import placeholder from "../../../fixtures/packs/placeholder_bot.json" with { type: "json" };
import ghFixture from "../../../fixtures/greenhouse/application_submitted.json" with { type: "json" };
import { scoreApplication, mapGreenhousePayload } from "../src/index.ts";
import type { ReplayPack } from "../src/types.ts";

const packs: ReplayPack[] = [human, bot, ai, placeholder] as ReplayPack[];

describe("replay packs", () => {
  it.each(packs.map((p) => [p.id, p]))(
    "%s matches expected_label",
    async (_id, pack) => {
      const det = await scoreApplication(pack.input);
      expect(det.label).toBe(pack.expected_label);
    },
  );

  it("human_ai_essays has emdash or aiism signal", async () => {
    const pack = ai as ReplayPack;
    const det = await scoreApplication(pack.input);
    expect(
      det.features.emdash_rate > 0 || det.features.aiism_hit === 1,
    ).toBe(true);
  });

  it("ats_text_only confidence lower than live bot", async () => {
    const botDet = await scoreApplication((bot as ReplayPack).input);
    const ghInput = mapGreenhousePayload(ghFixture);
    const atsDet = await scoreApplication(ghInput);
    expect(atsDet.confidence).toBeLessThan(botDet.confidence);
  });

  it("empty visitor_id does not throw", async () => {
    const pack = human as ReplayPack;
    const input = {
      ...pack.input,
      signals: { ...pack.input.signals, visitor_id: "" },
    };
    await expect(scoreApplication(input)).resolves.toBeDefined();
  });
});
