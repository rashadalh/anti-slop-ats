import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import {
  ipHashPepper,
  scoreApplication,
  mapGreenhousePayload,
} from "@anti-slop/scorer";
import type {
  Job,
  TelemetryEvent,
  ClientSignals,
  AnswerMap,
  Detection,
  ReplayPackId,
} from "@anti-slop/scorer";
import jobs from "../../../../fixtures/jobs.json" with { type: "json" };
import humanPack from "../../../../fixtures/packs/human_slow_fill.json" with { type: "json" };
import botPack from "../../../../fixtures/packs/bot_burst.json" with { type: "json" };
import aiPack from "../../../../fixtures/packs/human_ai_essays.json" with { type: "json" };
import placeholderPack from "../../../../fixtures/packs/placeholder_bot.json" with { type: "json" };
import type { ReplayPack } from "@anti-slop/scorer";
import type { BackendPort } from "./types.ts";

const packs: Record<ReplayPackId, ReplayPack> = {
  human_slow_fill: humanPack as ReplayPack,
  bot_burst: botPack as ReplayPack,
  human_ai_essays: aiPack as ReplayPack,
  placeholder_bot: placeholderPack as ReplayPack,
};

function requireEnv(): { url: string; anonKey: string } {
  const url = process.env.VITE_SUPABASE_URL ?? "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  if (!url || !anonKey) {
    throw new Error("Supabase env not configured");
  }
  return { url, anonKey };
}

let client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = requireEnv();
    client = createClient(url, anonKey);
  }
  return client;
}

const detectionCache: Detection[] = [];
const listeners = new Set<(d: Detection) => void>();

function hashIp(ip: string): string {
  return createHash("sha256")
    .update(ipHashPepper() + ip)
    .digest("hex");
}

function remember(d: Detection): void {
  detectionCache.unshift(d);
  for (const cb of listeners) cb(d);
}

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    department: String(row.department),
    location: String(row.location),
    jd_text: String(row.jd_text),
    sections: row.sections as Job["sections"],
  };
}

function rowToDetection(row: Record<string, unknown>): Detection {
  return {
    id: String(row.id),
    application_id: String(row.application_id),
    job_id: String(row.job_id),
    created_at_ms: Number(row.created_at_ms),
    label: Number(row.label) as 0 | 1,
    probability: Number(row.probability),
    threshold: Number(row.threshold),
    confidence: Number(row.confidence),
    mode: row.mode as Detection["mode"],
    reasoning: String(row.reasoning),
    features: row.features as Detection["features"],
    model_version: String(row.model_version),
    source: row.source as Detection["source"],
    overridden_label:
      row.overridden_label === null || row.overridden_label === undefined
        ? null
        : (Number(row.overridden_label) as 0 | 1),
  };
}

export const supabaseBackend: BackendPort = {
  listJobs() {
    return jobs as Job[];
  },

  getJob(slug: string) {
    return (jobs as Job[]).find((j) => j.slug === slug) ?? null;
  },

  async createSession(job_id, signals, ip) {
    const sb = getClient();
    const session_id = randomBytes(12).toString("base64url");
    const { error } = await sb.from("application_sessions").insert({
      id: session_id,
      job_id,
      visitor_id: signals.visitor_id,
      ip_hash: ip ? hashIp(ip) : "",
      started_at_ms: Date.now(),
    });
    if (error) throw new Error(error.message);
    return { session_id };
  },

  async ingestTelemetry(session_id, events) {
    const sb = getClient();
    const { data, error } = await sb.functions.invoke("ingest-telemetry", {
      body: { session_id, events },
    });
    if (error) throw new Error(error.message);
    return data as { accepted: number };
  },

  async submitApplication(session_id, answers, signals) {
    const sb = getClient();
    const { data, error } = await sb.functions.invoke("score-application", {
      body: { session_id, answers, client_signals: signals },
    });
    if (error) throw new Error(error.message);
    const det = rowToDetection(data as Record<string, unknown>);
    remember(det);
    return det;
  },

  listDetections() {
    return [...detectionCache];
  },

  async overrideLabel(id, label) {
    const sb = getClient();
    const { data, error } = await sb
      .from("detections")
      .update({ overridden_label: label })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const det = rowToDetection(data as Record<string, unknown>);
    remember(det);
    return det;
  },

  async replayPack(packId) {
    const pack = packs[packId];
    if (!pack) throw new Error("NOT_FOUND");
    const { session_id } = await supabaseBackend.createSession(
      pack.input.job.id,
      pack.input.signals,
      pack.input.ip,
    );
    if (pack.input.events.length) {
      await supabaseBackend.ingestTelemetry(session_id, pack.input.events);
    }
    return supabaseBackend.submitApplication(
      session_id,
      pack.input.answers,
      pack.input.signals,
    );
  },

  subscribeDetections(cb) {
    listeners.add(cb);
    const sb = getClient();
    const channel = sb
      .channel("detections-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "detections" },
        (payload) => {
          if (payload.new) {
            const det = rowToDetection(payload.new as Record<string, unknown>);
            remember(det);
            cb(det);
          }
        },
      )
      .subscribe();
    return () => {
      listeners.delete(cb);
      void sb.removeChannel(channel);
    };
  },
};

/** Cloud listJobs helper (not on BackendPort sync signature). */
export async function fetchJobsFromSupabase(): Promise<Job[]> {
  const sb = getClient();
  const { data, error } = await sb.from("jobs").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToJob(row as Record<string, unknown>));
}

export async function scoreGreenhouseFixture(payload: object): Promise<Detection> {
  const input = mapGreenhousePayload(payload);
  const scored = await scoreApplication(input);
  return {
    ...scored,
    id: "det_local_gh",
    application_id: "app_local_gh",
    created_at_ms: Date.now(),
    source: "webhook_fixture",
    overridden_label: null,
  };
}
