import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile("assets/js/observability.js", "utf8");
const delivered = [];
const safeConsoleEvents = [];
const listeners = new Map();
const context = {
  window: {
    VGE_CONFIG: { appVersion: "r10-phase8.0.0" },
    addEventListener: (name, callback) => listeners.set(name, callback),
  },
  document: { documentElement: { dataset: {} } },
  crypto: { randomUUID: () => "9f73ae63-e27a-4f17-9333-5d44e076f23a" },
  console: {
    error: (...args) => safeConsoleEvents.push(args.join(" ")),
    warn: (...args) => safeConsoleEvents.push(args.join(" ")),
  },
  Date,
  Promise,
  Set,
  WeakMap,
  Error,
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(`${source}\nthis.audit={configureTechnicalIncidentTransport,attachTechnicalIncident,technicalReference,technicalSeverity};`, context);
context.audit.configureTechnicalIncidentTransport((incident) => delivered.push(incident));

const rawError = {
  code: "PGRST301",
  message: "Fernando · fernando@example.invalid · 600000000",
  stack: "https://crm.viajesdegruposescolares.com/centro/LEON-001",
};
const correlationId = context.audit.attachTechnicalIncident(rawError, {
  component: "database",
  operation: "simulated_failure",
  severity: context.audit.technicalSeverity(rawError),
});
await Promise.resolve();

assert.equal(correlationId, "r10-9f73ae63-e27a-4f17-9333-5d44e076f23a");
assert.equal(delivered.length, 1);
assert.deepEqual(Object.keys(delivered[0]).sort(), [
  "app_version", "component", "correlation_id", "error_code", "occurred_at",
  "operation", "schema_version", "severity",
]);
assert.equal(delivered[0].app_version, "r10-phase8.0.0");
assert.equal(delivered[0].component, "database");
assert.equal(delivered[0].operation, "simulated_failure");
assert.equal(delivered[0].error_code, "PGRST301");
assert.match(context.audit.technicalReference(rawError), new RegExp(correlationId));

const serialized = JSON.stringify(delivered) + safeConsoleEvents.join("\n");
for (const forbidden of ["Fernando", "fernando@example.invalid", "600000000", "LEON-001", "centro/"]) {
  assert.ok(!serialized.includes(forbidden), `La telemetría no puede contener ${forbidden}`);
}

context.audit.attachTechnicalIncident(rawError, { component: "frontend", operation: "duplicate" });
await Promise.resolve();
assert.equal(delivered.length, 1, "un mismo error no debe generar incidencias duplicadas");
assert.ok(listeners.has("error") && listeners.has("unhandledrejection"), "los fallos no controlados deben quedar capturados");

const frontendFiles = ["core.js", "supabase-service.js", "centers.js", "contacts.js", "travel-agenda.js", "management.js", "owner.js", "app.js", "auth-permissions.js"];
for (const file of frontendFiles) {
  const moduleSource = await readFile(`assets/js/${file}`, "utf8");
  assert.doesNotMatch(moduleSource, /console\.(?:error|warn)\s*\(/, `${file} no debe registrar objetos o mensajes libres`);
}

console.log("Fase 8: incidencia simulada correlacionada y diagnosticable sin PII ni pantallazo.");
