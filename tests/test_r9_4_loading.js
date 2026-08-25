const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const source = fs.readFileSync("publish/index.html", "utf8");

function functionSource(name) {
  const markers = [`function ${name}(`, `async function ${name}(`];
  const start = markers.map(marker => source.indexOf(marker)).filter(index => index >= 0).sort((a, b) => a - b)[0];
  assert(Number.isInteger(start), `No se encontró ${name}`);
  const brace = source.indexOf("{", start);
  let depth = 0, quote = "", escaped = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if (quote) {
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth++;
    if (ch === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Función incompleta: ${name}`);
}

const rows = Array.from({ length: 2505 }, (_, index) => ({ id: `ID-${String(index + 1).padStart(5, "0")}` }));
const calls = [];
function queryBuilder() {
  const state = { lower: null, limit: null };
  return {
    select() { return this; },
    order() { return this; },
    limit(value) { state.limit = value; return this; },
    gt(_column, value) { state.lower = value; return this; },
    then(resolve) {
      calls.push({ ...state });
      const start = state.lower === null ? 0 : rows.findIndex(row => row.id === state.lower) + 1;
      resolve({ data: rows.slice(start, start + state.limit), error: null });
    }
  };
}

const context = { sb: { from: () => queryBuilder() }, console };
vm.createContext(context);
vm.runInContext(`${functionSource("fetchAllRows")}; this.fetchAllRows=fetchAllRows;`, context);

(async () => {
  const result = await context.fetchAllRows("crm_centers");
  assert.equal(result.length, rows.length, "Debe recuperar todas las filas");
  assert.deepEqual(calls, [
    { lower: null, limit: 1000 },
    { lower: "ID-01000", limit: 1000 },
    { lower: "ID-02000", limit: 1000 }
  ], "Debe paginar por la última clave y no por OFFSET");
  assert(!functionSource("fetchAllRows").includes(".range("), "La carga masiva no puede volver a OFFSET");
  assert(functionSource("refreshOpenCenter").includes("refreshCenterSnapshot(id)"), "Tras guardar debe recargar sólo el centro abierto");
  assert(!functionSource("refreshOpenCenter").includes("loadAll()"), "Tras guardar no debe releer los 8.609 centros");
  for (const script of [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1])) new vm.Script(script);
  console.log("R9.4: carga por clave y refresco selectivo verificados");
})().catch(error => { console.error(error); process.exit(1); });
