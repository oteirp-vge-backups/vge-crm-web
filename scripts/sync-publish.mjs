import assert from "node:assert/strict";
import { copyFile, mkdir, readFile } from "node:fs/promises";

const artifacts = [
  "index.html",
  "assets/js/config.js",
  "assets/js/core.js",
  "assets/js/supabase-service.js",
  "assets/js/centers.js",
  "assets/js/contacts.js",
  "assets/js/travel-agenda.js",
  "assets/js/management.js",
  "assets/js/owner.js",
  "assets/js/app.js",
  "assets/js/auth-permissions.js",
];

const write = process.argv.includes("--write");

for (const sourcePath of artifacts) {
  const publishedPath = `publish/${sourcePath}`;
  if (write) {
    await mkdir(publishedPath.slice(0, publishedPath.lastIndexOf("/")), { recursive: true });
    await copyFile(sourcePath, publishedPath);
  }
  assert.deepEqual(
    await readFile(publishedPath),
    await readFile(sourcePath),
    `${publishedPath} debe ser una copia exacta de ${sourcePath}. Ejecuta npm run build:publish.`,
  );
}

console.log(`Espejo publicable verificado: ${artifacts.length} artefactos idénticos.`);
