import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repositoryRoot = process.cwd();
const policyPath = path.join(repositoryRoot, "release/r10-phase10-policy.json");
const manifestName = "release-manifest.json";
const includedRoots = [
  "publish",
  "supabase/config.toml",
  "supabase/functions",
  "supabase/migrations",
];
const textExtensions = new Set([".html", ".js", ".mjs", ".json", ".sql", ".toml", ".ts"]);
const forbiddenSecretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsb_secret_[A-Za-z0-9_-]{8,}\b/,
  /\bSUPABASE_ACCESS_TOKEN\s*[:=]\s*["'][^"']+["']/,
  /\bSUPABASE_DB_PASSWORD\s*[:=]\s*["'][^"']+["']/,
  /\bAWS_SECRET_ACCESS_KEY\s*[:=]\s*["'][^"']+["']/,
];

function option(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(root, relative = "") {
  const current = path.join(root, relative);
  const info = await stat(current);
  if (info.isFile()) return [relative.split(path.sep).join("/")];
  const files = [];
  for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await walk(root, child));
    else if (entry.isFile()) files.push(child.split(path.sep).join("/"));
  }
  return files;
}

function assertSafeMutablePath(target, source = "") {
  const resolved = path.resolve(target);
  const forbidden = new Set([
    path.parse(resolved).root,
    path.resolve(repositoryRoot),
    source ? path.resolve(source) : "",
  ]);
  assert(!forbidden.has(resolved), `Ruta mutable no permitida: ${resolved}`);
  assert(path.basename(resolved).length >= 3, `Ruta mutable demasiado amplia: ${resolved}`);
}

async function releaseFiles(sourceRoot) {
  const files = [];
  for (const included of includedRoots) {
    const absolute = path.join(sourceRoot, included);
    assert(await exists(absolute), `Falta el componente publicable ${included}`);
    const info = await stat(absolute);
    if (info.isFile()) files.push(included);
    else files.push(...(await walk(absolute)).map((file) => `${included}/${file}`));
  }
  return files.sort();
}

async function assertPublishMirror(sourceRoot) {
  const published = await walk(path.join(sourceRoot, "publish"));
  for (const relative of published) {
    const canonical = path.join(sourceRoot, relative);
    if (!(await exists(canonical))) continue;
    assert.deepEqual(
      await readFile(path.join(sourceRoot, "publish", relative)),
      await readFile(canonical),
      `El artefacto publicable diverge de la fuente: ${relative}`,
    );
  }
}

async function assertNoSecrets(root, files) {
  for (const relative of files) {
    if (!textExtensions.has(path.extname(relative))) continue;
    const content = await readFile(path.join(root, relative), "utf8");
    for (const pattern of forbiddenSecretPatterns) {
      assert(!pattern.test(content), `Se detectó un secreto prohibido en ${relative}`);
    }
  }
}

function releaseVersion(configSource) {
  const match = configSource.match(/appVersion:\s*["']([^"']+)["']/);
  assert(match, "No se pudo resolver appVersion en publish/assets/js/config.js");
  assert(/^r10-phase\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(match[1]), "appVersion no cumple el contrato R10");
  return match[1];
}

function manifestDigest(manifest) {
  return sha256(JSON.stringify({
    schema_version: manifest.schema_version,
    release_version: manifest.release_version,
    source_ref: manifest.source_ref,
    payload_sha256: manifest.payload_sha256,
    files: manifest.files,
  }));
}

async function buildRelease() {
  const sourceRoot = path.resolve(option("--source", repositoryRoot));
  const outputRoot = path.resolve(option("--output", "dist/r10-release"));
  const sourceRef = option("--source-ref", "local-working-tree");
  assertSafeMutablePath(outputRoot, sourceRoot);
  await assertPublishMirror(sourceRoot);
  const files = await releaseFiles(sourceRoot);
  await assertNoSecrets(sourceRoot, files);
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  const entries = [];
  for (const relative of files) {
    const source = path.join(sourceRoot, relative);
    const destination = path.join(outputRoot, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination);
    const body = await readFile(destination);
    entries.push({ path: relative, size: body.byteLength, sha256: sha256(body) });
  }
  const version = releaseVersion(await readFile(path.join(outputRoot, "publish/assets/js/config.js"), "utf8"));
  const payloadSha = sha256(entries.map((entry) => `${entry.path}\0${entry.size}\0${entry.sha256}`).join("\n"));
  const manifest = {
    schema_version: 1,
    release_version: version,
    source_ref: sourceRef,
    payload_sha256: payloadSha,
    file_count: entries.length,
    files: entries,
  };
  manifest.artifact_sha256 = manifestDigest(manifest);
  await writeFile(path.join(outputRoot, manifestName), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Artefacto ${version} sellado: ${manifest.artifact_sha256} (${entries.length} archivos).`);
}

async function verifyRelease(rootOption = "--input") {
  const inputRoot = path.resolve(option(rootOption, "dist/r10-release"));
  const manifest = JSON.parse(await readFile(path.join(inputRoot, manifestName), "utf8"));
  assert.equal(manifest.schema_version, 1, "Versión de manifiesto no soportada");
  assert.equal(manifest.file_count, manifest.files.length, "Recuento de archivos inconsistente");
  assert.equal(manifest.artifact_sha256, manifestDigest(manifest), "Huella del manifiesto inválida");
  const actualFiles = (await walk(inputRoot)).filter((file) => file !== manifestName).sort();
  assert.deepEqual(actualFiles, manifest.files.map((entry) => entry.path), "El paquete contiene archivos añadidos, ausentes o renombrados");
  for (const entry of manifest.files) {
    const body = await readFile(path.join(inputRoot, entry.path));
    assert.equal(body.byteLength, entry.size, `Tamaño alterado: ${entry.path}`);
    assert.equal(sha256(body), entry.sha256, `Contenido alterado: ${entry.path}`);
  }
  const payloadSha = sha256(manifest.files.map((entry) => `${entry.path}\0${entry.size}\0${entry.sha256}`).join("\n"));
  assert.equal(payloadSha, manifest.payload_sha256, "Huella del contenido inválida");
  await assertNoSecrets(inputRoot, actualFiles);
  assert.equal(
    releaseVersion(await readFile(path.join(inputRoot, "publish/assets/js/config.js"), "utf8")),
    manifest.release_version,
    "La versión ejecutable no coincide con el manifiesto",
  );
  console.log(`Artefacto verificado sin mutaciones: ${manifest.artifact_sha256}.`);
  return manifest;
}

async function policy() {
  return JSON.parse(await readFile(policyPath, "utf8"));
}

function changedFiles(baseRef) {
  execFileSync("git", ["cat-file", "-e", `${baseRef}^{commit}`], { cwd: repositoryRoot, stdio: "ignore" });
  const tracked = execFileSync("git", ["diff", "--name-only", baseRef], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim().split("\n").filter(Boolean);
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim().split("\n").filter(Boolean);
  return [...new Set([...tracked, ...untracked])].sort();
}

async function assertFunctionDeclarations(sourceRoot) {
  const config = await readFile(path.join(sourceRoot, "supabase/config.toml"), "utf8");
  const functionRoot = path.join(sourceRoot, "supabase/functions");
  const slugs = (await readdir(functionRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
  for (const slug of slugs) {
    assert(config.includes(`[functions.${slug}]`), `La Edge Function ${slug} no está declarada en supabase/config.toml`);
  }
}

async function preflight() {
  const rules = await policy();
  const baseRef = option("--base-ref", rules.rollback_ref);
  const files = changedFiles(baseRef);
  assert(files.length > 0, "La Fase 9 no contiene cambios respecto al punto de retorno");
  for (const relative of files) {
    if (relative.startsWith("supabase/baseline/") && relative.endsWith(".sql")) {
      throw new Error(`Cambio SQL fuera de una migración nueva: ${relative}`);
    }
    if (relative.startsWith("supabase/") && relative.endsWith(".sql") &&
        !relative.startsWith("supabase/migrations/") && !relative.startsWith("supabase/tests/")) {
      throw new Error(`SQL no permitido fuera de migrations/tests: ${relative}`);
    }
    if (!(await exists(path.join(repositoryRoot, relative))) || !textExtensions.has(path.extname(relative))) continue;
    const content = await readFile(path.join(repositoryRoot, relative), "utf8");
    if (/create\s+(?:or\s+replace\s+)?function\b/i.test(content) && !relative.startsWith("supabase/migrations/")) {
      throw new Error(`Función SQL sin migración: ${relative}`);
    }
  }
  await assertNoSecrets(repositoryRoot, files.filter((file) => textExtensions.has(path.extname(file)) && !file.startsWith("supabase/migrations/")));
  await assertFunctionDeclarations(repositoryRoot);
  const version = releaseVersion(await readFile(path.join(repositoryRoot, "publish/assets/js/config.js"), "utf8"));
  assert.equal(version, rules.release_version, "La versión del frontend no coincide con la política de Fase 9");
  console.log(`Preflight de Fase 10 correcto: ${files.length} cambios revisados desde ${baseRef}.`);
}

async function simulateRollback() {
  const candidateRoot = path.resolve(option("--candidate"));
  const previousRoot = path.resolve(option("--previous"));
  const activeRoot = path.resolve(option("--active"));
  const evidencePath = path.resolve(option("--evidence", "dist/r10-rollback-evidence.json"));
  assert(option("--candidate") && option("--previous") && option("--active"), "Faltan rutas para la simulación de retorno");
  assertSafeMutablePath(activeRoot);
  assertSafeMutablePath(evidencePath);
  const candidate = await verifyRelease("--candidate");
  const previous = await verifyRelease("--previous");
  assert.notEqual(candidate.artifact_sha256, previous.artifact_sha256, "Candidato y retorno deben ser artefactos distintos");
  assert.notEqual(candidate.release_version, previous.release_version, "Candidato y retorno deben identificar versiones distintas");

  await rm(activeRoot, { recursive: true, force: true });
  await cp(candidateRoot, activeRoot, { recursive: true });
  const activeCandidate = JSON.parse(await readFile(path.join(activeRoot, manifestName), "utf8"));
  assert.equal(activeCandidate.artifact_sha256, candidate.artifact_sha256, "La promoción simulada alteró el candidato");

  const simulatedHealthCheck = "POST_DEPLOY_HEALTHCHECK_FAILED_AS_PLANNED";
  await rm(activeRoot, { recursive: true, force: true });
  await cp(previousRoot, activeRoot, { recursive: true });
  const activePrevious = await verifyRelease("--active");
  assert.equal(activePrevious.artifact_sha256, previous.artifact_sha256, "El retorno no restauró la huella anterior");

  const evidence = {
    schema_version: 1,
    simulation: true,
    production_touched: false,
    candidate: {
      release_version: candidate.release_version,
      artifact_sha256: candidate.artifact_sha256,
    },
    injected_health_result: simulatedHealthCheck,
    rollback: {
      release_version: activePrevious.release_version,
      artifact_sha256: activePrevious.artifact_sha256,
      exact_previous_artifact_restored: true,
    },
    result: "success",
  };
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`Retorno simulado correcto: ${candidate.release_version} -> ${activePrevious.release_version}.`);
}

const command = process.argv[2];
if (command === "build") await buildRelease();
else if (command === "verify") await verifyRelease();
else if (command === "preflight") await preflight();
else if (command === "simulate-rollback") await simulateRollback();
else throw new Error("Uso: r10-release.mjs <build|verify|preflight|simulate-rollback> [opciones]");
