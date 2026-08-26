import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.111.0";

const APP_ORIGIN = "https://crm.viajesdegruposescolares.com";
const INVITE_REDIRECT = `${APP_ORIGIN}/?set-password=1`;
const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type";

function corsHeaders(origin: string) {
  return {
    "access-control-allow-origin": origin === APP_ORIGIN ? origin : APP_ORIGIN,
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

function defaultKey(jsonValue: string | undefined) {
  if (!jsonValue) return "";
  try {
    const keys = JSON.parse(jsonValue);
    return String(keys.default ?? "");
  } catch {
    return "";
  }
}

function normalizedEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function publicError(error: { message?: unknown } | null | undefined) {
  const message = String(error?.message ?? "");
  const known = [
    "OWNER_REQUIRED",
    "CONFIRMATION_MISMATCH",
    "INVALID_VGE_EMAIL",
    "OPERATOR_NOT_INVITABLE",
    "OPERATOR_ALREADY_LINKED",
    "EMAIL_ALREADY_ASSIGNED",
  ];
  return known.find((code) => message.includes(code)) ?? "INVITE_FAILED";
}

async function finishAudit(
  adminClient: SupabaseClient,
  invitationId: number | null,
  status: string,
  errorCode: string | null = null,
  authUserId: string | null = null,
) {
  if (!invitationId) return;
  await adminClient
    .from("operator_invitation_audit")
    .update({
      status,
      provider_error_code: errorCode,
      auth_user_id: authUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("invitation_id", invitationId);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";

  if (origin && origin !== APP_ORIGIN) {
    return json({ ok: false, error: "ORIGIN_NOT_ALLOWED" }, 403, origin);
  }
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405, origin);
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ ok: false, error: "AUTH_REQUIRED" }, 401, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = defaultKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"))
    || Deno.env.get("SUPABASE_ANON_KEY")
    || "";
  const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    || defaultKey(Deno.env.get("SUPABASE_SECRET_KEYS"));
  if (!supabaseUrl || !publishableKey || !adminKey) {
    return json({ ok: false, error: "SERVER_CONFIGURATION_ERROR" }, 500, origin);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.slice("Bearer ".length);
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData?.user) {
    return json({ ok: false, error: "INVALID_SESSION" }, 401, origin);
  }

  // Validate the owner through the same authenticated RPC used by the CRM.
  // This keeps the authorization decision tied to auth.uid() and avoids a
  // false rejection when the administrative client cannot resolve the row.
  const { data: ownerRows, error: ownerAccessError } = await userClient
    .rpc("owner_list_operators");
  const { data: myOperatorRows, error: myOperatorError } = await userClient
    .rpc("get_my_operator");
  const myOperator = Array.isArray(myOperatorRows) ? myOperatorRows[0] : null;
  const owner = Array.isArray(ownerRows)
    ? ownerRows.find((row) => row.code === myOperator?.code)
    : null;
  if (ownerAccessError || myOperatorError || !owner?.active || owner.access_role !== "owner") {
    return json({ ok: false, error: "OWNER_REQUIRED" }, 403, origin);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "INVALID_JSON" }, 400, origin);
  }

  const operatorCode = String(payload?.operator_code ?? "").trim().toUpperCase();
  const email = normalizedEmail(payload?.email);
  if (!/^VGE-[A-Z0-9_-]{2,40}$/.test(operatorCode)
      || email.length > 254
      || !/^[^\s@]+@viajesdegruposescolares\.com$/.test(email)) {
    return json({ ok: false, error: "INVALID_INVITATION_DATA" }, 400, origin);
  }

  const { data: target, error: targetError } = await adminClient
    .from("operators")
    .select("code, display_name, email, access_role, active, auth_user_id")
    .eq("code", operatorCode)
    .maybeSingle();
  if (targetError) {
    return json({ ok: false, error: "OPERATOR_LOOKUP_FAILED" }, 500, origin);
  }
  if (!target?.active || !["manager", "seller"].includes(target.access_role)) {
    return json({ ok: false, error: "OPERATOR_NOT_INVITABLE" }, 409, origin);
  }
  if (target.auth_user_id) {
    return json({ ok: false, error: "OPERATOR_ALREADY_LINKED" }, 409, origin);
  }

  const { data: emailOwner, error: emailOwnerError } = await adminClient
    .from("operators")
    .select("code")
    .ilike("email", email)
    .neq("code", operatorCode)
    .limit(1)
    .maybeSingle();
  if (emailOwnerError) {
    return json({ ok: false, error: "OPERATOR_LOOKUP_FAILED" }, 500, origin);
  }
  if (emailOwner) {
    return json({ ok: false, error: "EMAIL_ALREADY_ASSIGNED" }, 409, origin);
  }

  const { data: audit, error: auditError } = await adminClient
    .from("operator_invitation_audit")
    .insert({
      operator_code: operatorCode,
      email,
      requested_by: userData.user.id,
      requested_by_operator: owner.code,
      status: "requested",
    })
    .select("invitation_id")
    .single();
  if (auditError || !audit?.invitation_id) {
    return json({ ok: false, error: "AUDIT_WRITE_FAILED" }, 500, origin);
  }
  const invitationId = audit.invitation_id;

  const { data: authList, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) {
    await finishAudit(adminClient, invitationId, "failed", "AUTH_LOOKUP_FAILED");
    return json({ ok: false, error: "AUTH_LOOKUP_FAILED" }, 502, origin);
  }
  if ((authList?.users ?? []).some((user) => normalizedEmail(user.email) === email)) {
    await finishAudit(adminClient, invitationId, "failed", "EMAIL_ALREADY_REGISTERED");
    return json({ ok: false, error: "EMAIL_ALREADY_REGISTERED" }, 409, origin);
  }

  const { error: prepareError } = await adminClient
    .from("operators")
    .update({ email, updated_at: new Date().toISOString() })
    .eq("code", operatorCode)
    .is("auth_user_id", null);
  if (prepareError) {
    await finishAudit(adminClient, invitationId, "failed", "OPERATOR_PREPARATION_FAILED");
    return json({ ok: false, error: "OPERATOR_PREPARATION_FAILED" }, 500, origin);
  }

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: INVITE_REDIRECT,
    data: {
      operator_code: operatorCode,
      display_name: target.display_name,
    },
  });
  if (inviteError || !inviteData?.user?.id) {
    await finishAudit(adminClient, invitationId, "failed", "INVITE_DELIVERY_FAILED");
    return json({ ok: false, error: "INVITE_DELIVERY_FAILED" }, 502, origin);
  }

  const { data: linked, error: linkError } = await adminClient
    .from("operators")
    .update({
      auth_user_id: inviteData.user.id,
      linked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("code", operatorCode)
    .eq("email", email)
    .is("auth_user_id", null)
    .select("code")
    .maybeSingle();
  if (linkError || !linked?.code) {
    await finishAudit(adminClient, invitationId, "link_pending", "INVITE_SENT_LINK_PENDING", inviteData.user.id);
    return json({
      ok: false,
      error: "INVITE_SENT_LINK_PENDING",
      operator_code: operatorCode,
    }, 500, origin);
  }

  await finishAudit(adminClient, invitationId, "sent", null, inviteData.user.id);

  return json({
    ok: true,
    operator_code: operatorCode,
    display_name: target.display_name,
    email,
    auth_user_id: inviteData.user.id,
    invited_at: new Date().toISOString(),
  }, 200, origin);
});
