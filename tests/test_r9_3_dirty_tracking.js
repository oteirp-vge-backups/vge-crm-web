const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const source = fs.readFileSync("publish/index.html", "utf8");

function functionSource(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert(start >= 0, `No se encontró ${name}`);
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

function control({ id, type = "text", value = "", checked = false, field = "", name = "" }) {
  return {
    id, type, value, checked, name, tagName: "INPUT", dataset: { field },
    getAttribute: attr => attr === "value" ? value : null,
    closest: () => null
  };
}

const profileControls = [
  control({ id: "fStatus", value: "Pendiente" }),
  control({ id: "fCity", value: "Guadalajara" }),
  control({ id: "fContactBlocked", type: "checkbox", checked: false })
];
const profileWrap = {
  dataset: { dirtyScope: "profile" },
  querySelectorAll: () => profileControls
};
profileControls.forEach(item => { item.closest = () => profileWrap; });

let indicatorVisible = false;
const indicator = { classList: { toggle: (_name, value) => { indicatorVisible = value; } } };
const dlg = {
  querySelectorAll: () => [profileWrap],
  oninput: null,
  onchange: null,
  oncancel: null
};
const context = {
  document: {
    getElementById: id => id === "unsavedIndicator" ? indicator : id === "centerDialog" ? dlg : null,
    querySelectorAll: () => [profileWrap]
  },
  requestCloseCenterDialog: () => true,
  console
};
vm.createContext(context);
vm.runInContext(`
  let centerDialogDirtyScopes=new Set(), centerDialogHydrating=false, centerDialogScopeBaselines=new Map();
  ${functionSource("updateUnsavedIndicator")}
  ${functionSource("dirtyScopeWrap")}
  ${functionSource("dirtyScopeSnapshot")}
  ${functionSource("rebuildCenterScopeBaselines")}
  ${functionSource("markCenterScopeDirty")}
  ${functionSource("clearCenterScopeDirty")}
  ${functionSource("bindCenterDirtyTracking")}
  this.api={
    bindCenterDirtyTracking,
    markCenterScopeDirty,
    dirtyCount:()=>centerDialogDirtyScopes.size,
    baselineCount:()=>centerDialogScopeBaselines.size
  };
`, context);

context.api.bindCenterDirtyTracking(dlg);
assert.equal(context.api.baselineCount(), 1, "Debe crear una referencia inicial por apartado");
assert.equal(context.api.dirtyCount(), 0, "Una ficha recién cargada no puede estar sucia");

dlg.oninput({ target: profileControls[0] });
assert.equal(context.api.dirtyCount(), 0, "Un evento sin cambio real no debe activar el aviso");
assert.equal(indicatorVisible, false);

profileControls[0].value = "Interesado";
dlg.onchange({ target: profileControls[0] });
assert.equal(context.api.dirtyCount(), 1, "Un valor distinto debe activar el aviso");
assert.equal(indicatorVisible, true);

profileControls[0].value = "Pendiente";
dlg.onchange({ target: profileControls[0] });
assert.equal(context.api.dirtyCount(), 0, "Volver al valor guardado debe retirar el aviso");
assert.equal(indicatorVisible, false);

profileControls[1].value = "Guadalajara capital";
dlg.oninput({ target: profileControls[1] });
assert.equal(context.api.dirtyCount(), 1);
context.api.bindCenterDirtyTracking(dlg);
assert.equal(context.api.dirtyCount(), 0, "Tras guardar y refrescar debe reconstruir la referencia");
dlg.oninput({ target: profileControls[1] });
assert.equal(context.api.dirtyCount(), 0, "Un evento residual posterior al guardado no debe reactivar el aviso");

for (const script of [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1])) {
  new vm.Script(script);
}
assert(source.includes("VERSIÓN V15 · R9.8"));
assert(source.includes("center_contacts_active_email_unique_idx"));
assert(source.includes("center_contacts_active_phone_unique_idx"));
console.log("R9.4: seguimiento de cambios reales y sintaxis verificados");
