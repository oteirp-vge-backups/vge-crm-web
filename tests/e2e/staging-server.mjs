import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const PRODUCTION_PROJECT_REF = "sjraugywirjohrqmacvb";
const root = process.cwd();
const port = Number(process.env.R10_STAGING_PORT || 4174);
const stagingUrl = process.env.R10_STAGING_SUPABASE_URL || "";
const publishableKey = process.env.R10_STAGING_SUPABASE_PUBLISHABLE_KEY || "";

function validateConfiguration() {
  let parsed;
  try {
    parsed = new URL(stagingUrl);
  } catch {
    throw new Error("R10_STAGING_SUPABASE_URL no es una URL valida.");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
    throw new Error("El STAGING debe usar un endpoint HTTPS de Supabase.");
  }
  if (parsed.hostname.startsWith(`${PRODUCTION_PROJECT_REF}.`)) {
    throw new Error("BLOQUEADO: las pruebas integradas no pueden apuntar a produccion.");
  }
  if (!publishableKey || /service_role/i.test(publishableKey)) {
    throw new Error("Falta una Publishable Key valida; nunca se admite service_role.");
  }
  return parsed.hostname.split(".")[0];
}

const stagingProjectRef = validateConfiguration();
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);

function injectStagingConfig(source) {
  const configPattern = /window\.VGE_CONFIG\s*=\s*\{[\s\S]*?\};/g;
  const matches = source.match(configPattern) || [];
  if (matches.length !== 1) throw new Error("No se encontro un unico bloque VGE_CONFIG.");
  const injected = source.replace(configPattern, `window.VGE_CONFIG = ${JSON.stringify({
    supabaseUrl: stagingUrl,
    supabasePublishableKey: publishableKey,
  })};`);
  if (injected.includes(PRODUCTION_PROJECT_REF)) {
    throw new Error("BLOQUEADO: la configuracion servida conserva una referencia a produccion.");
  }
  return injected;
}

http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    if (pathname === "/__r10_staging") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify({ staging: true, projectRef: stagingProjectRef }));
      return;
    }
    const requested = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.resolve(root, `.${requested}`);
    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) throw new Error("Ruta no permitida");
    const body = await readFile(filePath);
    const extension = path.extname(filePath);
    const relativePath = path.relative(root, filePath).split(path.sep).join("/");
    const isConfig = relativePath === "assets/js/config.js" || relativePath === "publish/assets/js/config.js";
    const payload = isConfig ? Buffer.from(injectStagingConfig(body.toString("utf8"))) : body;
    if (extension === ".html" && body.includes(PRODUCTION_PROJECT_REF)) {
      throw new Error("BLOQUEADO: el HTML servido contiene una referencia a produccion.");
    }
    response.writeHead(200, {
      "content-type": contentTypes.get(extension) ?? "application/octet-stream",
      "cache-control": "no-store",
      "x-r10-staging-project": stagingProjectRef,
    });
    response.end(payload);
  } catch (error) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end(`Not found: ${error.message}`);
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Servidor R10 STAGING aislado en http://127.0.0.1:${port} (${stagingProjectRef})`);
});
