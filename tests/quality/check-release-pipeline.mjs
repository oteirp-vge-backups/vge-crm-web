import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const script = path.join(root, "scripts/r10-release.mjs");
const temporary = await mkdtemp(path.join(os.tmpdir(), "r10-phase9-"));
const candidate = path.join(temporary, "candidate-release");
const previousSource = path.join(temporary, "previous-source");
const previous = path.join(temporary, "previous-release");
const active = path.join(temporary, "active-slot");
const evidence = path.join(temporary, "rollback-evidence.json");

function run(...args) {
  return execFileSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
}

try {
  run("build", "--source", root, "--output", candidate, "--source-ref", "phase9-test-candidate");
  run("verify", "--input", candidate);

  await cp(root, previousSource, {
    recursive: true,
    filter: (source) => ![".git", "node_modules", "dist", "playwright-report", "test-results"].includes(path.basename(source)),
  });
  for (const relative of ["assets/js/config.js", "publish/assets/js/config.js"]) {
    const target = path.join(previousSource, relative);
    const source = await readFile(target, "utf8");
    await writeFile(target, source.replace("r10-phase9.0.0", "r10-phase8.0.0-test"), "utf8");
  }
  run("build", "--source", previousSource, "--output", previous, "--source-ref", "phase8-test-return");
  run("simulate-rollback", "--candidate", candidate, "--previous", previous, "--active", active, "--evidence", evidence);

  const result = JSON.parse(await readFile(evidence, "utf8"));
  const activeManifest = JSON.parse(await readFile(path.join(active, "release-manifest.json"), "utf8"));
  assert.equal(result.result, "success");
  assert.equal(result.production_touched, false);
  assert.equal(result.rollback.exact_previous_artifact_restored, true);
  assert.equal(activeManifest.artifact_sha256, result.rollback.artifact_sha256);
  assert.notEqual(result.candidate.artifact_sha256, result.rollback.artifact_sha256);

  const tampered = path.join(candidate, "publish/assets/js/app.js");
  await writeFile(tampered, `${await readFile(tampered, "utf8")}\n// alteración simulada\n`, "utf8");
  const rejected = spawnSync(process.execPath, [script, "verify", "--input", candidate], { cwd: root, encoding: "utf8" });
  assert.notEqual(rejected.status, 0, "Una alteración posterior al sellado debe bloquearse");

  for (const relative of ["assets/js/config.js", "publish/assets/js/config.js"]) {
    const target = path.join(previousSource, relative);
    const simulatedSecret = `sb_${"secret"}_example123`;
    await writeFile(target, `${await readFile(target, "utf8")}\nwindow.R10_FORBIDDEN = "${simulatedSecret}";\n`, "utf8");
  }
  const leaked = spawnSync(process.execPath, [script, "build", "--source", previousSource, "--output", path.join(temporary, "leaked-release")], { cwd: root, encoding: "utf8" });
  assert.notEqual(leaked.status, 0, "Un secreto debe bloquear la construcción del artefacto");

  console.log("Fase 9: artefacto inmutable, alteración bloqueada y retorno exacto simulados correctamente.");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
