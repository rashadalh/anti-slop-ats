import {
  BURST_N,
  BURST_WINDOW_MIN,
  LOGIT_WEIGHTS,
  SIGNAL_MENTION_MIN,
  SIGNAL_NAMES,
} from "./constants.ts";
import type { FeatureVector, IngestMode } from "./types.ts";

export function renderReasoning(
  features: FeatureVector,
  _probability: number,
  mode: IngestMode,
): string {
  const clauses: string[] = [];

  if (mode === "ats_text_only") {
    clauses.push("ATS text-only (no form telemetry).");
  }

  if (mode === "live_form") {
    clauses.push(
      `duration_ms=${features.duration_ms}; field_count=${features.field_count}`,
    );
  }

  const contributions: { phrase: string; score: number }[] = [];
  for (const key of Object.keys(SIGNAL_NAMES)) {
    const weight = LOGIT_WEIGHTS[key] ?? 0;
    if (weight <= 0) continue;
    const x = (features as Record<string, number>)[key] ?? 0;
    if (x >= SIGNAL_MENTION_MIN) {
      contributions.push({
        phrase: SIGNAL_NAMES[key]!,
        score: weight * x,
      });
    }
  }
  contributions.sort((a, b) => b.score - a.score);
  for (const c of contributions.slice(0, 4)) {
    clauses.push(c.phrase);
  }

  if (features.section_jumps >= 1) {
    clauses.push(`section_jumps=${features.section_jumps}`);
  }
  if (features.placeholder_hits >= 1) {
    clauses.push(`placeholder_hits=${features.placeholder_hits}`);
  }
  if (features.visitor_burst === 1) {
    clauses.push(
      `${BURST_N}+ applications in ${BURST_WINDOW_MIN} minutes from same fingerprint`,
    );
  }

  const unique = [...new Set(clauses)];
  return unique.slice(0, 6).join("; ");
}
