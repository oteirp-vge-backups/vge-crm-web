import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const productionRef = "sjraugywirjohrqmacvb";
const port = 4184;
const stagingRef = "r10phase2cfixture";
const child = spawn(process.execPath, ["tests/e2e/staging-server.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    R10_STAGING_PORT: String(port),
    R10_STAGING_SUPABASE_URL: `https://${stagingRef}.supabase.co`,
    R10_STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_r10_phase2c_fixture_only",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("El servidor STAGING no arranco a tiempo.")), 8_000);
    child.once("exit", (code) => reject(new Error(`El servidor STAGING termino antes de tiempo (${code}).`)));
    child.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("Servidor R10 STAGING aislado")) {
        clearTimeout(timer);
        resolve();
      }
    });
  });

  const response = await fetch(`http://127.0.0.1:${port}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-r10-staging-project"), stagingRef);
  assert.match(html, new RegExp(stagingRef));
  assert.doesNotMatch(html, new RegExp(productionRef));
  assert.doesNotMatch(html, /service_role/i);

  const metadata = await (await fetch(`http://127.0.0.1:${port}/__r10_staging`)).json();
  assert.deepEqual(metadata, { staging: true, projectRef: stagingRef });
  console.log("OK: el servidor integrado inyecta solo STAGING y elimina la referencia de produccion.");
} finally {
  child.kill("SIGTERM");
}
