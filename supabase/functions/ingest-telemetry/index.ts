import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { corsHeaders, jsonResponse, optionsResponse } from "../_shared/cors.ts";

type TelemetryEvent = {
  t_ms: number;
  type: string;
  field: string | null;
  section: string | null;
  input_len: number | null;
  paste_len: number | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") {
    return jsonResponse({ error: "VALIDATION_ERROR", detail: "POST only" }, 422);
  }

  let body: { session_id?: string; events?: TelemetryEvent[] };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "VALIDATION_ERROR", detail: "invalid json" }, 422);
  }

  const session_id = body.session_id;
  const batch = body.events;
  if (!session_id || !Array.isArray(batch)) {
    return jsonResponse({ error: "VALIDATION_ERROR", detail: "missing fields" }, 422);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const rows = batch.map((e) => ({
    session_id,
    t_ms: e.t_ms,
    type: e.type,
    field: e.field,
    section: e.section,
    input_len: e.input_len,
    paste_len: e.paste_len,
  }));

  const { error } = await supabase.from("telemetry_events").insert(rows);
  if (error) {
    return jsonResponse({ error: "VALIDATION_ERROR", detail: error.message }, 422);
  }

  return jsonResponse({ accepted: rows.length });
});
