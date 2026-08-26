export const TECHNICAL_INCIDENT_KEYS = [
  "app_version",
  "component",
  "correlation_id",
  "error_code",
  "occurred_at",
  "operation",
  "schema_version",
  "severity",
] as const;

export type TechnicalIncident = {
  schema_version: 1;
  correlation_id: string;
  occurred_at: string;
  app_version: string;
  severity: "warning" | "error" | "fatal";
  component: "frontend" | "auth" | "database" | "data_api" | "edge_function";
  operation: string;
  error_code: string;
};

const severities = new Set(["warning", "error", "fatal"]);
const components = new Set(["frontend", "auth", "database", "data_api", "edge_function"]);

export function parseTechnicalIncident(value: unknown): TechnicalIncident | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const keys = Object.keys(input).sort();
  if (keys.length !== TECHNICAL_INCIDENT_KEYS.length) return null;
  if (!keys.every((key, index) => key === TECHNICAL_INCIDENT_KEYS[index])) return null;
  if (input.schema_version !== 1) return null;
  if (typeof input.correlation_id !== "string" || !/^r10-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(input.correlation_id)) return null;
  if (typeof input.occurred_at !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(input.occurred_at) || Number.isNaN(Date.parse(input.occurred_at))) return null;
  if (typeof input.app_version !== "string" || !/^[a-z0-9][a-z0-9._+-]{2,63}$/.test(input.app_version)) return null;
  if (typeof input.severity !== "string" || !severities.has(input.severity)) return null;
  if (typeof input.component !== "string" || !components.has(input.component)) return null;
  if (typeof input.operation !== "string" || !/^[a-z][a-z0-9_]{1,63}$/.test(input.operation)) return null;
  if (typeof input.error_code !== "string" || !/^(?:[A-Z][A-Z0-9_]{2,63}|[0-9]{5})$/.test(input.error_code)) return null;
  return input as TechnicalIncident;
}

export function technicalAlertKey(incident: TechnicalIncident) {
  if (incident.severity === "fatal") return "vge_technical_fatal";
  if (incident.severity === "error") return "vge_technical_error";
  return "vge_technical_warning";
}
