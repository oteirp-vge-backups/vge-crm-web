// CRM VGE R10 · Fase 8 · observabilidad técnica sin PII
const TECHNICAL_INCIDENT_SCHEMA_VERSION=1;
const TECHNICAL_COMPONENTS=new Set(["frontend","auth","database","data_api","edge_function"]);
const TECHNICAL_SEVERITIES=new Set(["warning","error","fatal"]);
const TECHNICAL_BUSINESS_CODES=new Set([
 "AUTH_REQUIRED","ACCESS_DENIED","OPERATOR_NOT_LINKED","INVALID_STATUS","INVALID_CHANNEL","INVALID_RESULT","NOTES_REQUIRED","CONTACT_BLOCKED","CONCURRENT_UPDATE","ASSIGNMENT_CHANGED","ADMIN_REQUIRED","OWNER_REQUIRED","OWNER_ROLE_PROTECTED","OPERATOR_CONFIRMATION_MISMATCH","ROLE_CHANGE_REASON_REQUIRED","OPERATOR_ACCOUNT_NOT_LINKED","ROLE_UNCHANGED","OPERATOR_INACTIVE","INVALID_ACCESS_ROLE","INVALID_OPERATOR","INVALID_STATS_PERIOD","STATS_SCOPE_DENIED","PERCENTAGES_MUST_SUM_100","NO_CENTERS_IN_SCOPE","SCHOOL_REQUIRED","CITY_REQUIRED","INVALID_PROVINCE","INVALID_LEAD_SOURCE","LEAD_SOURCE_DETAIL_REQUIRED","INVALID_SCHOOL_EMAIL","INVALID_CONTACT_EMAIL","INVALID_SCHOOL_PHONE","INVALID_CONTACT_PHONE","CENTER_REQUIRED","CENTER_NOT_FOUND","CENTER_STATE_NOT_FOUND","CENTER_ARCHIVED","CENTER_ALREADY_ARCHIVED","CENTER_NOT_ARCHIVED","CENTER_MUST_BE_ARCHIVED","CENTER_CONFIRMATION_MISMATCH","CENTER_LIFECYCLE_REASON_REQUIRED","CENTER_ALREADY_EXISTS","POSSIBLE_DUPLICATE_CONFIRM_REQUIRED","DEFAULT_CAMPAIGN_NOT_FOUND","CAMPAIGN_NOT_FOUND","CENTER_CAMPAIGN_NOT_FOUND","CONTACT_NAME_REQUIRED","CONTACT_BLOCK_REASON_REQUIRED","PRIMARY_CONTACT_MUST_BE_REPLACED","CONTACT_NOT_FOUND","INVALID_CENTER_CONTACT","INVALID_CYCLE","INVALID_STUDENTS_COUNT","INVALID_TEACHERS_COUNT","INVALID_TRAVEL_DATES","OPPORTUNITY_NOT_FOUND","OPPORTUNITY_ALREADY_ARCHIVED","OPPORTUNITY_NOT_ARCHIVED","OPPORTUNITY_LIFECYCLE_REASON_REQUIRED","CONCURRENT_OPPORTUNITY_UPDATE"
]);
let technicalIncidentTransport=null;
const technicalIncidentIds=new WeakMap();

function technicalUuid(){
 if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
 const hex=()=>Math.floor(Math.random()*0x10000).toString(16).padStart(4,"0");
 return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-${((8+Math.floor(Math.random()*4)).toString(16))}${hex().slice(1)}-${hex()}${hex()}${hex()}`
}
function technicalToken(value,fallback){const token=String(value||"").trim().toLowerCase();return /^[a-z][a-z0-9_]{1,63}$/.test(token)?token:fallback}
function technicalErrorCode(error){
 const explicit=String(error?.code||"").trim().toUpperCase();
 if(/^(?:[A-Z][A-Z0-9_]{2,63}|[0-9]{5})$/.test(explicit))return explicit;
 const message=String(error?.message||"").trim();
 if(/^[A-Z][A-Z0-9_]{2,63}$/.test(message))return message;
 for(const code of TECHNICAL_BUSINESS_CODES)if(message.includes(code))return code;
 const status=Number(error?.status||0);return status>=400&&status<=599?`HTTP_${status}`:"UNCLASSIFIED_ERROR"
}
function technicalSeverity(error){const code=technicalErrorCode(error);return TECHNICAL_BUSINESS_CODES.has(code)||code.startsWith("HTTP_4")?"warning":"error"}
function configureTechnicalIncidentTransport(transport){technicalIncidentTransport=typeof transport==="function"?transport:null}
function buildTechnicalIncident({component="frontend",operation="handled_error",error=null,severity="error"}={}){
 const appVersion=String(window.VGE_CONFIG?.appVersion||"unknown").toLowerCase();
 return Object.freeze({
  schema_version:TECHNICAL_INCIDENT_SCHEMA_VERSION,
  correlation_id:`r10-${technicalUuid()}`,
  occurred_at:new Date().toISOString(),
  app_version:/^[a-z0-9][a-z0-9._+-]{2,63}$/.test(appVersion)?appVersion:"unknown",
  severity:TECHNICAL_SEVERITIES.has(severity)?severity:"error",
  component:TECHNICAL_COMPONENTS.has(component)?component:"frontend",
  operation:technicalToken(operation,"handled_error"),
  error_code:technicalErrorCode(error)
 })
}
function reportTechnicalIncident(details={}){
 const incident=buildTechnicalIncident(details);
 console.error("[VGE_TECHNICAL_INCIDENT]",JSON.stringify(incident));
 if(technicalIncidentTransport)Promise.resolve(technicalIncidentTransport(incident)).catch(()=>console.warn("[VGE_OBSERVABILITY_DELIVERY_FAILED]",incident.correlation_id));
 return incident.correlation_id
}
function attachTechnicalIncident(error,details={}){
 if(error&&typeof error==="object"){
  const previous=technicalIncidentIds.get(error);if(previous)return previous;
  const correlationId=reportTechnicalIncident({...details,error});technicalIncidentIds.set(error,correlationId);
  try{Object.defineProperty(error,"vgeCorrelationId",{value:correlationId,configurable:true})}catch{}
  return correlationId
 }
 return reportTechnicalIncident({...details,error})
}
function technicalReference(error){const id=error?.vgeCorrelationId||(error&&typeof error==="object"?technicalIncidentIds.get(error):"");return id?` Referencia técnica: ${id}.`:""}

window.addEventListener("error",event=>attachTechnicalIncident(event.error||new Error("UNHANDLED_SCRIPT_ERROR"),{component:"frontend",operation:"unhandled_script_error",severity:"fatal"}));
window.addEventListener("unhandledrejection",event=>attachTechnicalIncident(event.reason||new Error("UNHANDLED_PROMISE_REJECTION"),{component:"frontend",operation:"unhandled_promise_rejection",severity:"fatal"}));
document.documentElement.dataset.vgeVersion=String(window.VGE_CONFIG?.appVersion||"unknown");
