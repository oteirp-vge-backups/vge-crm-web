import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";
import { parseTechnicalIncident, technicalAlertKey } from "../_shared/technical-incident.ts";

const APP_ORIGIN = "https://crm.viajesdegruposescolares.com";
const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type";

function defaultKey(jsonValue: string | undefined) {
  if (!jsonValue) return "";
  try {
    const keys = JSON.parse(jsonValue);
    return String(keys.default ?? "");
  } catch {
    return "";
  }
}

function allowedOrigins() {
  const configured = (Deno.env.get("VGE_OBSERVABILITY_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set([APP_ORIGIN, ...configured]);
}

function corsHeaders(origin: string) {
  const responseOrigin = allowedOrigins().has(origin) ? origin : APP_ORIGIN;
  return {
    "access-control-allow-origin": responseOrigin,
    "access-control-allow-headers": ALLOWED_HEADERS,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "600",
    "vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  if (origin && !allowedOrigins().has(origin)) return json({ ok: false, error: "ORIGIN_NOT_ALLOWED" }, 403, origin);
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405, origin);

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ ok: false, error: "AUTH_REQUIRED" }, 401, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = defaultKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")) || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !publishableKey) return json({ ok: false, error: "SERVER_CONFIGURATION_ERROR" }, 500, origin);

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user) return json({ ok: false, error: "INVALID_SESSION" }, 401, origin);

  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > 2048) return json({ ok: false, error: "PAYLOAD_TOO_LARGE" }, 413, origin);
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "INVALID_JSON" }, 400, origin);
  }
  const incident = parseTechnicalIncident(candidate);
  if (!incident) return json({ ok: false, error: "INVALID_INCIDENT" }, 400, origin);

  const logEvent = { event: "vge_technical_incident", alert_key: technicalAlertKey(incident), ...incident };
  if (incident.severity === "warning") console.warn(JSON.stringify(logEvent));
  else console.error(JSON.stringify(logEvent));

  return json({ ok: true, correlation_id: incident.correlation_id }, 202, origin);
});
