const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const source = fs.readFileSync("publish/index.html", "utf8");

function functionSource(name) {
  const markers = [`function ${name}(`, `async function ${name}(`];
  const start = markers.map(marker => source.indexOf(marker)).filter(index => index >= 0).sort((a, b) => a - b)[0];
  assert(Number.isInteger(start), `No se encontró ${name}`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
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

function control({ id, value = "", type = "text", checked = false, field = "", name = "" }) {
  return {
    id, value, type, checked, name, tagName: "INPUT", dataset: { field },
    getAttribute: key => key === "value" ? value : null,
    closest: () => null
  };
}

function scope(name, controls) {
  const wrap = { dataset: { dirtyScope: name }, querySelectorAll: () => controls };
  controls.forEach(item => { item.closest = () => wrap; });
  return wrap;
}

const profileStatus = control({ id: "fStatus", value: "Pendiente" });
const profileBlocked = control({ id: "fContactBlocked", type: "checkbox", checked: false });
const newContactName = control({ id: "newContactName", value: "" });
const profile = scope("profile", [profileStatus, profileBlocked]);
const newContact = scope("new-contact", [newContactName]);
const scopes = [profile, newContact];
let indicatorVisible = false;
let confirmCalls = 0;
let confirmAnswer = false;
let closeCalls = 0;
const indicator = { classList: { toggle: (_name, visible) => { indicatorVisible = visible; } } };
const dlg = {
  open: true,
  querySelectorAll: selector => selector === "[data-dirty-scope]" ? scopes : [],
  close: () => { closeCalls++; dlg.open = false; },
  oninput: null,
  onchange: null,
  oncancel: null
};
const context = {
  document: {
    getElementById: id => id === "unsavedIndicator" ? indicator : id === "centerDialog" ? dlg : null,
    querySelectorAll: selector => selector === "[data-dirty-scope]" ? scopes : []
  },
  confirm: () => { confirmCalls++; return confirmAnswer; },
  alert: () => {},
  console
};
vm.createContext(context);
vm.runInContext(`
  let centerDialogDirtyScopes=new Set(), centerDialogHydrating=false, centerDialogScopeBaselines=new Map();
  let profileSaveInFlight=false,contactEventInFlight=false,createContactInFlight=false,createOpportunityInFlight=false;
  const contactSaveInFlight=new Set(),opportunitySaveInFlight=new Set(),lifecycleInFlight=new Set();
  ${functionSource("updateUnsavedIndicator")}
  ${functionSource("dirtyScopeWrap")}
  ${functionSource("dirtyScopeSnapshot")}
  ${functionSource("rebuildCenterScopeBaselines")}
  ${functionSource("markCenterScopeDirty")}
  ${functionSource("clearCenterScopeDirty")}
  ${functionSource("centerOperationBusy")}
  ${functionSource("requestCloseCenterDialog")}
  ${functionSource("dirtyControlDescriptor")}
  ${functionSource("captureDirtyDrafts")}
  ${functionSource("restoreDirtyDrafts")}
  ${functionSource("bindCenterDirtyTracking")}
  this.audit={
    bindCenterDirtyTracking,markCenterScopeDirty,clearCenterScopeDirty,captureDirtyDrafts,restoreDirtyDrafts,requestCloseCenterDialog,
    dirty:()=>[...centerDialogDirtyScopes]
  };
`, context);

context.audit.bindCenterDirtyTracking(dlg);
assert.deepEqual(context.audit.dirty(), [], "Abrir una ficha no debe crear cambios pendientes");

dlg.oninput({ target: profileStatus });
assert.deepEqual(context.audit.dirty(), [], "Un evento sin cambio real no debe ensuciar la ficha");

profileStatus.value = "Interesado";
dlg.onchange({ target: profileStatus });
assert.deepEqual(context.audit.dirty(), ["profile"]);
assert.equal(indicatorVisible, true);

profileStatus.value = "Pendiente";
dlg.onchange({ target: profileStatus });
assert.deepEqual(context.audit.dirty(), [], "Revertir al valor guardado debe limpiar el aviso");

profileBlocked.checked = true;
dlg.onchange({ target: profileBlocked });
assert.deepEqual(context.audit.dirty(), ["profile"], "Los checkbox deben quedar controlados");
profileBlocked.checked = false;
dlg.onchange({ target: profileBlocked });
assert.deepEqual(context.audit.dirty(), []);

profileStatus.value = "Interesado";
dlg.onchange({ target: profileStatus });
newContactName.value = "Borrador distinto";
dlg.oninput({ target: newContactName });
assert.deepEqual(context.audit.dirty().sort(), ["new-contact", "profile"]);

const drafts = context.audit.captureDirtyDrafts(["profile"]);
assert(drafts.length > 0 && drafts.every(draft => draft.scope === "new-contact"), "Guardar perfil sólo debe excluir su propio ámbito");
context.audit.clearCenterScopeDirty("profile");
assert.deepEqual(context.audit.dirty(), ["new-contact"], "Un borrador ajeno debe seguir protegido");
assert.equal(indicatorVisible, true);

newContactName.value = "";
dlg.oninput({ target: newContactName });
assert.deepEqual(context.audit.dirty(), [], "Vaciar el borrador debe volver al estado limpio");
assert.equal(indicatorVisible, false);

confirmCalls = 0;
assert.equal(context.audit.requestCloseCenterDialog(), true, "Una ficha limpia debe cerrar sin confirmación");
assert.equal(confirmCalls, 0);
assert.equal(closeCalls, 1);

dlg.open = true;
context.audit.bindCenterDirtyTracking(dlg);
profileStatus.value = "No interesado";
context.audit.markCenterScopeDirty("profile");
confirmAnswer = false;
assert.equal(context.audit.requestCloseCenterDialog(), false, "Cancelar debe mantener abierta una ficha con cambios");
assert.equal(dlg.open, true);
confirmAnswer = true;
assert.equal(context.audit.requestCloseCenterDialog(), true, "Aceptar debe descartar y cerrar");
assert.equal(dlg.open, false);

const dupContext = { console };
vm.createContext(dupContext);
vm.runInContext(`
  ${functionSource("norm")}
  ${functionSource("duplicateContactCheck")}
  this.check=duplicateContactCheck;
`, dupContext);
const center = { workspace: { contacts: [
  { contact_id: 18, active: true, full_name: "Fernando Prieto", email: "FPrieto@example.com", mobile: "672 432 643" },
  { contact_id: 19, active: false, full_name: "Archivado", email: "archivado@example.com", mobile: "600000000" }
] } };
assert(dupContext.check(center, { full_name: "Otra persona", email: " fprieto@EXAMPLE.com ", mobile: "" }).hard.email, "Debe bloquear emails ignorando mayúsculas y espacios");
assert(dupContext.check(center, { full_name: "Otra persona", email: "", mobile: "672-432-643" }).hard.phone, "Debe bloquear teléfonos con distinto formato");
assert.equal(dupContext.check(center, { full_name: "Archivado", email: "archivado@example.com", mobile: "600000000" }).matches.length, 0, "Un contacto archivado no debe impedir un alta legítima");
assert.equal(dupContext.check(center, { full_name: "Fernando Prieto", email: "FPrieto@example.com", mobile: "672432643" }, 18).matches.length, 0, "Editar el propio registro no debe detectarse como duplicado");

for (const script of [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1])) new vm.Script(script);
assert(source.includes("window.addEventListener(\"beforeunload\""), "Debe conservar protección al abandonar la página");
assert(source.includes("center_contacts_active_email_unique_idx"));
assert(source.includes("center_contacts_active_phone_unique_idx"));
assert(source.includes("VERSIÓN V15 · R9.8"));
console.log("R9.4: auditoría ampliada de regresión superada (14 escenarios)");
