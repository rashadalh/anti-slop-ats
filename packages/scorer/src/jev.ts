import { JEV_MODEL, JEV_TIMEOUT_S } from "./constants.ts";
import type { Job, AnswerMap } from "./types.ts";

export interface JevState {
  job: { title: string; jd_text: string };
  answers: Record<string, string>;
}

export async function maybeJev(
  state: JevState,
): Promise<{ jev_generic: number; jev_placeholder: number; jev_ai_prose: number }> {
  const key =
    (typeof process !== "undefined" && process.env?.TYPESAFE_API_KEY) || "";
  if (!key) {
    return { jev_generic: 0, jev_placeholder: 0, jev_ai_prose: 0 };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JEV_TIMEOUT_S * 1000);
    const res = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: JEV_MODEL,
        state,
        nouls: [
          {
            id: "leftover_placeholder",
            instructions:
              "Does any long-form answer in answers contain leftover placeholders such as [Company], TBD, lorem ipsum, or unfilled merge fields?",
          },
          {
            id: "generic_unrelated",
            instructions:
              "Do the long-form answers ignore job.title and read as a generic mass-application?",
          },
          {
            id: "ai_prose",
            instructions:
              'Do the long-form answers show typical LLM prose (em dashes, "delve", "leverage", "passionate about")?',
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return { jev_generic: 0, jev_placeholder: 0, jev_ai_prose: 0 };
    }
    const data = (await res.json()) as {
      nouls?: { id: string; score?: number }[];
    };
    const out = { jev_generic: 0, jev_placeholder: 0, jev_ai_prose: 0 };
    for (const n of data.nouls ?? []) {
      const s = n.score ?? 0;
      if (n.id === "leftover_placeholder") out.jev_placeholder = s;
      if (n.id === "generic_unrelated") out.jev_generic = s;
      if (n.id === "ai_prose") out.jev_ai_prose = s;
    }
    return out;
  } catch {
    return { jev_generic: 0, jev_placeholder: 0, jev_ai_prose: 0 };
  }
}

export function textareaAnswers(job: Job, answers: AnswerMap): Record<string, string> {
  const out: Record<string, string> = {};
  for (const section of job.sections) {
    for (const field of section.fields) {
      if (field.type !== "textarea") continue;
      const v = answers[field.name];
      if (typeof v === "string") out[field.name] = v;
    }
  }
  return out;
}
