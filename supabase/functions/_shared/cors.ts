// Shared CORS handling for all edge functions.
//
// Reflects the request's Origin header only when it's on the allowlist,
// instead of sending "Access-Control-Allow-Origin: *" to every caller.
// Configure the allowlist via the ALLOWED_ORIGINS secret (comma-separated,
// e.g. "https://app.example.com,https://example.com"). Falls back to
// localhost dev ports when unset so local development keeps working.
const DEFAULT_ALLOWED_ORIGINS = [
  "https://korexintelligencesystems.com",
  "https://www.korexintelligencesystems.com",
  "https://design-quest-win.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

function getAllowedOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS");
  if (configured) {
    return configured.split(",").map((origin) => origin.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigins = getAllowedOrigins();
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}

export function corsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}
