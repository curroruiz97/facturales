// Shared CORS configuration for all Edge Functions.
// Restricts Access-Control-Allow-Origin to known production domains.

const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  "https://facturales.es",
  "https://www.facturales.es",
  "https://app.facturales.es",
  // Uncomment for local development:
  // "http://localhost:5173",
  // "http://127.0.0.1:5173",
]);

/**
 * Build CORS headers based on the request Origin.
 * Returns the matched origin or "null" if the origin is not allowed.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "null";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

/** Handle CORS preflight (OPTIONS) requests. */
export function handleCorsOptions(req: Request): Response {
  return new Response("ok", { headers: getCorsHeaders(req) });
}

/** Build a JSON response with CORS headers. */
export function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}
