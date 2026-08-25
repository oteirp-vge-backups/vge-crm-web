import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtMadrid(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const suppliedToken = req.headers.get("x-vge-worker-token") ?? "";
  if (!suppliedToken) return json({ error: "UNAUTHORIZED" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "SUPABASE_ENV_MISSING" }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: tokenOk, error: tokenError } = await supabase.rpc("verify_vge_agenda_worker_token", {
    p_token: suppliedToken,
  });
  if (tokenError || tokenOk !== true) return json({ error: "UNAUTHORIZED" }, 401);

  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const resendFrom = Deno.env.get("RESEND_FROM") ?? "";
  if (!resendApiKey || !resendFrom) {
    return json({ error: "EMAIL_PROVIDER_NOT_CONFIGURED", configured: false }, 503);
  }

  const { data: queueResult, error: queueError } = await supabase.rpc("run_vge_agenda_queue_worker");
  if (queueError) return json({ error: "QUEUE_REFRESH_FAILED", detail: queueError.message }, 500);

  const { data: batch, error: claimError } = await supabase.rpc("claim_vge_agenda_email_batch", {
    p_limit: 10,
  });
  if (claimError) return json({ error: "CLAIM_FAILED", detail: claimError.message }, 500);

  const results: unknown[] = [];
  for (const item of batch ?? []) {
    const payload = item.payload ?? {};
    const school = String(payload.school ?? item.center_id ?? "Centro");
    const operatorName = String(payload.operator_name ?? item.assigned_to ?? "Responsable VGE");
    const scheduled = fmtMadrid(String(item.scheduled_for));
    const city = String(payload.city ?? "");
    const province = String(payload.province ?? "");

    const subject = `CRM VGE · contacto pendiente · ${school}`;
    const text = [
      "Hay un contacto pendiente de actualizar en el CRM de Viajes de Grupos Escolares.",
      "",
      `Centro: ${school}`,
      `ID: ${item.center_id}`,
      `Responsable VGE: ${operatorName}`,
      `Fecha/hora prevista: ${scheduled}`,
      city || province ? `Ubicación: ${[city, province].filter(Boolean).join(" · ")}` : "",
      "",
      "Accede al CRM y registra la nueva gestión o actualiza la próxima fecha de contacto.",
    ].filter(Boolean).join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#15233b">
        <h2 style="margin:0 0 16px">Contacto pendiente de actualizar</h2>
        <p>Hay un contacto cuya fecha prevista ya ha vencido y sigue pendiente en el CRM de Viajes de Grupos Escolares.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:5px 12px 5px 0"><strong>Centro</strong></td><td>${esc(school)}</td></tr>
          <tr><td style="padding:5px 12px 5px 0"><strong>ID</strong></td><td>${esc(item.center_id)}</td></tr>
          <tr><td style="padding:5px 12px 5px 0"><strong>Responsable VGE</strong></td><td>${esc(operatorName)}</td></tr>
          <tr><td style="padding:5px 12px 5px 0"><strong>Fecha/hora prevista</strong></td><td>${esc(scheduled)}</td></tr>
          ${(city || province) ? `<tr><td style="padding:5px 12px 5px 0"><strong>Ubicación</strong></td><td>${esc([city, province].filter(Boolean).join(" · "))}</td></tr>` : ""}
        </table>
        <p>Accede al CRM y registra la nueva gestión o actualiza la próxima fecha de contacto.</p>
        <p style="font-size:12px;color:#667085">Este aviso automático no contiene móvil ni email directo del profesor.</p>
      </div>`;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [item.recipient],
          subject,
          text,
          html,
        }),
      });

      const providerBody = await response.json().catch(() => ({}));
      if (response.ok && providerBody?.id) {
        await supabase.rpc("complete_vge_agenda_email", {
          p_id: item.id,
          p_success: true,
          p_provider_message_id: String(providerBody.id),
          p_error: null,
        });
        results.push({ id: item.id, status: "sent", provider_message_id: providerBody.id });
      } else {
        const detail = `Resend ${response.status}: ${JSON.stringify(providerBody).slice(0, 700)}`;
        await supabase.rpc("complete_vge_agenda_email", {
          p_id: item.id,
          p_success: false,
          p_provider_message_id: null,
          p_error: detail,
        });
        results.push({ id: item.id, status: "failed", error: detail });
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await supabase.rpc("complete_vge_agenda_email", {
        p_id: item.id,
        p_success: false,
        p_provider_message_id: null,
        p_error: detail,
      });
      results.push({ id: item.id, status: "failed", error: detail });
    }
  }

  return json({
    ok: true,
    queue: queueResult ?? [],
    claimed: (batch ?? []).length,
    results,
  });
});

