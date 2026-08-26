import { assertEquals } from "jsr:@std/assert@1.0.14";
import { parseTechnicalIncident, technicalAlertKey } from "./technical-incident.ts";

const valid = {
  schema_version: 1,
  correlation_id: "r10-9f73ae63-e27a-4f17-9333-5d44e076f23a",
  occurred_at: "2026-08-26T08:00:00.000Z",
  app_version: "r10-phase8.0.0",
  severity: "error",
  component: "database",
  operation: "get_statistics_dashboard_v2",
  error_code: "PGRST301",
} as const;

Deno.test("acepta exclusivamente el contrato técnico sin PII", () => {
  assertEquals(parseTechnicalIncident(valid), valid);
  assertEquals(technicalAlertKey(valid), "vge_technical_error");
});

Deno.test("rechaza campos libres capaces de contener PII", () => {
  assertEquals(parseTechnicalIncident({ ...valid, email: "persona@example.invalid" }), null);
  assertEquals(parseTechnicalIncident({ ...valid, message: "Llamar al 600000000" }), null);
  assertEquals(parseTechnicalIncident({ ...valid, stack: "detalle interno" }), null);
});

Deno.test("rechaza identificadores y clasificaciones fuera de contrato", () => {
  assertEquals(parseTechnicalIncident({ ...valid, correlation_id: "captura-123" }), null);
  assertEquals(parseTechnicalIncident({ ...valid, operation: "guardar ficha de Fernando" }), null);
  assertEquals(parseTechnicalIncident({ ...valid, error_code: "correo@example.invalid" }), null);
});
