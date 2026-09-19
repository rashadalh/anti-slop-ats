import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import {
  scoreApplication,
  mapGreenhousePayload,
  verifyGreenhouseSignature,
} from "../_shared/scorer.ts";
import { jsonResponse } from "../_shared/cors.ts";

function id(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return prefix + b64.slice(0, 22);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "VALIDATION_ERROR", detail: "POST only" }, 422);
  }

  const rawBody = await req.text();
  const secret = Deno.env.get("GREENHOUSE_WEBHOOK_SECRET") ?? "";
  const header =
    req.headers.get("Greenhouse-Webhook-Signature") ??
    req.headers.get("greenhouse-webhook-signature") ??
    "";

  if (!verifyGreenhouseSignature(rawBody, header, secret)) {
    return jsonResponse({ error: "BAD_SIGNATURE", detail: "invalid hmac" }, 401);
  }

  let payload: object;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "VALIDATION_ERROR", detail: "invalid json" }, 422);
  }

  const input = mapGreenhousePayload(payload);
  const scored = await scoreApplication(input);
  const t = Date.now();
  const appId = id("app_");
  const detId = id("det_");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const sessionId = "webhook_" + detId;
  await supabase.from("application_sessions").insert({
    id: sessionId,
    job_id: input.job.id,
    visitor_id: "",
    ip_hash: "",
    started_at_ms: t,
  });

  await supabase.from("applications").insert({
    id: appId,
    session_id: sessionId,
    job_id: input.job.id,
    created_at_ms: t,
    answers: input.answers,
    email_hash: "",
    source: "ats_text_only",
    duration_ms: 0,
  });

  const detection = {
    id: detId,
    application_id: appId,
    job_id: input.job.id,
    created_at_ms: t,
    label: scored.label,
    probability: scored.probability,
    threshold: scored.threshold,
    confidence: scored.confidence,
    mode: scored.mode,
    reasoning: scored.reasoning,
    features: scored.features,
    model_version: scored.model_version,
    source: "webhook_fixture",
    overridden_label: null,
  };

  await supabase.from("detections").insert(detection);

  const harvestKey = Deno.env.get("GREENHOUSE_HARVEST_KEY");
  if (harvestKey) {
    // Harvest PATCH skipped in MVP unless key present — stub URL not called in tests
    void harvestKey;
  }

  return jsonResponse(detection);
});
