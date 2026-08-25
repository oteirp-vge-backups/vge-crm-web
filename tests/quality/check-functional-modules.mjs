import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const contracts = {
  "centers.js": {
    declarations: 37,
    markers: ["renderArchivedCenters", "renderList", "createNewCenter", "openCenter", "saveProfile", "bindCenterDialog"],
  },
  "contacts.js": {
    declarations: 6,
    markers: ["contactsHtml", "addContact", "saveContactRecord", "archiveContactRecord", "createCenterContact"],
  },
  "travel-agenda.js": {
    declarations: 21,
    markers: ["opportunitiesHtml", "saveOpportunity", "createOpportunity", "changeOpportunityLifecycle", "checkReminders"],
  },
  "management.js": {
    declarations: 41,
    markers: ["renderStatistics", "renderTeamPresence", "renderBulkAssignment", "exportExcel", "exportCSV"],
  },
  "owner.js": {
    declarations: 13,
    markers: ["renderPermissions", "inviteOperatorAccess", "applyOperatorRoleChange", "permanentlyDeleteArchivedCenter", "exportJSON"],
  },
  "app.js": {
    declarations: 11,
    markers: ["updateNavCounts", "render", "renderDashboard"],
  },
};

const owners = new Map();
for (const [moduleName, contract] of Object.entries(contracts)) {
  const source = await readFile(`assets/js/${moduleName}`, "utf8");
  const declarations = [...source.matchAll(/^(?:(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|const\s+([A-Za-z_$][\w$]*)\s*=)/gm)]
    .map(match => match[1] || match[2]);
  assert.equal(declarations.length, contract.declarations, `${moduleName} debe conservar su inventario funcional`);
  for (const marker of contract.markers) {
    assert.ok(declarations.includes(marker), `${marker} debe pertenecer a ${moduleName}`);
  }
  for (const declaration of declarations) {
    assert.ok(!owners.has(declaration), `${declaration} no puede estar duplicada entre ${owners.get(declaration)} y ${moduleName}`);
    owners.set(declaration, moduleName);
  }
}

const residual = await readFile("assets/js/app.js", "utf8");
assert.ok(Buffer.byteLength(residual) < 10_000, "app.js debe seguir siendo un compositor ligero tras la extracción funcional");
assert.doesNotMatch(residual, /function\s+(?:createNewCenter|createCenterContact|saveOpportunity|renderStatistics|renderPermissions)\s*\(/, "app.js no puede recuperar responsabilidades funcionales extraídas");

console.log(`Contratos funcionales validados: ${Object.keys(contracts).length} módulos y ${owners.size} declaraciones con propietario único.`);
