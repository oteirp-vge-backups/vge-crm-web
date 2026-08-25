import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = process.cwd();
const guardPath = "tests/quality/check-obsolete-components.mjs";
const excludedDirectories = new Set([".git", "docs", "node_modules", "test-results"]);
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".mjs",
  ".md",
  ".sql",
  ".toml",
  ".ts",
  ".txt",
  ".yaml",
  ".yml",
]);

const obsoleteComponents = [
  ["cotizaciones", "ruta_cotizaciones.html", "supabase_cotizaciones.js"],
  ["facturas", "ruta_facturas.html", "supabase_facturas.js"],
  ["ingresos", "ruta_ingresos.html", "supabase_ingresos.js"],
  ["gastos", "ruta_gastos.html", "supabase_gastos.js"],
  ["productos", "ruta_productos.html", "supabase_productos.js"],
];

async function listFiles(directory = repositoryRoot) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolutePath));
    if (entry.isFile()) files.push(path.relative(repositoryRoot, absolutePath));
  }

  return files;
}

const files = await listFiles();
const sourceFiles = files.filter((file) =>
  file !== guardPath && textExtensions.has(path.extname(file).toLowerCase())
);

for (const [name, route, adapter] of obsoleteComponents) {
  for (const obsoleteFile of [route, adapter]) {
    assert.equal(
      files.some((file) => file === obsoleteFile || file.endsWith(`/${obsoleteFile}`)),
      false,
      `El archivo obsoleto ${obsoleteFile} no puede volver al repositorio.`,
    );

    for (const sourceFile of sourceFiles) {
      const source = await readFile(sourceFile, "utf8");
      assert.equal(
        source.includes(obsoleteFile),
        false,
        `${sourceFile} conserva una referencia activa a ${obsoleteFile}.`,
      );
    }
  }

  console.log(`OK: componente ${name} ausente y sin referencias activas.`);
}

console.log("Fase 4: cinco componentes obsoletos certificados y protegidos contra reintroduccion.");
