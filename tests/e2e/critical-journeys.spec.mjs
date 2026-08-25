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
