const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const source = fs.readFileSync("publish/index.html", "utf8");

function functionSource(name) {
  const marker = `async function ${name}(`;
  const start = source.indexOf(marker);
  assert(start >= 0, `No se encontró ${name}`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let templateExpressionDepth = 0;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if (quote) {
      if (ch === "\\") { escaped = true; continue; }
      if (quote === "`" && ch === "$" && source[i + 1] === "{") {
        templateExpressionDepth++;
        depth++;
        i++;
        continue;
      }
      if (ch === quote && (quote !== "`" || templateExpressionDepth === 0)) quote = "";
      if (quote === "`" && ch === "}" && templateExpressionDepth) {
        templateExpressionDepth--;
        depth--;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth++;
    if (ch === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Función incompleta: ${name}`);
}

function field(value = "") {
  return { value, checked: false };
}

async function testCreateContact() {
  const oldButton = { disabled: false, textContent: "Añadir persona", isConnected: true };
  const elements = {
    createContactBtn: oldButton,
    newContactName: field("Fernando Prieto"),
    newContactRole: field("Responsable actividades"),
    newContactMobile: field("672432643"),
    newContactEmail: field("fprietomartinez@gmail.com"),
    newContactPrimary: { checked: true },
    newContactBlocked: { checked: false },
    newContactBlockedReason: field("")
  };
  const context = {
    centers: [{ id: "CLM-0261" }], currentCenterId: "CLM-0261",
    createContactInFlight: false,
    document: { getElementById: id => elements[id] || null },
    confirmContactIsDistinct: () => true,
    loadWorkspace: async () => {},
    showDialogActionStatus: () => {},
    sb: { rpc: async () => ({ error: null }) },
    refreshOpenCenter: async () => {
      oldButton.isConnected = false;
      elements.createContactBtn = { disabled: true, textContent: "Registrando persona…", isConnected: true };
    },
    friendlyError: () => "error", alert: () => {}, console
  };
  vm.createContext(context);
  vm.runInContext(`${functionSource("createCenterContact")}; this.run = createCenterContact;`, context);
  await context.run();
  assert.equal(elements.createContactBtn.disabled, false);
  assert.equal(elements.createContactBtn.textContent, "Añadir persona");
  assert.equal(context.createContactInFlight, false);
}

async function testCreateOpportunity() {
  const oldButton = { disabled: false, textContent: "Crear viaje", isConnected: true };
  const elements = {
    createOpportunityBtn: oldButton,
    newOppNext: field(""), newOppNextTime: field(""), newOppSourceChoice: field("Centro"), newOppSourceDetail: field(""),
    newOppCycle: field("4.º ESO"), newOppGroup: field("Grupo prueba"), newOppStudents: field("55"), newOppTeachers: field("4"),
    newOppDestination: field("Roma"), newOppStart: field(""), newOppEnd: field(""), newOppContact: field(""), newOppStatus: field("Pendiente")
  };
  const context = {
    centers: [{ id: "CLM-0261" }], currentCenterId: "CLM-0261", currentCampaign: { code: "2026-27" },
    createOpportunityInFlight: false,
    document: { getElementById: id => elements[id] || null },
    showDialogActionStatus: () => {}, nullableNumber: v => v === "" ? null : Number(v),
    resolvedOpportunitySource: () => "Centro", resolvedOpportunitySourceDetail: () => null, localDateTimeToISO: () => null,
    sb: { rpc: async () => ({ error: null }) },
    refreshOpenCenter: async () => {
      oldButton.isConnected = false;
      elements.createOpportunityBtn = { disabled: true, textContent: "Registrando viaje…", isConnected: true };
    },
    friendlyError: () => "error", alert: () => {}, console
  };
  vm.createContext(context);
  vm.runInContext(`${functionSource("createOpportunity")}; this.run = createOpportunity;`, context);
  await context.run();
  assert.equal(elements.createOpportunityBtn.disabled, false);
  assert.equal(elements.createOpportunityBtn.textContent, "Crear viaje");
  assert.equal(context.createOpportunityInFlight, false);
}

(async () => {
  assert(source.includes("VERSIÓN V15 · R9.8"));
  await testCreateContact();
  await testCreateOpportunity();
  assert(source.includes('currentBtn.textContent="Guardar persona"'));
  assert(source.includes('currentBtn.textContent="Guardar viaje"'));
  assert(source.includes('currentBtn.dataset.restoreOpportunity?"Restaurar viaje":"Archivar viaje"'));
  assert(source.includes("center_contacts_active_email_unique_idx"));
  assert(source.includes("center_contacts_active_phone_unique_idx"));
  console.log("R9.4: pruebas de liberación y tratamiento de duplicados superadas");
})().catch(error => { console.error(error); process.exit(1); });
