import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile("index.html", "utf8");
const published = await readFile("publish/index.html", "utf8");

assert.equal(published, source, "index.html y publish/index.html deben ser idénticos");

const inlineScripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
assert.ok(inlineScripts.length >= 2, "No se encontraron los scripts inline esperados");

inlineScripts.forEach((match, index) => {
  new vm.Script(match[1], { filename: `index.html:inline-script-${index + 1}.js` });
});

assert.match(source, /@supabase\/supabase-js@2\.111\.0/, "La dependencia de navegador debe estar fijada");
assert.doesNotMatch(source, /service[_-]?role/i, "El frontend no puede contener una clave service role");

console.log(`Frontend validado: espejo exacto y ${inlineScripts.length} scripts sintácticamente correctos.`);
