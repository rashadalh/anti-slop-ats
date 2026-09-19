import { createHash, randomBytes } from "node:crypto";
import jobs from "../../../../fixtures/jobs.json" with { type: "json" };
import humanPack from "../../../../fixtures/packs/human_slow_fill.json" with { type: "json" };
import botPack from "../../../../fixtures/packs/bot_burst.json" with { type: "json" };
import aiPack from "../../../../fixtures/packs/human_ai_essays.json" with { type: "json" };
import placeholderPack from "../../../../fixtures/packs/placeholder_bot.json" with { type: "json" };
import {
  scoreApplication,
  emailHashPepper,
  ipHashPepper,
  BURST_WINDOW_S,
  BURST_N,
  SESSION_TTL_S,
  SESSION_MAX_EVENTS,
} from "@anti-slop/scorer";
import type {
  ApplicationSession,
  Job,
  ReplayPack,
  TelemetryEvent,
  ClientSignals,
  AnswerMap,
  Detection,
  ReplayPackId,
} from "@anti-slop/scorer";
import type { BackendPort } from "./types.ts";

type ApplicationRow = {
  id: string;
  session_id: string;
  job_id: string;
  created_at_ms: number;
  answers: AnswerMap;
  email_hash: string;
  source: "live_form" | "ats_text_only";
  duration_ms: number;
};

type BurstRow = { window_start_ms: number; n: number };

const sessions = new Map<string, ApplicationSession>();
const events = new Map<string, TelemetryEvent[]>();
const applications = new Map<string, ApplicationRow>();
const detections = new Map<string, Detection>();
const knownFingerprints = new Map<string, BurstRow>();
const knownIps = new Map<string, BurstRow>();
const listeners = new Set<(d: Detection) => void>();

const packs: Record<ReplayPackId, ReplayPack> = {
  human_slow_fill: humanPack as ReplayPack,
  bot_burst: botPack as ReplayPack,
  human_ai_essays: aiPack as ReplayPack,
  placeholder_bot: placeholderPack as ReplayPack,
};

function nowMs(): number {
  return Date.now();
}

function id(prefix: string): string {
  return prefix + randomBytes(16).toString("base64url").slice(0, 22);
}

function hashEmail(email: string): string {
  return createHash("sha256")
    .update(emailHashPepper() + email)
    .digest("hex");
}

function hashIp(ip: string): string {
  return createHash("sha256")
    .update(ipHashPepper() + ip)
    .digest("hex");
}

function purgeExpiredSessions(): void {
  const cutoff = nowMs() - SESSION_TTL_S * 1000;
  for (const [sid, s] of sessions) {
    if (s.started_at_ms < cutoff) {
      sessions.delete(sid);
      events.delete(sid);
    }
  }
}

function slideBurst(map: Map<string, BurstRow>, key: string, t: number): number {
  let row = map.get(key);
  if (!row || t - row.window_start_ms > BURST_WINDOW_S * 1000) {
    row = { window_start_ms: t, n: 0 };
    map.set(key, row);
  }
  row.n += 1;
  return row.n;
}

function burstCounts(visitor_id: string, ip_hash: string, t: number) {
  const visitor_n = visitor_id
    ? slideBurst(knownFingerprints, visitor_id, t)
    : 0;
  const ip_n = ip_hash ? slideBurst(knownIps, ip_hash, t) : 0;
  return { visitor_n, ip_n };
}

function stripEmail(answers: AnswerMap): { answers: AnswerMap; email_hash: string } {
  const copy = { ...answers };
  let email_hash = "";
  const raw = copy.email;
  if (typeof raw === "string" && raw) {
    email_hash = hashEmail(raw);
    delete copy.email;
    copy.email_hash = email_hash;
  }
  return { answers: copy, email_hash };
}

function notify(d: Detection): void {
  for (const cb of listeners) cb(d);
}

async function scoreAndStore(
  session: ApplicationSession,
  sessionEvents: TelemetryEvent[],
  answers: AnswerMap,
  signals: ClientSignals,
  source: Detection["source"],
  ip: string,
): Promise<Detection> {
  const job = (jobs as Job[]).find((j) => j.id === session.job_id);
  if (!job) throw new Error("JOB_NOT_FOUND");

  const t = nowMs();
  const ip_hash = session.ip_hash || (ip ? hashIp(ip) : "");
  const { visitor_n, ip_n } = burstCounts(signals.visitor_id, ip_hash, t);

  const { answers: storedAnswers, email_hash } = stripEmail(answers);

  const scored = await scoreApplication({
    mode: "live_form",
    job,
    answers: storedAnswers,
    events: sessionEvents,
    signals,
    ip,
    burst: { visitor_n, ip_n },
  });

  const appId = id("app_");
  const detId = id("det_");
  const duration_ms =
    sessionEvents.length >= 2
      ? sessionEvents[sessionEvents.length - 1]!.t_ms -
        sessionEvents[0]!.t_ms
      : 0;

  applications.set(appId, {
    id: appId,
    session_id: session.id,
    job_id: job.id,
    created_at_ms: t,
    answers: storedAnswers,
    email_hash,
    source: source === "webhook_fixture" ? "ats_text_only" : "live_form",
    duration_ms,
  });

  const detection: Detection = {
    ...scored,
    id: detId,
    application_id: appId,
    created_at_ms: t,
    source,
  };
  detections.set(detId, detection);
  notify(detection);
  return detection;
}

export const localBackend: BackendPort = {
  listJobs() {
    return jobs as Job[];
  },

  getJob(slug: string) {
    return (jobs as Job[]).find((j) => j.slug === slug) ?? null;
  },

  async createSession(job_id, signals, ip) {
    purgeExpiredSessions();
    const job = (jobs as Job[]).find((j) => j.id === job_id);
    if (!job) throw new Error("JOB_NOT_FOUND");
    const session_id = randomBytes(12).toString("base64url");
    const session: ApplicationSession = {
      id: session_id,
      job_id,
      visitor_id: signals.visitor_id,
      ip_hash: ip ? hashIp(ip) : "",
      started_at_ms: nowMs(),
    };
    sessions.set(session_id, session);
    events.set(session_id, []);
    return { session_id };
  },

  async ingestTelemetry(session_id, batch) {
    purgeExpiredSessions();
    const list = events.get(session_id);
    if (!list) throw new Error("NOT_FOUND");
    let accepted = 0;
    for (const e of batch) {
      list.push(e);
      accepted++;
      while (list.length > SESSION_MAX_EVENTS) list.shift();
    }
    return { accepted };
  },

  async submitApplication(session_id, answers, signals) {
    purgeExpiredSessions();
    const session = sessions.get(session_id);
    if (!session) throw new Error("NOT_FOUND");
    const sessionEvents = [...(events.get(session_id) ?? [])];
    events.delete(session_id);
    try {
      return await scoreAndStore(
        session,
        sessionEvents,
        answers,
        signals,
        "live",
        "",
      );
    } catch (err) {
      throw err;
    }
  },

  listDetections() {
    return [...detections.values()].sort(
      (a, b) => b.created_at_ms - a.created_at_ms,
    );
  },

  async overrideLabel(id, label) {
    const d = detections.get(id);
    if (!d) throw new Error("NOT_FOUND");
    const updated: Detection = {
      ...d,
      overridden_label: label,
      probability: d.probability,
    };
    detections.set(id, updated);
    notify(updated);
    return updated;
  },

  async replayPack(packId) {
    const pack = packs[packId];
    if (!pack) throw new Error("NOT_FOUND");
    const scored = await scoreApplication(pack.input);
    const t = nowMs();
    const appId = id("app_");
    const detId = id("det_");
    const detection: Detection = {
      ...scored,
      id: detId,
      application_id: appId,
      created_at_ms: t,
      source: "replay",
    };
    detections.set(detId, detection);
    notify(detection);
    return detection;
  },

  subscribeDetections(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};
