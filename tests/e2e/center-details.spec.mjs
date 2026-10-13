import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const mock=await readFile(new URL('./supabase-browser-mock.js',import.meta.url),'utf8');
let productionRequests;
test.beforeEach(async({context,page})=>{
 productionRequests=[];
 page.on('request',request=>{if(new URL(request.url()).hostname.endsWith('.supabase.co'))productionRequests.push(request.url());});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='127.0.0.1')return route.continue();
  if(url.hostname==='cdn.jsdelivr.net'&&url.pathname.endsWith('/supabase.js'))return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:mock});
  return route.abort('blockedbyclient');
 });
});
test.afterEach(()=>expect(productionRequests).toEqual([]));

async function openProfile(page,query=''){
 await page.goto('/?r10-auth=1'+query);
 await expect(page.locator('#app')).toBeVisible();
 await page.locator('[data-view="overdue"]').click();
 await page.getByRole('button',{name:'Abrir ficha'}).click();
 await expect(page.locator('#centerDialog')).toBeVisible();
}
async function profileCall(page){return page.evaluate(()=>window.__r10RpcCalls.findLast(x=>x.name==='update_center_profile_v2'));}

test('un comercial corrige nombre, teléfono y email en su cartera y conserva el ID',async({page})=>{
 await openProfile(page);
 for(const field of ['fSchool','fSchoolPhone','fSchoolEmail'])await expect(page.locator('#'+field)).not.toHaveAttribute('readonly');
 await expect(page.locator('#fCity')).toHaveAttribute('readonly');
 await expect(page.locator('#fProvince')).toBeDisabled();
 await page.locator('#fSchool').fill(' Colegio Corregido ');
 await page.locator('#fSchoolPhone').fill('+34 987 123 456');
 await page.locator('#fSchoolEmail').fill(' CENTRO@EXAMPLE.INVALID ');
 await page.locator('#saveProfile').click();
 await expect(page.locator('#centerDialog .modal-head h2')).toHaveText('Colegio Corregido');
 await expect(page.locator('#fSchoolEmail')).toHaveValue('centro@example.invalid');
 const call=await profileCall(page);
 expect(call.args.p_center_id).toBe('R10-MOCK-AGENDA');
 expect(call.args.p_expected_version).toBe(7);
 expect(call.args.p_patch).toMatchObject({school:'Colegio Corregido',school_phone:'+34 987 123 456',school_email:'centro@example.invalid'});
 expect(call.args.p_patch).not.toHaveProperty('city');
 expect(call.args.p_patch).not.toHaveProperty('province');
 await expect(page.locator('#fMobile')).toHaveValue('');
 await expect(page.locator('#fDirectEmail')).toHaveValue('');
 await page.locator('#centerDialog .close').click();
 await page.getByRole('button',{name:'Abrir ficha'}).click();
 await expect(page.locator('#fSchool')).toHaveValue('Colegio Corregido');
 await expect(page.locator('#fSchoolPhone')).toHaveValue('+34 987 123 456');
});

test('el propietario conserva edición de ubicación y puede corregir los datos generales',async({page})=>{
 await openProfile(page,'&r10-role=owner');
 await expect(page.locator('#fCity')).not.toHaveAttribute('readonly');
 await expect(page.locator('#fProvince')).toBeEnabled();
 await page.locator('#fSchool').fill('Centro corregido por propietario');
 await page.locator('#saveProfile').click();
 await expect(page.locator('#centerDialog .modal-head h2')).toHaveText('Centro corregido por propietario');
 expect((await profileCall(page)).args.p_patch).toMatchObject({school:'Centro corregido por propietario',city:'León',province:'León'});
});

test('los datos históricos sin formato no bloquean un guardado si no se modifican',async({page})=>{
 await openProfile(page,'&r10-legacy-details=1');
 await page.locator('#fContactName').fill('Nueva persona de contacto');
 await page.locator('#saveProfile').click();
 await expect(page.locator('#fContactName')).toHaveValue('Nueva persona de contacto');
 const patch=(await profileCall(page)).args.p_patch;
 for(const key of ['school','school_phone','school_email'])expect(patch).not.toHaveProperty(key);
 await expect(page.locator('#fSchoolEmail')).toHaveValue('email historico sin formato');
});

test('se pueden vaciar teléfono y email generales sin cambiar nombre ni contacto directo',async({page})=>{
 await openProfile(page);
 await page.locator('#fSchoolPhone').fill('');
 await page.locator('#fSchoolEmail').fill('');
 await page.locator('#saveProfile').click();
 await expect(page.locator('#fSchoolPhone')).toHaveValue('');
 const patch=(await profileCall(page)).args.p_patch;
 expect(patch).toMatchObject({school_phone:null,school_email:null});
 expect(patch).not.toHaveProperty('school');
 expect(patch.contact_email).toBe('');
});

for(const [field,value,message] of [
 ['fSchool','  ','nombre del centro'],
 ['fSchoolPhone','123','teléfono general válido'],
 ['fSchoolEmail','incorrecto','email general válido'],
])test('se rechaza el dato inválido en '+field+' antes de enviar',async({page})=>{
 await openProfile(page);
 await page.locator('#'+field).fill(value);
 await page.locator('#saveProfile').click();
 await expect(page.locator('#profileSaveStatus')).toContainText(message);
 expect(await profileCall(page)).toBeUndefined();
});

for(const error of ['CONCURRENT_UPDATE','CENTER_DETAILS_DUPLICATE'])test('un rechazo '+error+' conserva el nombre guardado y el borrador',async({page})=>{
 await openProfile(page);
 await page.evaluate(error=>window.__r10ProfileError=error,error);
 await page.locator('#fSchool').fill('Borrador rechazado');
 await page.locator('#saveProfile').click();
 await expect(page.locator('#profileSaveStatus')).toContainText(error==='CONCURRENT_UPDATE'?'La ficha ha cambiado':'Ya existe otro centro');
 await expect(page.locator('#fSchool')).toHaveValue('Borrador rechazado');
 expect(await page.evaluate(()=>centers.find(c=>c.id==='R10-MOCK-AGENDA').school)).toBe('Centro agenda de prueba');
});
