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

const context = {
  portfolioStatus: center => center.status,
  hasFutureFollowup: center => !!center.future,
  console
};
vm.createContext(context);
vm.runInContext(`${functionSource("qualityIssueCount")}; this.count=qualityIssueCount;`, context);

const rows = [
  { mobile: "", schoolPhone: "", directEmail: "a@b.es", schoolEmail: "", contactName: "Ana", opportunityTotal: 1, status: "Pendiente", future: false },
  { mobile: "600", schoolPhone: "", directEmail: "", schoolEmail: "", contactName: "Luis", opportunityTotal: 1, status: "Pendiente", future: false },
  { mobile: "600", schoolPhone: "", directEmail: "a@b.es", schoolEmail: "", contactName: "", opportunityTotal: 1, status: "Pendiente", future: false },
  { mobile: "600", schoolPhone: "", directEmail: "a@b.es", schoolEmail: "", contactName: "Eva", opportunityTotal: 0, status: "Pendiente", future: false },
  { mobile: "600", schoolPhone: "", directEmail: "a@b.es", schoolEmail: "", contactName: "Eva", opportunityTotal: 1, status: "Interesado", future: false },
  { mobile: "600", schoolPhone: "", directEmail: "a@b.es", schoolEmail: "", contactName: "Eva", opportunityTotal: 1, status: "Interesado", future: true }
];
assert.equal(context.count(rows, "quality-phone"), 1);
assert.equal(context.count(rows, "quality-email"), 1);
assert.equal(context.count(rows, "quality-contact"), 1);
assert.equal(context.count(rows, "quality-travel"), 1);
assert.equal(context.count(rows, "quality-followup"), 1);

const historyLoader = functionSource("loadHistory");
assert(historyLoader.includes("r.contacted_at"), "El historial debe conservar la hora real del contacto");
assert(historyLoader.includes("r.created_at"), "El historial debe conservar la hora de registro");
assert(historyLoader.includes("r.operator_name||r.operator_code"), "El historial debe identificar al autor");
assert(historyLoader.includes("r.opportunities||[]"), "El historial debe conservar los viajes vinculados");

const dialog = functionSource("dialogHtml");
assert(dialog.includes('(b.createdAt||"").localeCompare(a.createdAt||"")'), "Los contactos deben mostrarse del más reciente al más antiguo");
assert(dialog.includes("Registrado ${fmtDateTime(e.createdAt)}"), "Debe distinguir contacto y registro");
assert(dialog.includes("e.opportunities.map"), "Debe mostrar los viajes enlazados");

const opportunityHistory = functionSource("opportunityHistoryHtml");
assert(opportunityHistory.includes("b.acted_at"), "El historial de viajes debe ordenar por fecha descendente");
assert(opportunityHistory.includes("a.acted_by_name"), "El historial de viajes debe mostrar al autor");
assert(opportunityHistory.includes("fmtDateTime(a.acted_at)"), "El historial de viajes debe mostrar fecha y hora");

console.log("R9.4: calidad de datos e historial verificados");
