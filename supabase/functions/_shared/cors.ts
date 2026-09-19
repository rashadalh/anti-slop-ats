const defaultOrigin = "http://127.0.0.1:5173";
const allowedOrigins = new Set([
  defaultOrigin,
  "http://localhost:5173",
  "https://anti-slop-ats-web.vercel.app",
]);

function allowedOrigin(req?: Request): string {
  const origin = req?.headers.get("Origin");
  return origin && allowedOrigins.has(origin) ? origin : defaultOrigin;
}

export function corsHeaders(req?: Request): HeadersInit {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export function jsonResponse(body: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function optionsResponse(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
