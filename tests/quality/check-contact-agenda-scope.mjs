import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const contactsSource = await readFile("assets/js/contacts.js", "utf8");
const centersSource = await readFile("assets/js/centers.js", "utf8");
const serviceSource = await readFile("assets/js/supabase-service.js", "utf8");

function functionSource(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `No se encontró ${name}`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = brace; index < source.length; index++) {
    const char = source[index];
    if (escaped) { escaped = false; continue; }
    if (quote) {
      if (char === "\\") { escaped = true; continue; }
      if (char === quote) quote = "";
      continue;
    }
    if (["'", '"', "`"].includes(char)) { quote = char; continue; }
    if (char === "{") depth++;
    if (char === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Función incompleta: ${name}`);
}

const controls = {
  cResult: { value: "Pide presupuesto" },
  cNext: { value: "2099-05-01", disabled: false },
  cNextTime: { value: "10:30", disabled: false },
  cNextHelp: { textContent: "" },
  cResolveGeneral: { checked: true, disabled: false },
  cResolveGeneralHelp: { textContent: "" },
};
let selectedTrips = 0;
const context = {
  document: {
    getElementById: id => controls[id] || null,
    querySelectorAll: selector => selector === 'input[name="cOpportunity"]:checked'
      ? Array.from({ length: selectedTrips }, () => ({}))
      : [],
  },
};
vm.createContext(context);
vm.runInContext(`
  ${functionSource(contactsSource, "syncContactFollowupControls")}
  ${functionSource(contactsSource, "syncContactScopeControls")}
  this.syncContactFollowupControls = syncContactFollowupControls;
  this.syncContactScopeControls = syncContactScopeControls;
`, context);

context.syncContactFollowupControls();
assert.equal(controls.cNext.disabled, true, "Pide presupuesto debe desactivar la próxima fecha");
assert.equal(controls.cNextTime.disabled, true, "Pide presupuesto debe desactivar la próxima hora");
assert.equal(controls.cNext.value, "", "una fecha incompatible no debe permanecer visible");
assert.match(controls.cNextHelp.textContent, /cierra este seguimiento/);

controls.cResult.value = "Volver a contactar";
context.syncContactFollowupControls();
assert.equal(controls.cNext.disabled, false, "Volver a contactar debe permitir una nueva fecha");
assert.equal(controls.cNextTime.disabled, false, "Volver a contactar debe permitir una nueva hora");

context.syncContactScopeControls();
assert.equal(controls.cResolveGeneral.disabled, true, "sin viaje no se puede activar el doble alcance");
assert.equal(controls.cResolveGeneral.checked, false, "la opción no puede quedar marcada sin viaje");

selectedTrips = 1;
context.syncContactScopeControls();
assert.equal(controls.cResolveGeneral.disabled, false, "al seleccionar un viaje se habilita la resolución conjunta");
assert.match(controls.cResolveGeneralHelp.textContent, /misma conversación/);

assert.match(contactsSource, /p_also_resolve_general_followup:alsoResolveGeneral/, "el formulario debe enviar el alcance explícito al RPC");
assert.match(centersSource, /hasOverdueGeneralFollowup&&activeOpportunities\.length/, "la casilla solo debe mostrarse con agenda general vencida y viajes activos");
assert.match(centersSource, /También atendió la agenda general/, "el historial debe explicar el doble alcance");
assert.match(serviceSource, /alsoResolvedGeneralFollowup:!!r\.also_resolved_general_followup/, "el servicio debe conservar la marca de auditoría");

console.log("Agenda: cierre de fecha y doble alcance explícito verificados sin navegador.");
