import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const tests = readdirSync("tests")
  .filter(name => /^test_.*\.js$/.test(name))
  .sort()
  .map(name => `tests/${name}`);

assert.equal(tests.length, 7, "Deben existir exactamente las siete pruebas heredadas.");

for (const test of tests) {
  const result = spawnSync(process.execPath, ["--require", "./tests/helpers/frontend-source-hook.js", test], {
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
