import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const contacts = await readFile("assets/js/contacts.js", "utf8");
const centers = await readFile("assets/js/centers.js", "utf8");
const service = await readFile("assets/js/supabase-service.js", "utf8");
const migration = await readFile(
  "supabase/migrations/20260916193916_add_internal_notes_history.sql",
  "utf8",
);
const rollback = await readFile(
  "docs/rollback/R10_INTERNAL_NOTES_ROLLBACK.md",
  "utf8",
);

assert.match(migration, /create table public\.center_internal_notes/i);
assert.match(migration, /alter table public\.center_internal_notes enable row level security/i);
assert.match(migration, /revoke all on table public\.center_internal_notes[\s\S]*authenticated/i);
assert.match(migration, /create\s+or\s+replace\s+function\s+public\.register_internal_note_v1/i);
assert.match(migration, /if not private\.can_access_center\(p_center_id\)/i);
assert.match(migration, /grant execute on function public\.register_internal_note_v1\(text, text\)[\s\S]*to authenticated/i);
assert.doesNotMatch(
  migration,
  /update\s+public\.center_state/i,
  "la migración de notas no debe alterar el estado comercial del centro",
);
assert.doesNotMatch(
  migration,
  /update\s+public\.travel_opportunities/i,
  "la migración de notas no debe alterar viajes ni sus contadores",
);

assert.match(contacts, /async function addInternalNote\(\)/);
assert.match(contacts, /supabaseRpc\("register_internal_note_v1",\{p_center_id:c\.id,p_notes:note\}\)/);
assert.doesNotMatch(
  contacts.match(/async function addInternalNote\(\)[\s\S]*?\n}\nasync function saveContactRecord/)?.[0] || "",
  /contactCount|lastContactAt|lastResult|nextContact/,
  "el frontend no puede simular cambios comerciales al guardar una nota",
);
assert.match(contacts, /supabaseRpc\("register_contact_multi_v1"/);

assert.match(centers, /id="cChannel" required/);
assert.match(centers, /id="cResult" required/);
assert.match(centers, /id="internalNoteBtn">Guardar anotación interna/);
assert.match(centers, /entryType!=="internal_note"/);
assert.match(centers, /No cuenta como contacto ni modifica la agenda o las estadísticas/);
assert.match(service, /entryType:r\.entry_type\|\|"contact"/);

assert.match(rollback, /drop function if exists public\.register_internal_note_v1/i);
assert.match(rollback, /drop table public\.center_internal_notes/i);
assert.match(rollback, /'schema_version', 15/);

console.log("Anotaciones internas: separación estadística, permisos, interfaz y retorno verificados.");
