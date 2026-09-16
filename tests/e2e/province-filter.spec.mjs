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
 await page.goto('/?r10-auth=1');
 await expect(page.locator('#app')).toBeVisible();
 await expect(page.locator('#content .kpis')).toBeVisible();
 await expect(page.locator('#pageTitle')).toHaveText('Panel de trabajo');
});
test.afterEach(()=>expect(productionRequests).toEqual([]));

async function seed(page,{owner=true,bulk=false}={}){
 await page.evaluate(({owner,bulk})=>{
  const base=centers[0];
  const row=(id,school,city,province,community,assignedTo='OP-SELLER',status='Pendiente')=>({...base,id,school,city,province,community,assignedTo,status,opportunityTotal:0,opportunityPending:0,opportunityInterested:0,opportunityQuoted:0,nextContact:'',nextContactTime:'',nextTaskAt:null,history:[],workspace:null});
  centers=[row('L-001','Alfa León','León','León','Castilla y León'),row('L-002','Beta Ponferrada','Ponferrada','León','Castilla y León','OP-OTHER','Interesado'),row('P-001','Gamma Palencia','Palencia','Palencia','Castilla y León','OP-SELLER','Interesado'),row('G-001','Delta Guadalajara','Guadalajara','Guadalajara','Castilla-La Mancha'),row('A-001','Epsilon Albacete','Albacete','Albacete','Castilla-La Mancha','OP-OTHER'),row('M-001','Provincia pendiente','León','','Castilla y León'),row('U-001','Centro libre','Astorga','León','Castilla y León','Sin asignar')];
  if(bulk)for(let i=0;i<105;i++)centers.push(row(`B-${i}`,`Centro León ${String(i).padStart(3,'0')}`,'León','León','Castilla y León'));
  isAdmin=owner;isOwner=owner;accessRole=owner?'owner':'seller';
  permissions={...permissions,can_view_global:owner,can_export_global:owner,can_manage_roles:owner,can_view_team:owner,can_assign_centers:owner,can_archive_centers:owner,can_export_backup:owner};
  OPERATORS=[{code:'OP-SELLER',display_name:'Comercial de prueba'},{code:'OP-OTHER',display_name:'Otro comercial'}];USERS=OPERATORS.map(o=>o.code);
  currentView=owner?'all':'mine';activeStatus='';filters={search:'',status:'',community:'',seller:'',quick:'all'};agendaItems=[];configureNavForRole();render();
 },{owner,bulk});
}

test('provincia independiente se combina con búsqueda, responsable y estado sin escribir',async({page})=>{
 await seed(page);
 const before=await page.evaluate(()=>JSON.stringify(centers));
 const calls=await page.evaluate(()=>window.__r10RpcCalls.length);
 await page.locator('#provinceFilter').selectOption('León');
 await expect(page.locator('tbody tr')).toHaveCount(3);
 await expect(page.locator('#communityFilter')).toHaveValue('');
 await page.locator('#sellerFilter').selectOption('OP-OTHER');
 await page.locator('#statusFilter').selectOption({label:'Interesado'});
 await page.locator('#searchFilter').fill('Ponferrada');
 await expect(page.locator('tbody tr')).toHaveCount(1);
 await expect(page.locator('tbody')).toContainText('Beta Ponferrada');
 await expect(page.locator('#provinceFilter')).toHaveValue('León');
 expect(await page.evaluate(()=>JSON.stringify(centers))).toEqual(before);
 expect(await page.evaluate(()=>window.__r10RpcCalls.length)).toBe(calls);
});

test('comunidad limita provincias y descarta únicamente la selección incompatible',async({page})=>{
 await seed(page);
 await page.locator('#provinceFilter').selectOption('León');
 await page.locator('#communityFilter').selectOption('Castilla y León');
 await expect(page.locator('#provinceFilter')).toHaveValue('León');
 await expect(page.locator('#provinceFilter option')).toHaveText(['Todas las provincias','León','Palencia','Sin provincia informada']);
 await page.locator('#communityFilter').selectOption('Castilla-La Mancha');
 await expect(page.locator('#provinceFilter')).toHaveValue('');
 await expect(page.locator('#provinceFilter option')).toHaveText(['Todas las provincias','Albacete','Guadalajara']);
 await page.locator('#provinceFilter').selectOption('Guadalajara');
 await expect(page.locator('tbody tr')).toHaveCount(1);
 await page.locator('#communityFilter').selectOption('');
 await expect(page.locator('#provinceFilter')).toHaveValue('Guadalajara');
});

test('sin provincia no se infiere de localidad y la navegación limpia el filtro',async({page})=>{
 await seed(page);
 await page.locator('#provinceFilter').selectOption({label:'Sin provincia informada'});
 await expect(page.locator('tbody tr')).toHaveCount(1);
 await expect(page.locator('tbody')).toContainText('Provincia pendiente');
 await page.locator('[data-view="mine"]').click();
 await expect(page.locator('#provinceFilter')).toHaveValue('');
 await expect(page.locator('tbody tr')).toHaveCount(4);
 await page.locator('#provinceFilter').selectOption('Palencia');
 await page.locator('[data-status-nav="Interesado"]').click();
 await expect(page.locator('#provinceFilter')).toHaveValue('');
 await expect(page.locator('tbody')).toContainText('Gamma Palencia');
});

test('paginación y reapertura de ficha conservan provincia y reinician página al cambiarla',async({page})=>{
 await seed(page,{bulk:true});
 await page.locator('#provinceFilter').selectOption('León');
 await page.locator('[data-page="1"]').click();
 await expect(page.locator('#pageJumpInput')).toHaveValue('2');
 await expect(page.locator('#provinceFilter')).toHaveValue('León');
 await page.locator('#provinceFilter').selectOption('Guadalajara');
 await expect(page.locator('#pageJumpInput')).toHaveValue('1');
 await page.getByRole('button',{name:'Abrir ficha'}).click();
 await expect(page.locator('#fProvince')).toHaveValue('Guadalajara');
 await page.locator('#centerDialog .close').click();
 await expect(page.locator('#provinceFilter')).toHaveValue('Guadalajara');
 await expect(page.locator('tbody tr')).toHaveCount(1);
});

test('rol comercial no gana acceso a otras provincias ni acciones de propietario',async({page})=>{
 await seed(page,{owner:false});
 await expect(page.locator('#provinceFilter option[value="Albacete"]')).toHaveCount(0);
 await expect(page.locator('#sellerFilter')).toHaveCount(0);
 await expect(page.locator('#backupBtn')).toBeHidden();
 await expect(page.locator('[data-view="all"]')).toBeHidden();
 await page.locator('#provinceFilter').selectOption('León');
 await expect(page.locator('tbody tr')).toHaveCount(1);
 await expect(page.locator('tbody')).toContainText('Alfa León');
});

test('Excel mantiene la exportación completa de la vista, independiente del filtro visual',async({page})=>{
 await seed(page);
 await page.locator('#provinceFilter').selectOption('Guadalajara');
 await expect(page.locator('tbody tr')).toHaveCount(1);
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#excelBtn').click()]);
 expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
 const bytes=await readFile(await download.path());
 // The existing XLSX writer uses ZIP STORE; sheet XML is directly observable.
 expect(bytes.subarray(0,2).toString()).toBe('PK');
 expect(bytes.toString('utf8')).toContain('Alfa León');
 expect(bytes.toString('utf8')).toContain('Delta Guadalajara');
 const exportCall=await page.evaluate(()=>window.__r10RpcCalls.findLast(c=>c.name==='log_export'));
 expect(exportCall.args.p_row_count).toBe(7);
});

test('selector de provincia permanece accesible en móvil y sin resultados',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await seed(page);
 await page.locator('#provinceFilter').selectOption('Guadalajara');
 await page.locator('#searchFilter').fill('Centro inexistente');
 await expect(page.locator('.table-card .empty')).toHaveText('No hay centros con estos filtros.');
 await expect(page.locator('#provinceFilter')).toHaveValue('Guadalajara');
 await expect(page.getByRole('combobox',{name:'Filtrar por provincia',exact:true})).toBeVisible();
 const box=await page.locator('#provinceFilter').boundingBox();
 expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
});
