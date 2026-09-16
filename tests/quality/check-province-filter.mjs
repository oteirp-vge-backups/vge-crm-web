import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context=vm.createContext({window:{VGE_CONFIG:{}},console,TextEncoder,Uint8Array,Uint32Array,Map,Set,Date});
for(const file of ['core.js','centers.js','management.js']){
 vm.runInContext(await readFile(`assets/js/${file}`,'utf8'),context,{filename:file});
}
const run=source=>vm.runInContext(source,context);
const data=source=>JSON.parse(JSON.stringify(run(source)));
const seed=[
 {id:'A',school:'Alfa',city:'León',province:'León',community:'Castilla y León',assignedTo:'OP-A',status:'Pendiente'},
 {id:'B',school:'Beta',city:'Ponferrada',province:'León',community:'Castilla y León',assignedTo:'OP-B',status:'Interesado'},
 {id:'C',school:'Gamma',city:'Palencia',province:'Palencia',community:'Castilla y León',assignedTo:'OP-A',status:'Interesado'},
 {id:'D',school:'Delta',city:'Guadalajara',province:'Guadalajara',community:'Castilla-La Mancha',assignedTo:'OP-A',status:'Pendiente'},
 {id:'E',school:'Epsilon',city:'Albacete',province:'Albacete',community:'Castilla-La Mancha',assignedTo:'OP-B',status:'Pendiente'},
 {id:'F',school:'Sin provincia 1',city:'León',province:null,community:'Castilla y León',assignedTo:'OP-A',status:'Pendiente'},
 {id:'G',school:'Sin provincia 2',city:'Guadalajara',province:'',community:'Castilla-La Mancha',assignedTo:'Sin asignar',status:'Pendiente'},
 {id:'H',school:'Sin asignar',city:'Astorga',province:'León',community:'Castilla y León',assignedTo:'Sin asignar',status:'Pendiente'},
];
function reset(){
 run(`centers=${JSON.stringify(seed)};currentUser='OP-A';isAdmin=true;currentView='all';activeStatus='';currentPage=3;filters={search:'',status:'',community:'',seller:'',quick:'all'};agendaItems=[];`);
}
let count=0;
function check(name, fn){reset();fn();count++;console.log(`OK: ${name}`);}
const ids=()=>data('filtered().map(c=>c.id)').sort();
check('estado inicial sin la nueva propiedad mantiene todos los centros',()=>assert.equal(ids().length,8));
check('filtro independiente por provincia y no por localidad',()=>{run("filters.province='León'");assert.deepEqual(ids(),['A','B','H']);});
check('provincia y comunidad se intersectan',()=>{run("filters.province='León';filters.community='Castilla-La Mancha'");assert.deepEqual(ids(),[]);});
check('búsqueda, estado, responsable y provincia se combinan',()=>{run("filters.province='León';filters.status='Interesado';filters.seller='OP-B';filters.search='Ponferrada'");assert.deepEqual(ids(),['B']);});
check('chips de estado conservan la provincia',()=>{run("filters.province='León';filters.quick='info'");assert.deepEqual(ids(),['B']);});
check('sin provincia incluye nulos y vacíos, sin inferir desde localidad',()=>{run('filters.province=NO_PROVINCE_FILTER');assert.deepEqual(ids(),['F','G']);});
check('sin provincia se limita a la comunidad elegida',()=>{run("filters.province=NO_PROVINCE_FILTER;filters.community='Castilla y León'");assert.deepEqual(ids(),['F']);});
check('todas las provincias restaura el ámbito sin perder otros filtros',()=>{run("filters.province='';filters.community='Castilla y León'");assert.deepEqual(ids(),['A','B','C','F','H']);});
check('opciones únicas y ordenadas dentro de la vista',()=>assert.deepEqual(data('provinceFilterChoices()'),['Albacete','Guadalajara','León','Palencia','__missing_province__']));
check('opciones dependientes de la comunidad',()=>{run("filters.community='Castilla-La Mancha'");assert.deepEqual(data('provinceFilterChoices()'),['Albacete','Guadalajara','__missing_province__']);});
check('opciones sin provincia solo cuando existen incompletas',()=>{run("centers=centers.filter(c=>c.province);filters.community='Castilla y León'");assert.deepEqual(data('provinceFilterChoices()'),['León','Palencia']);});
check('opciones no se vacían al aplicar búsqueda o responsable',()=>{run("filters.community='Castilla-La Mancha';filters.search='inexistente';filters.seller='OP-A'");assert.deepEqual(data('provinceFilterChoices()'),['Albacete','Guadalajara','__missing_province__']);});
check('cartera personal no cruza responsables',()=>{run("currentView='mine';isAdmin=false;filters.province='León'");assert.deepEqual(ids(),['A']);});
check('cartera personal no revela provincias ajenas en selector',()=>{run("currentView='mine';isAdmin=false");assert.ok(!data('provinceFilterChoices()').includes('Albacete'));});
check('vista de estado conserva su estado implícito',()=>{run("currentView='status';activeStatus='Interesado';filters.province='Palencia'");assert.deepEqual(ids(),['C']);});
check('sin asignar no incluye carteras asignadas',()=>{run("currentView='unassigned';filters.province='León'");assert.deepEqual(ids(),['H']);});
check('agenda conserva tareas independientes del mismo centro',()=>{
 run(`currentView='followups';filters.province='León';agendaItems=[{task_key:'one',center_id:'A',assigned_to:'OP-A',status:'Pendiente',due_at:'2099-01-01T09:00:00Z'},{task_key:'two',center_id:'A',assigned_to:'OP-A',status:'Pendiente',due_at:'2099-02-01T09:00:00Z'},{task_key:'other',center_id:'D',assigned_to:'OP-A',status:'Pendiente',due_at:'2099-01-01T09:00:00Z'}]`);
 assert.deepEqual(data('filtered().map(c=>c._agendaItem.task_key)'),['one','two']);
});
check('vencidos solo incluye tareas vencidas propias y de la provincia',()=>{
 run(`currentView='overdue';filters.province='León';agendaItems=[{task_key:'due',center_id:'A',assigned_to:'OP-A',status:'Pendiente',due_at:'2000-01-01T09:00:00Z'},{task_key:'future',center_id:'A',assigned_to:'OP-A',status:'Pendiente',due_at:'2099-01-01T09:00:00Z'},{task_key:'other',center_id:'B',assigned_to:'OP-B',status:'Pendiente',due_at:'2000-01-01T09:00:00Z'}]`);
 assert.deepEqual(data('filtered().map(c=>c._agendaItem.task_key)'),['due']);
});
check('Excel y CSV mantienen el contrato previo sin filtros visuales',()=>{run("filters.province='León';filters.community='Castilla y León';filters.search='Alfa'");assert.equal(data('exportRowsForCurrentView()').length,8);});
check('exportación comercial no se amplía a todo el equipo',()=>{run("currentView='mine';isAdmin=false;filters.province='León'");assert.deepEqual(data('exportRowsForCurrentView().map(c=>c.id)').sort(),['A','C','D','F']);});
check('exportación de archivados continúa desactivada',()=>{run("currentView='archived';filters.province='León'");assert.deepEqual(data('exportRowsForCurrentView()'),[]);});
check('lectura y filtrado no mutan ninguna ficha',()=>{const before=data('centers');run("filters.province='León';filtered();provinceFilterChoices()");assert.deepEqual(data('centers'),before);});

// Use event listeners from the real bindFilters implementation without a browser.
function change(key,value){
 context.document={getElementById:id=>id===key?{value,addEventListener:(event,fn)=>{context.fireChange=fn;}}:null,querySelectorAll:()=>[]};
 run('window.renderCount=0;window.savedRenderList=renderList;renderList=()=>window.renderCount++;bindFilters()');
 context.fireChange();
 run('renderList=window.savedRenderList');
}
check('cambio de provincia reinicia la paginación una vez',()=>{change('provinceFilter','León');assert.equal(run('filters.province'),'León');assert.equal(run('currentPage'),1);assert.equal(run('window.renderCount'),1);});
check('cambio a comunidad incompatible limpia solo la provincia',()=>{run("filters.province='León';filters.status='Interesado';filters.seller='OP-A';filters.search='Beta'");change('communityFilter','Castilla-La Mancha');assert.equal(run('filters.province'),'');assert.equal(run('filters.status'),'Interesado');assert.equal(run('filters.seller'),'OP-A');assert.equal(run('filters.search'),'Beta');});
check('comunidad compatible conserva la provincia seleccionada',()=>{run("filters.province='León'");change('communityFilter','Castilla y León');assert.equal(run('filters.province'),'León');});
check('volver a todas las comunidades conserva la provincia',()=>{run("filters.province='León';filters.community='Castilla y León'");change('communityFilter','');assert.equal(run('filters.province'),'León');});
check('reinicio de filtros heredado elimina la provincia',()=>{run("filters.province='León';filters={search:'',status:'',community:'',seller:'',quick:'all'}");assert.equal(ids().length,8);});
console.log(`Filtro de provincias: ${count} comprobaciones correctas; sin conexión a producción.`);
