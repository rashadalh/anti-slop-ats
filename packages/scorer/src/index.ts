import placeholders from "../../../fixtures/placeholders.json" with { type: "json" };
import buzzwords from "../../../fixtures/buzzwords.json" with { type: "json" };
import aiisms from "../../../fixtures/aiisms.json" with { type: "json" };
import datacenter_cidrs from "../../../fixtures/datacenter_cidrs.json" with { type: "json" };
import { LABEL_THRESHOLD, MODEL_VERSION } from "./constants.ts";
import { combine, labelFromProbability } from "./combine.ts";
import { extractFeatures } from "./features.ts";
import { maybeJev, textareaAnswers } from "./jev.ts";
import { renderReasoning } from "./reasoning.ts";
import type { Lexicons, ScoreInput, ScoredDetection } from "./types.ts";

export * from "./types.ts";
export * from "./constants.ts";
export { extractFeatures, expectedHumanMs, countFields } from "./features.ts";
export { combine, labelFromProbability, logitProbability } from "./combine.ts";
export { renderReasoning } from "./reasoning.ts";
export { classifyIp } from "./geoip.ts";
export { maybeJev } from "./jev.ts";
export {
  mapGreenhousePayload,
  verifyGreenhouseSignature,
} from "./greenhouse.ts";

const lexicons: Lexicons = {
  placeholders: placeholders as string[],
  buzzwords: buzzwords as string[],
  aiisms: aiisms as string[],
  datacenter_cidrs: datacenter_cidrs as Lexicons["datacenter_cidrs"],
};

export async function scoreApplication(
  input: ScoreInput,
): Promise<ScoredDetection> {
  let raw = extractFeatures(input, lexicons);
  const jev = await maybeJev({
    job: { title: input.job.title, jd_text: input.job.jd_text },
    answers: textareaAnswers(input.job, input.answers),
  });
  raw = {
    ...raw,
    jev_generic: jev.jev_generic,
    jev_placeholder: jev.jev_placeholder,
    jev_ai_prose: jev.jev_ai_prose,
    behavior_score: raw.behavior_score,
    text_score:
      (raw.placeholder_hit +
        raw.emdash_rate +
        raw.aiism_hit +
        raw.buzzword_density +
        jev.jev_generic +
        jev.jev_placeholder +
        jev.jev_ai_prose) /
      7,
  };

  const { probability, confidence, features } = combine(raw, input.mode);
  const label = labelFromProbability(probability);
  const reasoning = renderReasoning(features, probability, input.mode);

  return {
    job_id: input.job.id,
    label,
    probability,
    threshold: LABEL_THRESHOLD,
    confidence,
    mode: input.mode,
    reasoning,
    features,
    model_version: MODEL_VERSION,
    overridden_label: null,
  };
}
