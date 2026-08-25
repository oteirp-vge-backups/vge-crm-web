import { defineConfig } from "@playwright/test";

const required = [
  "R10_STAGING_SUPABASE_URL",
  "R10_STAGING_SUPABASE_PUBLISHABLE_KEY",
  "R10_STAGING_OWNER_EMAIL",
  "R10_STAGING_MANAGER_EMAIL",
  "R10_STAGING_SELLER_EMAIL",
  "R10_STAGING_TEST_PASSWORD",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Faltan variables de STAGING: ${missing.join(", ")}`);

export default defineConfig({
  testDir: "./tests/staging-e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    ignoreHTTPSErrors: Boolean(process.env.HTTPS_PROXY),
    proxy: process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" }
      : undefined,
    launchOptions: process.env.R10_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.R10_CHROMIUM_EXECUTABLE_PATH }
      : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/e2e/staging-server.mjs",
    url: "http://127.0.0.1:4174/__r10_staging",
    reuseExistingServer: false,
    timeout: 15_000,
  },
  timeout: 60_000,
  expect: { timeout: 15_000 },
});
