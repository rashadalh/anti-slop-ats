import { describe, it, expect } from "vitest";
import ghFixture from "../../../fixtures/greenhouse/application_submitted.json" with { type: "json" };
import {
  mapGreenhousePayload,
  verifyGreenhouseSignature,
  scoreApplication,
} from "../src/index.ts";
import { createHmac } from "node:crypto";

describe("greenhouse", () => {
  it("maps fixture to ats_text_only with empty events", () => {
    const input = mapGreenhousePayload(ghFixture);
    expect(input.mode).toBe("ats_text_only");
    expect(input.events).toEqual([]);
    expect(input.signals.visitor_id).toBe("");
    expect(input.job.id).toBe("job_eng");
    expect(typeof input.answers.why_role).toBe("string");
  });

  it("scores without throw", async () => {
    await expect(scoreApplication(mapGreenhousePayload(ghFixture))).resolves.toBeDefined();
  });

  it("verifyGreenhouseSignature accepts valid HMAC", () => {
    const body = JSON.stringify({ hello: "world" });
    const secret = "test-secret";
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyGreenhouseSignature(body, sig, secret)).toBe(true);
    expect(verifyGreenhouseSignature(body, "bad", secret)).toBe(false);
  });
});
