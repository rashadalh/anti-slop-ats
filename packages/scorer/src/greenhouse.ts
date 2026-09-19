import { createHmac, timingSafeEqual } from "node:crypto";
import jobs from "../../../fixtures/jobs.json" with { type: "json" };
import type { Job, ScoreInput } from "./types.ts";

function findJobEng(): Job {
  const j = (jobs as Job[]).find((x) => x.id === "job_eng");
  if (!j) throw new Error("job_eng not found");
  return j;
}

function looksLikeIp(s: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(s.trim());
}

function mapAnswers(payload: Record<string, unknown>, job: Job): ScoreInput["answers"] {
  const answers: ScoreInput["answers"] = {};
  const candidate = payload.candidate as Record<string, unknown> | undefined;
  if (candidate) {
    if (typeof candidate.first_name === "string")
      answers.first_name = candidate.first_name;
    if (typeof candidate.last_name === "string")
      answers.last_name = candidate.last_name;
    if (typeof candidate.email === "string") answers.email = candidate.email;
  }

  const application = payload.application as Record<string, unknown> | undefined;
  const labelToField = new Map<string, string>();
  for (const section of job.sections) {
    for (const field of section.fields) {
      labelToField.set(field.label.toLowerCase(), field.name);
    }
  }

  const mergeAnswer = (question: string, value: string) => {
    const name = labelToField.get(question.toLowerCase());
    if (name) answers[name] = value;
  };

  const answerLists = [
    application?.answers,
    application?.custom_fields,
    payload.custom_fields,
  ];
  for (const list of answerLists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const q =
        (typeof rec.question === "string" && rec.question) ||
        (typeof rec.name === "string" && rec.name) ||
        "";
      const val =
        (typeof rec.answer === "string" && rec.answer) ||
        (typeof rec.value === "string" && rec.value) ||
        "";
      if (q && val) mergeAnswer(q, val);
    }
  }

  return answers;
}

export function mapGreenhousePayload(payload: object): ScoreInput {
  const job = findJobEng();
  const p = payload as Record<string, unknown>;
  const application = p.application as Record<string, unknown> | undefined;
  let ip = "";
  if (application && typeof application.location === "string") {
    if (looksLikeIp(application.location)) ip = application.location.trim();
  }

  return {
    mode: "ats_text_only",
    job,
    answers: mapAnswers(p, job),
    events: [],
    signals: {
      visitor_id: "",
      ua: "",
      webdriver: false,
      tz: "",
      languages: [],
    },
    ip,
    burst: { visitor_n: 0, ip_n: 0 },
  };
}

export function verifyGreenhouseSignature(
  rawBody: string,
  header: string,
  secret: string,
): boolean {
  if (!header || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(header.trim(), "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
