import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import {
  scoreApplication,
  emailHashPepper,
  BURST_WINDOW_S,
} from "../_shared/scorer.ts";
import type { Job, TelemetryEvent, ClientSignals } from "../../../packages/scorer/src/types.ts";
import { corsHeaders, jsonResponse, optionsResponse } from "../_shared/cors.ts";

async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(emailHashPepper() + email);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function id(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return prefix + b64.slice(0, 22);
}

async function bumpBurst(
  supabase: ReturnType<typeof createClient>,
  table: "known_fingerprints" | "known_ips",
  keyCol: string,
  key: string,
  t: number,
): Promise<number> {
  if (!key) return 0;
  const { data } = await supabase
    .from(table)
    .select("*")
    .eq(keyCol, key)
    .maybeSingle();
  const windowMs = BURST_WINDOW_S * 1000;
  let n = 1;
  let window_start = t;
  if (data && t - Number(data.window_start) <= windowMs) {
    n = Number(data.n) + 1;
    window_start = Number(data.window_start);
  }
  await supabase.from(table).upsert({
    [keyCol]: key,
    n,
    window_start,
  });
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") {
    return jsonResponse({ error: "VALIDATION_ERROR", detail: "POST only" }, 422);
  }

  let body: {
    session_id?: string;
    answers?: Record<string, unknown>;
    client_signals?: ClientSignals;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "VALIDATION_ERROR", detail: "invalid json" }, 422);
  }

  const session_id = body.session_id;
  const answers = body.answers ?? {};
  const client_signals = body.client_signals;
  if (!session_id || !client_signals) {
    return jsonResponse({ error: "VALIDATION_ERROR", detail: "missing fields" }, 422);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: session, error: sessErr } = await supabase
    .from("application_sessions")
    .select("*")
    .eq("id", session_id)
    .maybeSingle();
  if (sessErr || !session) {
    return jsonResponse({ error: "NOT_FOUND", detail: "session" }, 404);
  }

  const { data: jobRow, error: jobErr } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", session.job_id)
    .maybeSingle();
  if (jobErr || !jobRow) {
    return jsonResponse({ error: "JOB_NOT_FOUND", detail: session.job_id }, 404);
  }

  const job: Job = {
    id: jobRow.id,
    slug: jobRow.slug,
    title: jobRow.title,
    department: jobRow.department,
    location: jobRow.location,
    jd_text: jobRow.jd_text,
    sections: jobRow.sections,
  };

  const { data: eventRows } = await supabase
    .from("telemetry_events")
    .select("*")
    .eq("session_id", session_id)
    .order("t_ms", { ascending: true });

  const events: TelemetryEvent[] = (eventRows ?? []).map((e) => ({
    t_ms: e.t_ms,
    type: e.type,
    field: e.field,
    section: e.section,
    input_len: e.input_len,
    paste_len: e.paste_len,
  }));

  const t = Date.now();
  const visitor_n = await bumpBurst(
    supabase,
    "known_fingerprints",
    "visitor_id",
    client_signals.visitor_id,
    t,
  );
  const ip_n = await bumpBurst(
    supabase,
    "known_ips",
    "ip_hash",
    session.ip_hash,
    t,
  );

  const storedAnswers = { ...answers } as Record<string, string | string[] | null>;
  let email_hash = "";
  if (typeof storedAnswers.email === "string" && storedAnswers.email) {
    email_hash = await hashEmail(storedAnswers.email);
    delete storedAnswers.email;
    storedAnswers.email_hash = email_hash;
  }

  const scored = await scoreApplication({
    mode: "live_form",
    job,
    answers: storedAnswers,
    events,
    signals: client_signals,
    ip: "",
    burst: { visitor_n, ip_n },
  });

  const appId = id("app_");
  const detId = id("det_");
  const duration_ms =
    events.length >= 2 ? events[events.length - 1]!.t_ms - events[0]!.t_ms : 0;

  await supabase.from("applications").insert({
    id: appId,
    session_id,
    job_id: job.id,
    created_at_ms: t,
    answers: storedAnswers,
    email_hash,
    source: "live_form",
    duration_ms,
  });

  const detection = {
    id: detId,
    application_id: appId,
    job_id: job.id,
    created_at_ms: t,
    label: scored.label,
    probability: scored.probability,
    threshold: scored.threshold,
    confidence: scored.confidence,
    mode: scored.mode,
    reasoning: scored.reasoning,
    features: scored.features,
    model_version: scored.model_version,
    source: "live",
    overridden_label: null,
  };

  const { error: detErr } = await supabase.from("detections").insert(detection);
  if (detErr) {
    return jsonResponse({ error: "VALIDATION_ERROR", detail: detErr.message }, 422);
  }

  return jsonResponse(detection);
});
