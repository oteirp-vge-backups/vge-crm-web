const fs = require("node:fs");
const path = require("node:path");

const originalReadFileSync = fs.readFileSync.bind(fs);
const publishedHtml = path.resolve("publish/index.html");
const moduleNames = [
  "config.js",
  "observability.js",
  "core.js",
  "supabase-service.js",
  "centers.js",
  "contacts.js",
  "travel-agenda.js",
  "management.js",
  "owner.js",
  "app.js",
  "auth-permissions.js",
];

fs.readFileSync = function readModularFrontend(file, options) {
  const source = originalReadFileSync(file, options);
  if (path.resolve(String(file)) !== publishedHtml || typeof source !== "string") return source;

  const modules = moduleNames.map(name =>
    originalReadFileSync(path.resolve(`publish/assets/js/${name}`), "utf8")
  );

  // Compatibilidad exclusiva para las pruebas unitarias heredadas que aíslan una
  // sola función y proporcionan un cliente `sb` simulado en su propio contexto.
  return [source, ...modules].join("\n")
    .replace(/\bsupabaseRpc\(/g, "sb.rpc(")
    .replace(/\bsupabaseFrom\(/g, "sb.from(");
};
