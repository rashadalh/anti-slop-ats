import { describe, it, expect } from "vitest";
import ghFixture from "../../../fixtures/greenhouse/application_submitted.json" with { type: "json" };
import { mapGreenhousePayload, scoreApplication } from "../src/index.ts";

describe("reasoning", () => {
  it("ATS mode includes prefix", async () => {
    const det = await scoreApplication(mapGreenhousePayload(ghFixture));
    expect(det.reasoning).toMatch(/ATS text-only \(no form telemetry\)/);
  });
});
