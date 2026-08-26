import { expect, test } from "@playwright/test";

const stagingUrl = new URL(process.env.R10_STAGING_SUPABASE_URL);
const password = process.env.R10_STAGING_TEST_PASSWORD;
const users = {
  owner: { email: process.env.R10_STAGING_OWNER_EMAIL, role: "Propietario" },
  manager: { email: process.env.R10_STAGING_MANAGER_EMAIL, role: "Administración operativa" },
  seller: { email: process.env.R10_STAGING_SELLER_EMAIL, role: "Comercial" },
  sellerB: { email: process.env.R10_STAGING_SELLER_B_EMAIL, role: "Comercial" },
};
const runId = (process.env.R10_STAGING_RUN_ID || Date.now().toString(36)).replace(/[^a-z0-9-]/gi, "").slice(-18);
const school = `R10 F10 Centro ${runId}`;
let centerId = "";

async function guardNetwork(page) {
  if (process.env.R10_STAGING_DEBUG) {
    page.on("console", (message) => console.log(`[browser:${message.type()}] ${message.text()}`));
    page.on("request", (request) => console.log(`[request] ${request.method()} ${request.url()}`));
    page.on("requestfailed", (request) => console.log(`[request-failed] ${request.url()} ${request.failure()?.errorText || ""}`));
  }
  await page.route("https://sjraugywirjohrqmacvb.supabase.co/**", (route) => route.abort("blockedbyclient"));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname.endsWith(".supabase.co") && url.hostname !== stagingUrl.hostname) {
      throw new Error(`Petición Supabase fuera de STAGING: ${url.hostname}`);
    }
  });
}

async function login(page, kind) {
  await guardNetwork(page);
  await page.goto("/");
  await page.locator("#loginEmail").fill(users[kind].email);
  await page.locator("#loginPassword").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("#sessionRole")).toHaveText(users[kind].role);
}

async function logout(page) {
  await page.locator("#logoutBtn").click();
  await expect(page.locator("#loginScreen")).toBeVisible();
}

test.describe.serial("R10 Fase 10 contra STAGING real", () => {
  test("seller crea una ficha, una persona y un viaje sin duplicar el alta", async ({ page }) => {
    await login(page, "seller");
    await expect(page.locator('[data-view="all"]')).toBeHidden();
    await expect(page.locator("#permissionsNavBtn")).toBeHidden();
    await expect(page.locator("#backupBtn")).toBeHidden();

    await page.locator("#newCenterBtn").click();
    await page.locator("#nSchool").fill(school);
    await page.locator("#nCity").fill("Madrid");
    await page.locator("#nProvince").selectOption("Madrid");
    await page.locator("#nSchoolPhone").fill("910000123");
    await page.locator("#nSchoolEmail").fill(`centro-${runId}@example.invalid`);
    await page.locator("#nLeadSource").selectOption("Prospección comercial");
    await page.locator("#checkNewCenterDuplicates").click();
    await expect(page.locator("#newCenterDuplicateBox")).not.toContainText("Comprobando");
    await expect(page.locator("#newCenterDuplicateBox")).not.toContainText("Este centro ya parece existir");
    const duplicateConfirmation = page.locator("#confirmPossibleDuplicate");
    if (await duplicateConfirmation.isVisible()) await duplicateConfirmation.check();
    await page.locator("#createNewCenterBtn").evaluate((button) => {
      button.click();
      button.click();
    });
    await expect(page.locator("#toast")).toContainText("Centro creado");
    centerId = ((await page.locator("#toast").textContent()) || "").match(/Centro creado · (.+)$/)?.[1]?.trim() || "";
    expect(centerId).not.toBe("");
    await expect(page.locator("#centerDialog")).toBeVisible();

    await page.locator("#newContactName").fill(`Contacto ${runId}`);
    await page.locator("#newContactRole").selectOption("Profesor/a organizador/a");
    await page.locator("#newContactEmail").fill(`persona-${runId}@example.invalid`);
    await page.locator("#createContactBtn").click();
    await expect(page.locator("#dialogActionStatus")).toContainText("Persona añadida correctamente");

    await page.locator("#newOppCycle").selectOption("4.º ESO");
    await page.locator("#newOppStudents").fill("48");
    await page.locator("#newOppTeachers").fill("4");
    await page.locator("#newOppDestination").fill("Roma");
    await page.locator("#newOppNext").fill("2026-09-15");
    await page.locator("#newOppNextTime").fill("10:30");
    await page.locator("#createOpportunityBtn").click();
    await expect(page.locator("#dialogActionStatus")).toContainText("Viaje creado correctamente");
    await expect(page.locator(".opportunity-record")).toHaveCount(1);

    await page.locator("#centerDialog .close").click();
    await page.locator('[data-view="mine"]').click();
    await page.locator("#searchFilter").fill(school);
    await expect(page.locator(`tr[data-open="${centerId}"]`)).toHaveCount(1);

    const csvDownload = page.waitForEvent("download");
    await page.locator("#settingsBtn").click();
    await page.locator("#exportCsvBtn").click();
    expect((await csvDownload).suggestedFilename()).toMatch(/\.csv$/);
    await logout(page);
  });

  test("un segundo seller no puede ver la cartera creada por el primero", async ({ page }) => {
    expect(centerId).not.toBe("");
    await login(page, "sellerB");
    await page.locator('[data-view="mine"]').click();
    await page.locator("#searchFilter").fill(school);
    await expect(page.locator(`tr[data-open="${centerId}"]`)).toHaveCount(0);
    await expect(page.locator('[data-view="all"]')).toBeHidden();
    await expect(page.locator("#permissionsNavBtn")).toBeHidden();
    await logout(page);
  });

  test("manager ve el alcance global y completa archivo y restauracion", async ({ page }) => {
    expect(centerId).not.toBe("");
    await login(page, "manager");
    await expect(page.locator('[data-view="all"]')).toBeVisible();
    await expect(page.locator("#archivedNavBtn")).toBeVisible();
    await expect(page.locator("#permissionsNavBtn")).toBeHidden();
    await expect(page.locator("#backupBtn")).toBeHidden();

    await page.locator('[data-view="all"]').click();
    await page.locator("#searchFilter").fill(school);
    await page.locator(`tr[data-open="${centerId}"]`).click();
    await page.locator("#fArchiveReason").fill("Prueba reversible integrada R10 F10");
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#archiveCenterBtn").click();
    await expect(page.locator("#toast")).toContainText("Centro archivado");

    await page.locator("#archivedSearch").fill(centerId);
    const archivedRow = page.locator("tr", { hasText: centerId });
    await expect(archivedRow).toHaveCount(1);
    const prompts = ["Restauracion reversible integrada R10 F10"];
    page.on("dialog", async (dialog) => {
      if (dialog.type() === "prompt") await dialog.accept(prompts.shift() || "Restauracion integrada R10 F10");
      else await dialog.accept();
    });
    await archivedRow.locator('[data-restore-center]').click();
    await expect(page.locator("#toast")).toContainText("Centro restaurado");
    await expect(page.locator("tr", { hasText: centerId })).toHaveCount(0);
    await logout(page);
  });

  test("owner conserva en exclusiva permisos y copia completa", async ({ page }) => {
    await login(page, "owner");
    await expect(page.locator("#permissionsNavBtn")).toBeVisible();
    await expect(page.locator("#backupBtn")).toBeVisible();
    await page.locator("#permissionsNavBtn").click();
    await expect(page.locator("#pageTitle")).toContainText("Usuarios");

    const backupDownload = page.waitForEvent("download");
    await page.locator("#backupBtn").click();
    expect((await backupDownload).suggestedFilename()).toMatch(/\.json$/);
    await logout(page);
  });
});
