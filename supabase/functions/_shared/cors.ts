const LOCAL_ORIGINS = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);

function extraOrigins(): Set<string> {
  const raw = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (LOCAL_ORIGINS.has(origin)) return true;
  if (extraOrigins().has(origin)) return true;
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== "https:") return false;
    return (
      hostname.endsWith(".vercel.app") ||
      hostname.endsWith(".netlify.app") ||
      hostname.endsWith(".pages.dev") ||
      hostname.endsWith(".github.io")
    );
  } catch {
    return false;
  }
}

export function corsHeadersFor(req?: Request): Record<string, string> {
  const origin = req?.headers.get("Origin") ?? "";
  const allow = isAllowedOrigin(origin) ? origin : "http://127.0.0.1:5173";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

/** Local-dev default; prefer corsHeadersFor(req) on live requests. */
export const corsHeaders = corsHeadersFor();

export function jsonResponse(
  body: unknown,
  status = 200,
  req?: Request,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
  });
}

export function optionsResponse(req?: Request): Response {
  return new Response(null, { status: 204, headers: corsHeadersFor(req) });
}
