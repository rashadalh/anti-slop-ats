import { describe, it, expect } from "vitest";
import jobs from "../../../fixtures/jobs.json" with { type: "json" };
import { extractFeatures, expectedHumanMs } from "../src/features.ts";
import type { Job, Lexicons, ScoreInput } from "../src/types.ts";

const lex: Lexicons = {
  placeholders: ["\\[Company\\]"],
  buzzwords: ["synergy"],
  aiisms: ["delve"],
  datacenter_cidrs: [{ cidr: "3.0.0.0/8", name: "dc" }],
};

const job = (jobs as Job[])[0]!;

function baseInput(events: ScoreInput["events"]): ScoreInput {
  return {
    mode: "live_form",
    job,
    answers: { why_role: "hello world" },
    events,
    signals: {
      visitor_id: "v1",
      ua: "Mozilla/5.0",
      webdriver: false,
      tz: "UTC",
      languages: ["en"],
    },
    ip: "192.168.0.1",
    burst: { visitor_n: 0, ip_n: 0 },
  };
}

describe("extractFeatures", () => {
  it("empty events duration_auto is 0", () => {
    const f = extractFeatures(baseInput([]), lex);
    expect(f.duration_auto).toBe(0);
    expect(f.duration_ms).toBe(0);
  });

  it("expected human ms matches formula", () => {
    expect(expectedHumanMs(job)).toBe(
      (20 + 25 * 3 + 8 * 5) * 1000,
    );
  });

  it("fast completion yields high duration_auto", () => {
    const events = [
      { t_ms: 0, type: "focus" as const, field: "first_name", section: null, input_len: null, paste_len: null },
      { t_ms: 1000, type: "submit" as const, field: null, section: null, input_len: null, paste_len: null },
    ];
    const f = extractFeatures(baseInput(events), lex);
    expect(f.duration_auto).toBe(1);
  });

  it("detects simultaneous fills", () => {
    const events = [
      { t_ms: 0, type: "input" as const, field: "a", section: null, input_len: 1, paste_len: null },
      { t_ms: 10, type: "input" as const, field: "b", section: null, input_len: 1, paste_len: null },
    ];
    expect(extractFeatures(baseInput(events), lex).simultaneous_fills).toBe(1);
  });
});
