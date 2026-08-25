import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile("index.html", "utf8");
const published = await readFile("publish/index.html", "utf8");
const moduleNames = [
  "config.js",
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

assert.equal(published, source, "index.html y publish/index.html deben ser idénticos");

const inlineScripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
assert.equal(inlineScripts.length, 0, "El HTML no puede volver a contener JavaScript concatenado");

const localScripts = [...source.matchAll(/<script\s+src="assets\/js\/([^"]+)"><\/script>/gi)].map(match => match[1]);
assert.deepEqual(localScripts, moduleNames, "Los módulos deben cargarse una sola vez y en el orden R10 acordado");

const moduleSources = new Map();
for (const moduleName of moduleNames) {
  const moduleSource = await readFile(`assets/js/${moduleName}`, "utf8");
  const publishedModule = await readFile(`publish/assets/js/${moduleName}`, "utf8");
  assert.equal(publishedModule, moduleSource, `El espejo de ${moduleName} debe ser exacto`);
  new vm.Script(moduleSource, { filename: `assets/js/${moduleName}` });
  moduleSources.set(moduleName, moduleSource);
}

assert.match(source, /@supabase\/supabase-js@2\.111\.0/, "La dependencia de navegador debe estar fijada");
assert.match(moduleSources.get("config.js"), /window\.VGE_CONFIG\s*=/, "La configuración debe residir en config.js");
assert.match(moduleSources.get("core.js"), /function friendlyError\(/, "Las utilidades deben residir en core.js");
assert.match(moduleSources.get("supabase-service.js"), /async function rpcJson\(/, "El servicio RPC debe estar separado");
assert.match(moduleSources.get("supabase-service.js"), /window\.supabase\.createClient\(/, "La conexión debe residir en el servicio Supabase");
assert.match(moduleSources.get("supabase-service.js"), /function supabaseFunction\(/, "Las Edge Functions deben pasar por el servicio Supabase");
assert.match(moduleSources.get("centers.js"), /async function createNewCenter\(/, "La gestión de centros debe estar separada");
assert.match(moduleSources.get("contacts.js"), /async function createCenterContact\(/, "La gestión de contactos debe estar separada");
assert.match(moduleSources.get("travel-agenda.js"), /async function saveOpportunity\(/, "Los viajes y la agenda deben estar separados");
assert.match(moduleSources.get("management.js"), /async function renderStatistics\(/, "Las operaciones de dirección deben estar separadas");
assert.match(moduleSources.get("owner.js"), /async function renderPermissions\(/, "Los controles del propietario deben estar separados");
assert.match(moduleSources.get("app.js"), /function render\(/, "La composición y el renderizado común deben permanecer en app.js");
assert.match(moduleSources.get("auth-permissions.js"), /initializeSupabaseClient\(\)/, "El arranque autenticado debe solicitar el cliente al servicio");
assert.match(moduleSources.get("auth-permissions.js"), /async function loadPermissionsForSession\(/, "Los permisos deben estar junto a autenticación");
const outsideSupabaseService = moduleNames
  .filter(name => name !== "supabase-service.js")
  .map(name => moduleSources.get(name))
  .join("\n");
assert.doesNotMatch(outsideSupabaseService, /\bsb\.(?:rpc|from|functions)\b/, "RPC, tablas y Edge Functions deben pasar por el servicio Supabase");

const publicFrontend = [source, ...moduleSources.values()].join("\n");
assert.doesNotMatch(publicFrontend, /service[_-]?role/i, "El frontend no puede contener una clave service role");

console.log(`Frontend modular validado: espejo exacto y ${moduleNames.length} módulos sintácticamente correctos.`);
