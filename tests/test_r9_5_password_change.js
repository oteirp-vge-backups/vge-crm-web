const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const source = fs.readFileSync("publish/index.html", "utf8");

assert(source.includes("VERSIÓN V15 · R9.8"), "La corrección debe estar identificada como R9.8");
for (const id of [
  "changePasswordBtn",
  "passwordDialog",
  "changePasswordForm",
  "currentSessionPassword",
  "newSessionPassword",
  "newSessionPasswordRepeat",
  "changePasswordSubmitBtn",
  "changePasswordStatus"
]) assert(source.includes(`id=\"${id}\"`), `Falta el control ${id}`);

assert(source.includes('await sb.auth.updateUser({password,current_password:currentPassword})'), "El cambio debe enviar la contraseña actual exigida por Supabase");
assert(source.includes('autocomplete="current-password"'), "La contraseña actual debe identificarse correctamente para el navegador");
assert(source.includes('password.length<14'), "Debe exigir el mínimo real de 14 caracteres configurado en Supabase");
assert(!source.includes('minlength="12"'), "Ningún flujo puede seguir anunciando un mínimo obsoleto de 12 caracteres");
assert((source.match(/minlength="14"/g)||[]).length===4, "Los dos flujos deben exigir 14 caracteres en ambos campos");
assert(source.includes('/[a-z]/.test(password)'), "Debe exigir minúscula");
assert(source.includes('/[A-Z]/.test(password)'), "Debe exigir mayúscula");
assert(source.includes('/[0-9]/.test(password)'), "Debe exigir número");
assert(source.includes('/[^A-Za-z0-9]/.test(password)'), "Debe exigir símbolo");
assert(source.includes('password!==repeated'), "Debe impedir contraseñas que no coincidan");
assert(source.includes('error?.code==="weak_password"'), "Debe explicar si Supabase rechaza una contraseña débil o filtrada");
assert(source.includes('error?.code==="session_not_found"'), "Debe detectar una sesión invalidada");
assert(source.includes('sb.auth.signOut({scope:"local"})'), "Debe limpiar sólo la sesión local antes de pedir un nuevo acceso");
assert(source.includes('button.disabled=true'), "Debe bloquear dobles envíos mientras guarda");
assert(source.includes('document.getElementById("changePasswordForm").reset()'), "Debe limpiar la contraseña al cerrar");
assert(!source.includes('VGE!9-b6159bd5285f2e4376686d32'), "La contraseña temporal no puede quedar en el código del CRM");

for (const script of [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1])) {
  new vm.Script(script);
}

console.log("R9.7: cambio de contraseña alineado con el mínimo real de Supabase");
