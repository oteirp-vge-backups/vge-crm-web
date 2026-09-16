import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const mock = await readFile(new URL("./supabase-browser-mock.js", import.meta.url), "utf8");
const externalRequests = [];

test.beforeEach(async ({ context, page }) => {
  externalRequests.length = 0;
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") externalRequests.push(request.url());
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1") return route.continue();
    if (url.hostname === "cdn.jsdelivr.net" && url.pathname.endsWith("/supabase.js")) {
      return route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: mock });
    }
    return route.abort("blockedbyclient");
  });
});

test.afterEach(() => {
  expect(externalRequests.filter((url) => url.includes("supabase.co"))).toEqual([]);
});

test("acceso rechazado sin revelar detalles internos", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Acceso al CRM" })).toBeVisible();
  await page.locator("#loginEmail").fill("denied@example.invalid");
  await page.locator("#loginPassword").fill("Incorrecta-123!");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#loginError")).toHaveText("No se ha podido iniciar sesión. Revisa el email y la contraseña.");
});

test("recuperación de contraseña confirma el envío sin enumerar cuentas", async ({ page }) => {
  await page.goto("/");
  await page.locator("#loginEmail").fill("persona@example.invalid");
  await page.getByRole("button", { name: "He olvidado mi contraseña" }).click();
  await expect(page.locator("#recoveryEmail")).toHaveValue("persona@example.invalid");
  await page.getByRole("button", { name: "Enviar enlace de recuperación" }).click();
  await expect(page.locator("#recoveryStatus")).toContainText("Si el correo corresponde a una cuenta");
});

test("invitación exige la política de contraseña antes de activar", async ({ page }) => {
  await page.goto("/?set-password=1");
  await expect(page.locator("#invitePasswordForm")).toBeVisible();
  await expect(page.locator("#invitePassword")).toHaveAttribute("minlength", "14");
  await expect(page.locator("#invitePasswordRepeat")).toHaveAttribute("minlength", "14");
  await page.locator("#invitePassword").fill("demasiado-corta");
  await page.locator("#invitePasswordRepeat").fill("demasiado-corta");
  await page.getByRole("button", { name: "Guardar contraseña y entrar" }).click();
  await expect(page.locator("#invitePasswordError")).toContainText("una mayúscula, una minúscula, un número y un símbolo");
});

test("sesión comercial carga el panel y oculta acciones de propietario", async ({ page }) => {
  await page.goto("/?r10-auth=1");
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("#sessionUser")).toHaveText("Comercial de prueba");
  await expect(page.locator("#sessionRole")).toHaveText("Comercial");
  await expect(page.locator("#pageTitle")).toHaveText("Panel de trabajo");
  await expect(page.locator("#backupBtn")).toBeHidden();
  await expect(page.locator("#permissionsNavBtn")).toBeHidden();
});

test("estadísticas distingue centros efectivos y viajes a cotización", async ({ page }) => {
  await page.goto("/?r10-auth=1");
  await page.getByRole("button", { name: /Estadísticas/ }).click();
  await expect(page.locator("#pageTitle")).toHaveText("Estadísticas");

  const centreQuote = page.locator(".stats-kpi").filter({
    has: page.locator(".label", { hasText: /^Centros a cotización$/ }),
  });
  await expect(centreQuote.locator(".value")).toHaveText("3");
  await expect(centreQuote.locator(".hint")).toContainText("algún viaje");

  const travelQuote = page.locator(".stats-kpi").filter({
    has: page.locator(".label", { hasText: /^Viajes a cotización$/ }),
  });
  await expect(travelQuote.locator(".value")).toHaveText("4");
});

test("la anotación interna usa solo texto y no se convierte en contacto", async ({ page }) => {
  await page.goto("/?r10-auth=1");
  await page.locator('[data-view="overdue"]').click();
  await page.getByRole("button", { name: "Abrir ficha" }).click();

  await expect(page.locator("#cChannel")).toHaveAttribute("required", "");
  await expect(page.locator("#cResult")).toHaveAttribute("required", "");
  await expect(page.locator("#cChannel")).toHaveValue("");
  await expect(page.locator("#cResult")).toHaveValue("");

  await page.locator("#cNote").fill("Pendiente de revisión interna; todavía no se ha contactado con el centro.");
  await page.getByRole("button", { name: "Guardar anotación interna" }).click();

  await expect.poll(async () => page.evaluate(() => {
    const noteCall = window.__r10RpcCalls.findLast(item => item.name === "register_internal_note_v1");
    const contactCalls = window.__r10RpcCalls.filter(item => item.name === "register_contact_multi_v1").length;
    return noteCall ? {
      centerId: noteCall.args.p_center_id,
      notes: noteCall.args.p_notes,
      contactCalls,
    } : null;
  })).toEqual({
    centerId: "R10-MOCK-AGENDA",
    notes: "Pendiente de revisión interna; todavía no se ha contactado con el centro.",
    contactCalls: 0,
  });

  await expect(page.getByRole("heading", { name: /Historial de actividad \(0 contactos · 1 anotación interna\)/ })).toBeVisible();
  await expect(page.locator(".event.internal-note")).toContainText("Anotación interna");
  await expect(page.locator(".event.internal-note")).toContainText("No cuenta como contacto");
  await expect(page.locator(".event.internal-note")).toContainText("Pendiente de revisión interna");
  await expect.poll(() => page.evaluate(() => centers.find(c => c.id === "R10-MOCK-AGENDA")?.contactCount)).toBe(0);
});

test("el contacto explica la fecha cerrada y permite atender viaje y agenda general una sola vez", async ({ page }) => {
  await page.goto("/?r10-auth=1");
  await page.locator('[data-view="overdue"]').click();
  await page.getByRole("button", { name: "Abrir ficha" }).click();

  const nextDate = page.locator("#cNext");
  const nextTime = page.locator("#cNextTime");
  const resolveGeneral = page.locator("#cResolveGeneral");

  await expect(resolveGeneral).toBeDisabled();
  await nextDate.fill("2099-05-01");
  await nextTime.fill("10:30");
  await page.locator("#cResult").selectOption({ label: "Pide presupuesto" });
  await expect(nextDate).toBeDisabled();
  await expect(nextTime).toBeDisabled();
  await expect(nextDate).toHaveValue("");
  await expect(page.locator("#cNextHelp")).toContainText("cierra este seguimiento");

  await page.locator("#cResult").selectOption({ label: "Volver a contactar" });
  await expect(nextDate).toBeEnabled();
  await nextDate.fill("2099-05-01");
  await nextTime.fill("10:30");

  await page.locator('input[name="cOpportunity"][value="VGE-O-MOCK-1"]').check();
  await expect(resolveGeneral).toBeEnabled();
  await resolveGeneral.check();
  await page.locator("#cChannel").selectOption({ label: "Llamada" });
  await page.locator("#cNote").fill("La misma conversación atiende el viaje y el seguimiento general.");
  await page.getByRole("button", { name: "Registrar contacto" }).click();

  await expect.poll(async () => page.evaluate(() => {
    const call = window.__r10RpcCalls.findLast(item => item.name === "register_contact_multi_v1");
    return call ? {
      opportunityIds: call.args.p_opportunity_ids,
      alsoResolveGeneral: call.args.p_also_resolve_general_followup,
      hasNextDate: String(call.args.p_next_contact_at || "").includes("2099-05-01"),
    } : null;
  })).toEqual({
    opportunityIds: ["VGE-O-MOCK-1"],
    alsoResolveGeneral: true,
    hasNextDate: true,
  });
});

test("incidencia simulada queda diagnosticable por correlación y sin PII", async ({ page }) => {
  await page.goto("/?r10-auth=1");
  await expect(page.locator("#app")).toBeVisible();
  const result = await page.evaluate(async () => {
    const failure = {
      code: "PGRST301",
      message: "Fernando · fernando@example.invalid · 600000000",
      stack: "centro/LEON-001",
    };
    attachTechnicalIncident(failure, { component: "database", operation: "simulated_failure" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    return {
      reference: technicalReference(failure),
      incidents: window.__r10TechnicalIncidents,
    };
  });
  expect(result.incidents).toHaveLength(1);
  expect(result.reference).toContain(result.incidents[0].correlation_id);
  expect(JSON.stringify(result.incidents)).not.toMatch(/Fernando|@example|600000000|LEON-001|centro\//);
});
